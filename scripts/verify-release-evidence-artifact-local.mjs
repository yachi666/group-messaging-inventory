import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { verifyPipelineReleaseEvidence } from '@gmi/evals';

const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'gmi-release-evidence-'));
const evidencePath = path.join(tmpDir, 'release-evidence.json');

try {
  await runCommand('npm', ['run', 'build:packages']);
  await runCommand('npm', ['run', 'test:gate', '-w', '@gmi/evals'], {
    EVAL_CREATE_RELEASE_EVIDENCE: 'true',
    EVAL_RELEASE_ID: 'REL-ARTIFACT-SMOKE',
    EVAL_RELEASE_EVIDENCE_PATH: evidencePath,
  });

  const evidenceStat = await stat(evidencePath);

  if (!evidenceStat.isFile()) {
    throw new Error('release evidence path was not a file');
  }

  const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));

  assertEqual(evidence.releaseId, 'REL-ARTIFACT-SMOKE', 'release id');
  assertEqual(evidence.status, 'ReadyForPromotion', 'release status');
  assertEqual(evidence.promotionAllowed, true, 'promotion flag');
  assertEqual(evidence.evaluation.verdict, 'pass', 'evaluation verdict');
  assertEqual(
    typeof evidence.evidenceHash,
    'string',
    'release evidence hash type',
  );
  assertEqual(
    verifyPipelineReleaseEvidence(evidence),
    true,
    'release evidence hash verification',
  );

  console.log(`Release evidence artifact smoke passed. path=${evidencePath}`);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with ${code}\n${output}`));
    });
  });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
