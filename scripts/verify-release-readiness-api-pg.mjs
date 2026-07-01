import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import {
  createPostgresDatabase,
  createPostgresPool,
  migratePostgresDatabase,
} from '@gmi/db';
import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';
import { recordPipelineReleaseEvidenceResponseSchema } from '@gmi/contracts';

const fixture = JSON.parse(
  readFileSync('scripts/fixtures/release-readiness-api.json', 'utf8'),
);
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://gmi:gmi@127.0.0.1:55432/gmi';
const port = Number(process.env.RELEASE_READINESS_API_PORT ?? (await findOpenPort()));
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.RELEASE_READINESS_API_TIMEOUT_MS ?? 60_000);
const governanceHeaders = {
  'x-actor-id': fixture.actorId,
  'x-gmi-roles': fixture.roles,
};
const processes = [];
let apiOutput = '';

const pool = createPostgresPool({ connectionString: databaseUrl });
const db = createPostgresDatabase(pool);

try {
  await migratePostgresDatabase(db);

  const report = await runGoldenTemplateEvaluation();
  const releaseId = `REL-READINESS-API-${Date.now()}`;
  const evidence = createPipelineReleaseEvidence(report, {
    releaseId,
    pipelineVersion: fixture.pipelineVersion,
    promptVersion: fixture.promptVersion,
    modelProvider: fixture.modelProvider,
    modelName: fixture.modelName,
    rulesetVersion: fixture.rulesetVersion,
    requestedBy: fixture.actorId,
  });

  const api = spawnManaged('npm', ['run', 'start', '-w', '@gmi/api'], {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    API_AUTH_MODE: 'header',
    ANALYSIS_WORKFLOW_DRIVER: 'none',
    AI_PROVIDER: 'noop',
    AI_PROVIDER_READINESS_MODE: 'config',
  });
  api.stdout.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });
  api.stderr.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });

  await waitForApiHealth();

  const recordResponse = recordPipelineReleaseEvidenceResponseSchema.parse(
    await postJson(`${baseUrl}/analysis-evaluations/release-evidence`, {
      evidence,
      reportRef: `readiness-api-smoke:${releaseId}`,
    }),
  );

  assertEqual(recordResponse.recordedRelease.releaseId, releaseId, 'recorded release id');
  assertEqual(
    recordResponse.recordedRelease.evidenceHash,
    evidence.evidenceHash,
    'recorded evidence hash',
  );

  const readinessCheck = await runCommand('npm', ['run', 'check:release-readiness'], {
    ...process.env,
    RELEASE_READINESS_URL: `${baseUrl}/analysis-evaluations/latest`,
    RELEASE_READINESS_ACTOR_ID: fixture.actorId,
    RELEASE_READINESS_ROLES: fixture.roles,
    RELEASE_READINESS_PIPELINE_VERSION: fixture.pipelineVersion,
    RELEASE_READINESS_PROMPT_VERSION: fixture.promptVersion,
    RELEASE_READINESS_MODEL_PROVIDER: fixture.modelProvider,
    RELEASE_READINESS_MODEL_NAME: fixture.modelName,
    RELEASE_READINESS_RULESET_VERSION: fixture.rulesetVersion,
    RELEASE_READINESS_DATASET_VERSION: report.datasetVersion,
    RELEASE_READINESS_MIN_CASE_COUNT: String(fixture.minCaseCount),
  });

  assertEqual(readinessCheck.code, 0, 'positive release readiness exit code');
  const readiness = parseTrailingJson(readinessCheck.stdout);

  assertEqual(readiness.ready, true, 'live release readiness');
  assertEqual(readiness.summary.releaseId, releaseId, 'readiness release id');
  assertEqual(readiness.summary.evidenceHash, evidence.evidenceHash, 'readiness evidence hash');
  assertEqual(readiness.summary.persisted, true, 'readiness persisted flag');

  const mismatchCheck = await runCommand('npm', ['run', 'check:release-readiness'], {
    ...process.env,
    RELEASE_READINESS_URL: `${baseUrl}/analysis-evaluations/latest`,
    RELEASE_READINESS_ACTOR_ID: fixture.actorId,
    RELEASE_READINESS_ROLES: fixture.roles,
    RELEASE_READINESS_PIPELINE_VERSION: `${fixture.pipelineVersion}-mismatch`,
  });

  if (mismatchCheck.code === 0) {
    throw new Error('Version-mismatched release readiness check should fail.');
  }

  const mismatchReadiness = parseTrailingJson(mismatchCheck.stdout);
  assertEqual(mismatchReadiness.ready, false, 'mismatched release readiness');
  if (!mismatchReadiness.failures.some((failure) => failure.includes('pipelineVersion must be'))) {
    throw new Error(
      `Expected pipeline version mismatch failure, got ${JSON.stringify(mismatchReadiness.failures)}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        releaseId,
        evidenceHash: evidence.evidenceHash,
        readinessUrl: `${baseUrl}/analysis-evaluations/latest`,
        negativeCase: 'pipelineVersion mismatch',
      },
      null,
      2,
    ),
  );
} finally {
  for (const child of processes.reverse()) {
    child.kill('SIGINT');
  }
  await db.destroy();
}

function spawnManaged(command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  processes.push(child);
  return child;
}

async function waitForApiHealth() {
  await waitFor(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }, 'API did not become healthy');
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...governanceHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function parseTrailingJson(output) {
  const start = output.lastIndexOf('\n{');
  const jsonText = start >= 0 ? output.slice(start + 1) : output;

  return JSON.parse(jsonText);
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

    await sleep(250);
  }

  throw new Error(
    `${message} within ${timeoutMs}ms.\nLast error: ${String(lastError)}\nAPI output:\n${apiOutput}`,
  );
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

        reject(new Error('Could not allocate a local port for release readiness API smoke.'));
      });
    });
  });
}

function sleep(durationMs) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
