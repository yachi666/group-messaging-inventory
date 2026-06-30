import { spawn } from 'node:child_process';
import {
  aiTemplateAnalysisResultsResponseSchema,
  changeRequestEvidencePackageSchema,
  changeRequestsResponseSchema,
  latestAnalysisEvaluationResponseSchema,
  reviewTasksResponseSchema,
} from '@gmi/contracts';
import { verificationSeedCases } from '@gmi/evals';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://gmi:gmi@127.0.0.1:55432/gmi';
const port = Number(process.env.API_SEED_VERIFICATION_PORT ?? 4130);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = 25_000;
const datasetId =
  process.env.SEED_DATASET_ID ??
  `verification-api-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

let apiOutput = '';
let api;

try {
  const seedOutput = await runNodeScript('scripts/seed-verification-data-pg.mjs', {
    DATABASE_URL: databaseUrl,
    SEED_DATASET_ID: datasetId,
  });
  const seedSummary = parseJsonOutput(seedOutput);

  assertEqual(seedSummary.status, 'ok', 'seed status');
  assertEqual(seedSummary.datasetId, datasetId, 'seed dataset id');

  api = spawn('npm', ['run', 'dev:api'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: databaseUrl,
      ANALYSIS_WORKFLOW_DRIVER: 'none',
      API_AUTH_MODE: 'header',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  api.stdout.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });
  api.stderr.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });

  await waitForHealth();

  const resultsResponse = await getJson(`${baseUrl}/templates/analysis-results`);
  aiTemplateAnalysisResultsResponseSchema.parse(resultsResponse);
  const seededResults = resultsResponse.results.filter((result) =>
    result.versionId.includes(datasetId),
  );
  assertEqual(
    seededResults.length,
    verificationSeedCases.length,
    'seeded analysis result count',
  );

  const policyDecisions = new Set(
    seededResults.map((result) => result.routing.policyDecision),
  );
  for (const decision of ['auto_record', 'review_required', 'blocked']) {
    if (!policyDecisions.has(decision)) {
      throw new Error(`Seeded API results missing policy decision: ${decision}`);
    }
  }

  const reviewTasksResponse = await getJson(
    `${baseUrl}/review-tasks?status=InReview&assignedTo=seed-reviewer&limit=20`,
  );
  reviewTasksResponseSchema.parse(reviewTasksResponse);
  const seededReviewTasks = reviewTasksResponse.reviewTasks.filter((task) =>
    task.objectId.includes(datasetId),
  );
  assertEqual(seededReviewTasks.length, 1, 'seeded in-review task count');
  assertEqual(
    seededReviewTasks[0].assignedTo,
    'seed-reviewer',
    'seeded review task assignee',
  );

  const pendingApprovals = await getJson(
    `${baseUrl}/change-requests?status=PendingApproval`,
  );
  changeRequestsResponseSchema.parse(pendingApprovals);
  const seededPendingApprovals = pendingApprovals.changeRequests.filter((request) =>
    request.objectId.includes(datasetId),
  );
  assertEqual(seededPendingApprovals.length, 1, 'seeded pending approval count');
  assertEqual(
    seededPendingApprovals[0].changeRequestId,
    seedSummary.changeRequests.pending,
    'seeded pending approval id',
  );

  const approvedEvidencePackage = await getJson(
    `${baseUrl}/change-requests/${seedSummary.changeRequests.approved}/evidence-package`,
  );
  changeRequestEvidencePackageSchema.parse(approvedEvidencePackage);
  assertEqual(
    approvedEvidencePackage.changeRequest.changeRequestId,
    seedSummary.changeRequests.approved,
    'approved evidence change request id',
  );
  assertEqual(
    approvedEvidencePackage.sourceRun.runId,
    seedSummary.analysisRuns.approvalCandidate,
    'approved evidence source run id',
  );
  assertEqual(
    approvedEvidencePackage.changeRequest.status,
    'Approved',
    'approved evidence change request status',
  );
  if (
    !approvedEvidencePackage.auditEvents.some(
      (event) => event.action === 'change_request_decided',
    )
  ) {
    throw new Error('Approved evidence package missing decision audit event.');
  }

  const latestEvaluation = await getJson(`${baseUrl}/analysis-evaluations/latest`);
  latestAnalysisEvaluationResponseSchema.parse(latestEvaluation);
  assertEqual(latestEvaluation.source.kind, 'postgres', 'latest evaluation source');
  assertEqual(latestEvaluation.source.persisted, true, 'latest evaluation persisted');
  assertEqual(
    latestEvaluation.release.releaseId,
    seedSummary.latestEvaluation.releaseId,
    'latest evaluation release id',
  );
  assertEqual(latestEvaluation.evaluation.verdict, 'pass', 'latest evaluation verdict');
  assertEqual(
    latestEvaluation.release.promotionAllowed,
    true,
    'latest evaluation promotion allowed',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        datasetId,
        analysisResults: seededResults.length,
        policyDecisions: [...policyDecisions].sort(),
        reviewTaskId: seededReviewTasks[0].taskId,
        pendingChangeRequestId: seededPendingApprovals[0].changeRequestId,
        approvedEvidencePackageId: approvedEvidencePackage.packageId,
        latestReleaseId: latestEvaluation.release.releaseId,
      },
      null,
      2,
    ),
  );
} finally {
  api?.kill('SIGINT');
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw new Error(
    `API did not become healthy within ${timeoutMs}ms.\nLast error: ${String(
      lastError,
    )}\nOutput:\n${apiOutput}`,
  );
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      'x-actor-id': 'seed-api-verifier',
      'x-gmi-roles': 'analysis_reader,analysis_runner,change_checker,auditor',
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function runNodeScript(scriptPath, env) {
  const child = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
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

  const code = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  if (code !== 0) {
    throw new Error(`${scriptPath} exited with ${code}.\n${stdout}\n${stderr}`);
  }

  return stdout;
}

function parseJsonOutput(output) {
  const jsonStart = output.indexOf('{');

  if (jsonStart < 0) {
    throw new Error(`Expected JSON output, got:\n${output}`);
  }

  return JSON.parse(output.slice(jsonStart));
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
