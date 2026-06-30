import { spawn } from 'node:child_process';
import process from 'node:process';
import {
  latestAnalysisEvaluationResponseSchema,
  recordPipelineReleaseEvidenceResponseSchema,
} from '@gmi/contracts';
import {
  createPostgresDatabase,
  createPostgresPool,
  migratePostgresDatabase,
} from '@gmi/db';
import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://gmi:gmi@127.0.0.1:55432/gmi';
const port = Number(process.env.API_SMOKE_PORT ?? 4140);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.RELEASE_EVIDENCE_API_TIMEOUT_MS ?? 60_000);
const governanceHeaders = {
  'x-actor-id': 'release-evidence-api-smoke',
  'x-gmi-roles': 'change_checker,auditor,analysis_reader',
};
const processes = [];
let apiOutput = '';

const pool = createPostgresPool({ connectionString: databaseUrl });
const db = createPostgresDatabase(pool);

try {
  await migratePostgresDatabase(db);

  const report = await runGoldenTemplateEvaluation();
  const releaseId = `REL-API-SMOKE-${Date.now()}`;
  const pipelineVersion = `template-analysis-pipeline@api-smoke-${Date.now()}`;
  const evidence = createPipelineReleaseEvidence(report, {
    releaseId,
    pipelineVersion,
    promptVersion: 'template-analysis-agent@replay',
    modelProvider: 'replay',
    modelName: 'replay-golden-fixtures',
    rulesetVersion: 'messaging-governance-rules@local',
    requestedBy: 'release-evidence-api-smoke',
  });

  const api = spawnManaged('npm', ['run', 'start', '-w', '@gmi/api'], {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: databaseUrl,
    API_AUTH_MODE: 'header',
    ANALYSIS_WORKFLOW_DRIVER: 'none',
    AI_PROVIDER: 'noop',
  });
  api.stdout.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });
  api.stderr.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });

  await waitForApiHealth();

  const invalidResponse = await fetch(`${baseUrl}/analysis-evaluations/release-evidence`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...governanceHeaders,
    },
    body: JSON.stringify({
      evidence: {
        ...evidence,
        evidenceHash: 'sha256:invalid',
      },
      reportRef: `api-smoke:${releaseId}:invalid`,
    }),
  });

  if (invalidResponse.status !== 400) {
    throw new Error(
      `Invalid release evidence should return 400, got ${invalidResponse.status}: ${await invalidResponse.text()}`,
    );
  }

  const invalidBody = await invalidResponse.json();
  assertEqual(invalidBody.error?.code, 'invalid_release_evidence', 'invalid hash error code');

  const recordResponse = recordPipelineReleaseEvidenceResponseSchema.parse(
    await postJson(`${baseUrl}/analysis-evaluations/release-evidence`, {
      evidence,
      reportRef: `api-smoke:${releaseId}`,
    }),
  );
  const latest = latestAnalysisEvaluationResponseSchema.parse(
    await getJson(`${baseUrl}/analysis-evaluations/latest`),
  );

  assertEqual(recordResponse.recordedRelease.releaseId, releaseId, 'recorded release id');
  assertEqual(recordResponse.recordedRelease.evidenceHash, evidence.evidenceHash, 'recorded hash');
  assertEqual(recordResponse.latest.release.releaseId, releaseId, 'response latest release id');
  assertEqual(recordResponse.latest.source.kind, 'postgres', 'response latest source kind');
  assertEqual(recordResponse.latest.source.persisted, true, 'response latest persisted flag');
  assertEqual(latest.release.releaseId, releaseId, 'GET latest release id');
  assertEqual(latest.source.kind, 'postgres', 'GET latest source kind');
  assertEqual(latest.source.persisted, true, 'GET latest persisted flag');
  assertEqual(latest.release.evidenceHash, evidence.evidenceHash, 'GET latest hash');
  assertEqual(latest.evaluation.verdict, 'pass', 'GET latest verdict');
  await verifyReleaseEvidenceMetric(releaseId);

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        evaluationId: recordResponse.recordedEvaluation.evaluationId,
        releaseId,
        evidenceHash: evidence.evidenceHash,
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

async function verifyReleaseEvidenceMetric(releaseId) {
  const response = await fetch(`${baseUrl}/metrics`);

  if (!response.ok) {
    throw new Error(`GET /metrics returned ${response.status}: ${await response.text()}`);
  }

  const metrics = await response.text();

  assertIncludes(
    metrics,
    'gmi_release_evidence_records_total{verdict="pass",status="ReadyForPromotion",promotion_allowed="true"} 1',
    'release evidence metric',
  );

  if (metrics.includes(releaseId)) {
    throw new Error('release evidence metric must not expose release ids');
  }
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

async function getJson(url) {
  const response = await fetch(url, {
    headers: governanceHeaders,
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
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
    `${message} within ${timeoutMs}ms.\nLast error: ${String(lastError)}\nAPI output:\n${apiOutput}`,
  );
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to include ${expected}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
