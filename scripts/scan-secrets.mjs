import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const explicitTargets = process.argv.slice(2);
const root = process.cwd();
const ignoredPathSegments = new Set([
  '.git',
  '.worktrees',
  'node_modules',
  'dist',
  'coverage',
  '.DS_Store',
]);
const ignoredFileNames = new Set(['package-lock.json']);
const secretPatterns = [
  {
    label: 'generic sk-* api key',
    pattern: /\bsk-[A-Za-z0-9][A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: 'bearer sk-* api key',
    pattern: /Bearer\s+sk-[A-Za-z0-9][A-Za-z0-9_-]{20,}/gi,
  },
];

const targets =
  explicitTargets.length > 0
    ? explicitTargets.map((target) => path.resolve(root, target))
    : await collectRepositoryFiles(root);
const findings = [];

for (const target of targets) {
  await scanTarget(target, findings);
}

if (findings.length > 0) {
  console.error('Secret scan failed. Potential secrets found:');

  for (const finding of findings) {
    console.error(`- ${path.relative(root, finding.file)}:${finding.line} ${finding.label}`);
  }

  process.exitCode = 1;
} else {
  console.log(`Secret scan passed. files=${targets.length}`);
}

async function scanTarget(target, findings) {
  const targetStat = await stat(target);

  if (targetStat.isDirectory()) {
    const files = await collectRepositoryFiles(target);

    for (const file of files) {
      await scanFile(file, findings);
    }

    return;
  }

  await scanFile(target, findings);
}

async function collectRepositoryFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredPathSegments.has(entry.name) || ignoredFileNames.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectRepositoryFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function scanFile(file, findings) {
  if (isBinaryLike(file)) {
    return;
  }

  let content;

  try {
    content = await readFile(file, 'utf8');
  } catch {
    return;
  }

  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (isAllowedPlaceholderLine(line)) {
      return;
    }

    for (const secretPattern of secretPatterns) {
      secretPattern.pattern.lastIndex = 0;

      if (secretPattern.pattern.test(line)) {
        findings.push({
          file,
          line: index + 1,
          label: secretPattern.label,
        });
      }
    }
  });
}

function isAllowedPlaceholderLine(line) {
  return (
    line.includes('export DEEPSEEK_API_KEY=...') ||
    line.includes(': "${DEEPSEEK_API_KEY:?') ||
    line.includes('OPENAI_API_KEY=...') ||
    line.includes('OPENAI_COMPATIBLE_API_KEY=...') ||
    line.includes('OPENAI_COMPATIBLE_API_KEY=$DEEPSEEK_API_KEY') ||
    line.includes('OPENAI_COMPATIBLE_API_KEY=${DEEPSEEK_API_KEY}')
  );
}

function isBinaryLike(file) {
  return /\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|woff2?)$/i.test(file);
}
