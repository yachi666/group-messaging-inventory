import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'gmi-secret-smoke-'));
const fixturePath = path.join(tmpDir, 'leaked-secret.txt');

try {
  await writeFile(
    fixturePath,
    `DEEPSEEK_API_KEY=${'sk'}-${'1234567890abcdef1234567890abcdef'}\n`,
    'utf8',
  );

  const fixtureScan = await runCommand('node', [
    'scripts/scan-secrets.mjs',
    fixturePath,
  ]);

  if (fixtureScan.code === 0) {
    throw new Error('secret scanner should fail when a sk-* key is present');
  }

  if (
    !fixtureScan.output.includes('leaked-secret.txt') &&
    !fixtureScan.output.includes('scan-secrets.mjs')
  ) {
    throw new Error(`secret scanner output did not mention fixture path:\n${fixtureScan.output}`);
  }

  const repoScan = await runCommand('node', ['scripts/scan-secrets.mjs']);

  if (repoScan.code !== 0) {
    throw new Error(`secret scanner should pass for current repository:\n${repoScan.output}`);
  }

  console.log('No-secrets local smoke passed.');
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
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
      resolve({
        code,
        output,
      });
    });
  });
}
