import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import {
  analysisRunEvidencePackageSchema,
  analysisRunResponseSchema,
  readinessResponseSchema,
  submitAnalysisRunResponseSchema,
} from '@gmi/contracts';

const requestedApiPort =
  process.env.GMI_API_PORT ?? parseUrlPort(process.env.COMPOSE_APP_API_URL);
const requestedWebPort =
  process.env.GMI_WEB_PORT ?? parseUrlPort(process.env.COMPOSE_APP_WEB_URL);
const composeApiPort = requestedApiPort ?? String(await findOpenPort());
const composeWebPort = requestedWebPort ?? String(await findOpenPort());
const apiBaseUrl = process.env.COMPOSE_APP_API_URL ?? `http://127.0.0.1:${composeApiPort}`;
const webBaseUrl = process.env.COMPOSE_APP_WEB_URL ?? `http://127.0.0.1:${composeWebPort}`;
const timeoutMs = Number(process.env.COMPOSE_APP_SMOKE_TIMEOUT_MS ?? 180_000);
const commandTimeoutMs = Number(process.env.COMPOSE_APP_COMMAND_TIMEOUT_MS ?? 600_000);
const governanceHeaders = {
  'x-actor-id': 'compose-app-smoke',
  'x-gmi-roles': 'analysis_runner,analysis_reader,auditor',
};

try {
  console.log(
    `Compose app smoke using API ${apiBaseUrl} and web ${webBaseUrl}.`,
  );
  await runCommandWithRetry('docker', ['pull', 'node:24-alpine']);
  await runCommandWithRetry('docker', ['pull', 'node:24-bookworm-slim']);
  await runCommandWithRetry('docker', ['pull', 'nginx:1.27-alpine']);
  await runCommandWithRetry('docker', [
    'compose',
    '--progress',
    'plain',
    '--profile',
    'app',
    'up',
    '--build',
    '-d',
    'gmi-api',
    'gmi-worker',
    'gmi-web',
  ]);

  await waitFor(
    async () => {
      const state = await inspectContainer('gmi-db-migrate');
      return state?.Status === 'exited' && state?.ExitCode === 0;
    },
    'gmi-db-migrate did not complete successfully',
  );

  await waitFor(async () => {
    const response = await fetch(`${apiBaseUrl}/health`);
    return response.ok;
  }, 'containerized API did not become healthy');

  const readiness = readinessResponseSchema.parse(await getJson(`${apiBaseUrl}/ready`));
  assertEqual(readiness.status, 'ready', 'containerized API readiness status');
  assertEqual(
    readinessComponent(readiness, 'database').status,
    'up',
    'containerized database readiness',
  );
  assertEqual(
    readinessComponent(readiness, 'workflow').status,
    'up',
    'containerized workflow readiness',
  );

  const webResponse = await fetch(webBaseUrl);
  if (!webResponse.ok) {
    throw new Error(`Containerized web returned ${webResponse.status}.`);
  }
  const webHtml = await webResponse.text();
  assertIncludes(webHtml, '<div id="root">', 'containerized web root element');
  assertIncludes(webHtml, '/assets/', 'containerized web asset references');

  const versionId = `tv-compose-app-smoke-${Date.now()}`;
  const submitResponse = submitAnalysisRunResponseSchema.parse(
    await postJson(
      `${apiBaseUrl}/template-versions/${versionId}/analysis-runs`,
      {
        triggerType: 'manual_reanalysis',
        reason: 'Compose app profile smoke test',
        effort: 'normal',
        requestedOutputs: [],
      },
      {
        ...governanceHeaders,
        'idempotency-key': `compose-app-smoke-${versionId}`,
      },
    ),
  );
  assertEqual(submitResponse.status, 'Queued', 'containerized submit status');
  assertEqual(submitResponse.workflow.driver, 'temporal', 'containerized workflow driver');
  assertEqual(submitResponse.workflow.started, true, 'containerized workflow started');

  const completedRun = await pollCompletedRun(submitResponse.runId);
  assertEqual(completedRun.status, 'Succeeded', 'containerized analysis run status');
  if (!completedRun.output) {
    throw new Error(`Containerized run ${submitResponse.runId} completed without output.`);
  }

  const evidencePackage = analysisRunEvidencePackageSchema.parse(
    await getJson(
      `${apiBaseUrl}/analysis-runs/${encodeURIComponent(submitResponse.runId)}/evidence-package`,
      governanceHeaders,
    ),
  );
  assertEqual(
    evidencePackage.sourceRun.runId,
    submitResponse.runId,
    'containerized evidence package source run id',
  );
  if (!evidencePackage.auditEvents.some((event) => event.action === 'analysis_result_recorded')) {
    throw new Error('Containerized evidence package is missing analysis_result_recorded audit event.');
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        runId: submitResponse.runId,
        workflowId: submitResponse.workflow.workflowId,
        api: apiBaseUrl,
        web: webBaseUrl,
      },
      null,
      2,
    ),
  );
} finally {
  await cleanupComposeAppProfile();
}

async function pollCompletedRun(runId) {
  let latest;

  await waitFor(async () => {
    latest = analysisRunResponseSchema.parse(
      await getJson(`${apiBaseUrl}/analysis-runs/${encodeURIComponent(runId)}`, governanceHeaders),
    );
    return latest.status === 'Succeeded' && Boolean(latest.output);
  }, `containerized run ${runId} did not complete`);

  return latest;
}

async function inspectContainer(containerName) {
  const output = await runCommand('docker', [
    'inspect',
    '--format',
    '{{json .State}}',
    containerName,
  ]);
  return JSON.parse(output.trim());
}

async function cleanupComposeAppProfile() {
  if (process.env.COMPOSE_APP_KEEP_RUNNING === 'true') {
    return;
  }

  await runCommand('docker', [
    'compose',
    '--profile',
    'app',
    'rm',
    '--stop',
    '--force',
    'gmi-api',
    'gmi-worker',
    'gmi-web',
    'gmi-db-migrate',
  ]).catch((error) => {
    console.warn(`Failed to clean up compose app profile: ${String(error)}`);
  });
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function waitFor(predicate, message) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await predicate()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }

    await sleep(500);
  }

  throw new Error(`${message} within ${timeoutMs}ms. Last error: ${String(lastError)}`);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        COMPOSE_PARALLEL_LIMIT: process.env.COMPOSE_PARALLEL_LIMIT ?? '1',
        GMI_API_PORT: composeApiPort,
        GMI_WEB_PORT: composeWebPort,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(
        new Error(
          `${command} ${args.join(' ')} exceeded ${commandTimeoutMs}ms.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      );
    }, commandTimeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} exited ${code}.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      );
    });
  });
}

async function runCommandWithRetry(command, args) {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runCommand(command, args);
    } catch (error) {
      lastError = error;

      if (!isRetryableDockerBuildError(error) || attempt === maxAttempts) {
        throw error;
      }

      await sleep(2_000 * attempt);
    }
  }

  throw lastError;
}

function isRetryableDockerBuildError(error) {
  const message = String(error?.message ?? error);
  return (
    message.includes('context deadline exceeded') ||
    message.includes('only one connection allowed') ||
    message.includes('DeadlineExceeded') ||
    message.includes('transport: Error while dialing')
  );
}

function parseUrlPort(value) {
  if (!value) {
    return undefined;
  }

  const url = new URL(value);
  return url.port || (url.protocol === 'https:' ? '443' : '80');
}

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
          return;
        }

        reject(new Error('Could not allocate a local port for compose smoke.'));
      });
    });
  });
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function readinessComponent(readiness, name) {
  const component = readiness.components.find((item) => item.name === name);

  if (!component) {
    throw new Error(`Readiness response missing component: ${name}`);
  }

  return component;
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(value.slice(0, 500))}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
