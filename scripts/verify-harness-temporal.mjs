import { spawn } from 'node:child_process';
import process from 'node:process';
import { sql } from 'kysely';
import {
  analysisRunEvidencePackageSchema,
} from '@gmi/contracts';
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
  process.env.TEMPORAL_TASK_QUEUE ?? `template-analysis-smoke-${Date.now()}`;
const port = Number(process.env.API_SMOKE_PORT ?? 4130);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.HARNESS_SMOKE_TIMEOUT_MS ?? 60_000);
const governanceHeaders = {
  'x-actor-id': 'harness-temporal-smoke',
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
    AI_PROVIDER: process.env.AI_PROVIDER ?? 'noop',
    ANALYSIS_WORKFLOW_DRIVER: 'temporal',
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
    'Temporal worker did not start on the smoke task queue',
  );

  const idempotencyKey = `harness-temporal-smoke-${Date.now()}`;
  const versionId = `tv-harness-temporal-smoke-${Date.now()}`;
  const submitBody = {
    triggerType: 'manual_reanalysis',
    reason: 'Temporal harness smoke test',
    effort: 'normal',
    requestedOutputs: [],
  };
  const submitHeaders = {
    'idempotency-key': idempotencyKey,
    ...governanceHeaders,
  };
  const submitResponse = await postJson(
    `${baseUrl}/template-versions/${versionId}/analysis-runs`,
    submitBody,
    submitHeaders,
  );

  assertEqual(submitResponse.status, 'Queued', 'submit status');
  assertEqual(submitResponse.workflow.driver, 'temporal', 'workflow driver');
  assertEqual(submitResponse.workflow.started, true, 'workflow started');

  const completedRun = await pollCompletedRun(submitResponse.runId);
  assertEqual(completedRun.status, 'Succeeded', 'completed run status');
  if (!completedRun.output) {
    throw new Error(`Run ${submitResponse.runId} completed without output.`);
  }
  assertEqual(completedRun.routing.policyDecision, 'review_required', 'policy decision');

  const evidence = await readEvidenceCounts(submitResponse.runId);
  assertEqual(evidence.analysisOutputs, 1, 'analysis_outputs count');
  assertEqual(evidence.reviewTasks, 1, 'review_tasks count');
  assertEqual(evidence.auditEvents, 1, 'audit_events count');

  const duplicateSubmitResponse = await postJson(
    `${baseUrl}/template-versions/${versionId}/analysis-runs`,
    submitBody,
    submitHeaders,
  );
  assertEqual(
    duplicateSubmitResponse.runId,
    submitResponse.runId,
    'duplicate idempotency run id',
  );
  assertEqual(
    duplicateSubmitResponse.status,
    'Succeeded',
    'duplicate idempotency current status',
  );
  assertEqual(
    duplicateSubmitResponse.workflow.driver,
    'temporal',
    'duplicate idempotency workflow driver',
  );
  assertEqual(
    duplicateSubmitResponse.workflow.workflowId,
    submitResponse.workflow.workflowId,
    'duplicate idempotency workflow id',
  );
  assertEqual(
    duplicateSubmitResponse.workflow.started,
    false,
    'duplicate idempotency workflow started',
  );

  const duplicateEvidence = await readEvidenceCounts(submitResponse.runId);
  assertEqual(duplicateEvidence.analysisOutputs, 1, 'duplicate analysis_outputs count');
  assertEqual(duplicateEvidence.reviewTasks, 1, 'duplicate review_tasks count');
  assertEqual(duplicateEvidence.auditEvents, 1, 'duplicate audit_events count');

  const evidencePackage = analysisRunEvidencePackageSchema.parse(
    await getJson(
      `${baseUrl}/analysis-runs/${encodeURIComponent(submitResponse.runId)}/evidence-package`,
      governanceHeaders,
    ),
  );
  assertEqual(
    evidencePackage.sourceRun.runId,
    submitResponse.runId,
    'analysis run evidence package source run id',
  );
  if (!evidencePackage.auditEvents.some((event) => event.action === 'analysis_result_recorded')) {
    throw new Error('analysis run evidence package must include analysis_result_recorded audit event.');
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

async function pollCompletedRun(runId) {
  let latest;

  await waitForOutput(async () => {
    latest = await getJson(`${baseUrl}/analysis-runs/${runId}`, governanceHeaders);
    return latest.status === 'Succeeded' && Boolean(latest.output);
  }, `Run ${runId} did not complete with output`);

  return latest;
}

async function readEvidenceCounts(runId) {
  const analysisOutputs = await sql`
    select count(*)::text as count from analysis_outputs where run_id = ${runId}
  `.execute(db);
  const reviewTasks = await sql`
    select count(*)::text as count from review_tasks where source_run_id = ${runId}
  `.execute(db);
  const auditEvents = await sql`
    select count(*)::text as count
    from audit_events
    where source_run_id = ${runId}
      and action = 'analysis_result_recorded'
  `.execute(db);

  return {
    analysisOutputs: Number(analysisOutputs.rows[0]?.count ?? 0),
    reviewTasks: Number(reviewTasks.rows[0]?.count ?? 0),
    auditEvents: Number(auditEvents.rows[0]?.count ?? 0),
  };
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
