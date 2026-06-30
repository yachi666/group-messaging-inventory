import { spawn } from 'node:child_process';
import process from 'node:process';
import { sql } from 'kysely';
import {
  createPostgresDatabase,
  createPostgresPool,
  migratePostgresDatabase,
} from '@gmi/db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://gmi:gmi@127.0.0.1:55432/gmi';
const temporalAddress = process.env.TEMPORAL_ADDRESS ?? '127.0.0.1:7233';
const temporalNamespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
const taskQueue =
  process.env.TEMPORAL_TASK_QUEUE ?? `template-analysis-provider-failure-${Date.now()}`;
const port = Number(process.env.API_SMOKE_PORT ?? 4131);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.HARNESS_SMOKE_TIMEOUT_MS ?? 60_000);
const unavailableProviderBaseUrl =
  process.env.HARNESS_FAILURE_PROVIDER_BASE_URL ?? 'http://127.0.0.1:9/v1';
const governanceHeaders = {
  'x-actor-id': 'harness-provider-failure-smoke',
  'x-gmi-roles': 'analysis_runner,analysis_reader,auditor',
};

const processes = [];
let apiOutput = '';
let workerOutput = '';

const pool = createPostgresPool({ connectionString: databaseUrl });
const db = createPostgresDatabase(pool);

try {
  await migratePostgresDatabase(db);

  const commonEnv = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    TEMPORAL_ADDRESS: temporalAddress,
    TEMPORAL_NAMESPACE: temporalNamespace,
    TEMPORAL_TASK_QUEUE: taskQueue,
    ANALYSIS_WORKFLOW_DRIVER: 'temporal',
    AI_PROVIDER: 'openai-compatible',
    OPENAI_COMPATIBLE_BASE_URL: unavailableProviderBaseUrl,
    OPENAI_COMPATIBLE_API_KEY: 'provider-failure-smoke-key',
    OPENAI_COMPATIBLE_MODEL: 'provider-failure-smoke-model',
    OPENAI_COMPATIBLE_PROVIDER_NAME: 'provider-failure-smoke',
    OPENAI_COMPATIBLE_TIMEOUT_MS: '250',
    OPENAI_COMPATIBLE_MAX_RETRIES: '0',
    OPENAI_COMPATIBLE_RETRY_BACKOFF_MS: '0',
  };

  const api = spawnManaged('npm', ['run', 'start', '-w', '@gmi/api'], {
    ...commonEnv,
    PORT: String(port),
  });
  api.stdout.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });
  api.stderr.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });

  const worker = spawnManaged('npm', ['run', 'start', '-w', '@gmi/worker'], commonEnv);
  worker.stdout.on('data', (chunk) => {
    workerOutput += chunk.toString();
  });
  worker.stderr.on('data', (chunk) => {
    workerOutput += chunk.toString();
  });

  await waitForApiHealth();
  await waitForOutput(
    () => workerOutput.includes(`task queue "${taskQueue}"`),
    'Temporal worker did not start on the provider-failure smoke task queue',
  );

  const idempotencyKey = `harness-provider-failure-smoke-${Date.now()}`;
  const submitResponse = await postJson(
    `${baseUrl}/template-versions/tv-harness-provider-failure-${Date.now()}/analysis-runs`,
    {
      triggerType: 'manual_reanalysis',
      reason: 'Temporal provider failure smoke test',
      effort: 'normal',
      requestedOutputs: [],
    },
    {
      'idempotency-key': idempotencyKey,
      ...governanceHeaders,
    },
  );

  assertEqual(submitResponse.status, 'Queued', 'submit status');
  assertEqual(submitResponse.workflow.driver, 'temporal', 'workflow driver');
  assertEqual(submitResponse.workflow.started, true, 'workflow started');

  const failedRun = await pollFailedRun(submitResponse.runId);
  assertEqual(failedRun.status, 'Failed', 'failed run status');
  if (failedRun.output) {
    throw new Error(`Run ${submitResponse.runId} failed but unexpectedly exposed output.`);
  }
  assertEqual(failedRun.errors?.length, 1, 'API failed run error count');
  assertEqual(failedRun.errors[0].code, 'provider_error', 'API failed run error code');
  assertEqual(failedRun.errors[0].retryable, true, 'API failed run retryable flag');

  const evidence = await readFailureEvidence(submitResponse.runId);
  assertEqual(evidence.analysisOutputs, 0, 'analysis_outputs count');
  assertEqual(evidence.failedAuditEvents, 1, 'analysis_run_failed audit_events count');

  if (evidence.errors.length !== 1) {
    throw new Error(`Expected one persisted error, got ${JSON.stringify(evidence.errors)}.`);
  }

  const [error] = evidence.errors;
  assertEqual(error.code, 'provider_error', 'persisted error code');
  assertEqual(error.retryable, true, 'persisted error retryable flag');

  if (!String(error.message).includes('provider_error:provider-failure-smoke:network:')) {
    throw new Error(`Persisted error message did not include provider network code: ${error.message}`);
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        runId: submitResponse.runId,
        workflowId: submitResponse.workflow.workflowId,
        taskQueue,
        evidence,
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
  await waitForOutput(async () => {
    try {
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }, 'API did not become healthy');
}

async function pollFailedRun(runId) {
  let latest;

  await waitForOutput(async () => {
    latest = await getJson(`${baseUrl}/analysis-runs/${runId}`, governanceHeaders);
    return latest.status === 'Failed' && Boolean(latest.completedAt);
  }, `Run ${runId} did not fail with persisted metadata`);

  return latest;
}

async function readFailureEvidence(runId) {
  const analysisOutputs = await sql`
    select count(*)::text as count from analysis_outputs where run_id = ${runId}
  `.execute(db);
  const failedAuditEvents = await sql`
    select count(*)::text as count
    from audit_events
    where source_run_id = ${runId}
      and action = 'analysis_run_failed'
  `.execute(db);
  const errorRows = await sql`
    select errors_json as errors from analysis_runs where run_id = ${runId}
  `.execute(db);

  return {
    analysisOutputs: Number(analysisOutputs.rows[0]?.count ?? 0),
    failedAuditEvents: Number(failedAuditEvents.rows[0]?.count ?? 0),
    errors: normalizeJsonArray(errorRows.rows[0]?.errors),
  };
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  }

  return [];
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, {
    headers,
  });

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

async function waitForOutput(predicate, message) {
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
    `${message} within ${timeoutMs}ms.\nLast error: ${String(
      lastError,
    )}\nAPI output:\n${apiOutput}\nWorker output:\n${workerOutput}`,
  );
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
