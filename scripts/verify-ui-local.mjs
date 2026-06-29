import { spawn } from 'node:child_process';
import process from 'node:process';

const port = Number(process.env.UI_SMOKE_PORT ?? 5180);
const appUrl = `http://127.0.0.1:${port}`;
const startupTimeoutMs = 20_000;

const devServer = spawn(
  'npm',
  [
    '--workspace',
    '@gmi/web',
    'run',
    'dev',
    '--',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);

let serverOutput = '';
devServer.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString();
});
devServer.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString();
});

try {
  await waitForServer();
  await runUiVerifier();
} finally {
  devServer.kill('SIGINT');
}

async function waitForServer() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (devServer.exitCode !== null) {
      throw new Error(`Vite dev server exited early with code ${devServer.exitCode}.\n${serverOutput}`);
    }

    try {
      const response = await fetch(appUrl);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Vite returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw new Error(
    `Vite dev server did not become ready within ${startupTimeoutMs}ms. Last error: ${String(
      lastError,
    )}\n${serverOutput}`,
  );
}

async function runUiVerifier() {
  await new Promise((resolve, reject) => {
    const verifier = spawn('node', ['scripts/verify-ui.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_URL: appUrl,
      },
      stdio: 'inherit',
    });

    verifier.on('error', reject);
    verifier.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`UI verifier exited with code ${code}`));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
