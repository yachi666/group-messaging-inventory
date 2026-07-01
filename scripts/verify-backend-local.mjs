import { spawn } from 'node:child_process';
import process from 'node:process';
import {
  OpenAICompatibleChatAnalysisAdapter,
  getAiProviderRuntimeMetadata,
} from '@gmi/ai-adapters';
import {
  analysisRunEvidencePackageSchema,
  aiTemplateAnalysisResultsResponseSchema,
  analysisRunResponseSchema,
  changeRequestEvidencePackageSchema,
  confirmAnalysisRunResponseSchema,
  auditEventsResponseSchema,
  changeRequestResponseSchema,
  changeRequestsResponseSchema,
  latestAnalysisEvaluationResponseSchema,
  readinessResponseSchema,
  reviewTaskResponseSchema,
  reviewTasksResponseSchema,
  standardErrorSchema,
  submitAnalysisRunResponseSchema,
} from '@gmi/contracts';

const port = Number(process.env.API_SMOKE_PORT ?? 4120);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = 20_000;

const api = spawn('npm', ['run', 'dev:api'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    ANALYSIS_WORKFLOW_DRIVER: 'none',
    DATABASE_URL: '',
    API_AUTH_MODE: 'header',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let apiOutput = '';
api.stdout.on('data', (chunk) => {
  apiOutput += chunk.toString();
});
api.stderr.on('data', (chunk) => {
  apiOutput += chunk.toString();
});

try {
  await verifyOpenAICompatibleAdapter();

  await waitForHealth();
  await verifyAccessLog();
  await verifyReadiness();

  await verifyStandardValidationError();
  await verifyInvalidIdempotencyKey();
  await verifyRbacRequired();

  const submitResult = await postJsonWithStatus(
    `${baseUrl}/template-versions/tv-backend-local-smoke/analysis-runs`,
    {
      triggerType: 'manual_reanalysis',
      reason: 'backend local smoke',
      effort: 'normal',
      requestedOutputs: [],
    },
    {
      'idempotency-key': `backend-local-smoke-${Date.now()}`,
    },
  );
  const submitResponse = submitResult.body;
  submitAnalysisRunResponseSchema.parse(submitResponse);

  assertEqual(submitResult.status, 202, 'submit status code');
  assertEqual(submitResponse.status, 'Queued', 'submit status');
  assertEqual(
    submitResponse.pollUrl,
    `/analysis-runs/${submitResponse.runId}`,
    'submit poll URL',
  );
  assertEqual(submitResponse.workflow.driver, 'none', 'workflow driver');
  assertEqual(submitResponse.workflow.started, false, 'workflow started');

  const runResponse = await getJson(`${baseUrl}/analysis-runs/${submitResponse.runId}`);
  analysisRunResponseSchema.parse(runResponse);
  assertEqual(runResponse.status, 'Succeeded', 'get run status');
  assertEqual(runResponse.routing.policyDecision, 'auto_record', 'scaffold routing decision');

  const confirmResult = await postJsonWithStatus(
    `${baseUrl}/analysis-runs/${submitResponse.runId}/confirm`,
    {},
  );
  confirmAnalysisRunResponseSchema.parse(confirmResult.body);
  assertEqual(confirmResult.status, 200, 'confirm status code');
  assertEqual(confirmResult.body.reviewStatus, 'reviewed', 'confirm review status');

  const runEvidencePackage = await getJson(
    `${baseUrl}/analysis-runs/${submitResponse.runId}/evidence-package`,
  );
  analysisRunEvidencePackageSchema.parse(runEvidencePackage);
  assertEqual(
    runEvidencePackage.sourceRun.runId,
    submitResponse.runId,
    'analysis run evidence source run id',
  );
  if (
    !runEvidencePackage.auditEvents.some(
      (event) => event.action === 'analysis_run_confirmed',
    )
  ) {
    throw new Error('analysis run evidence package must include confirmation audit event');
  }
  const blockedScopeRunEvidencePackage = await getJsonWithStatus(
    `${baseUrl}/analysis-runs/${submitResponse.runId}/evidence-package`,
    {
      'x-gmi-scope-tenants': 'tenant-without-access',
    },
  );
  assertEqual(
    blockedScopeRunEvidencePackage.status,
    403,
    'blocked tenant-scoped analysis run evidence status',
  );
  standardErrorSchema.parse(blockedScopeRunEvidencePackage.body);
  assertEqual(
    blockedScopeRunEvidencePackage.body.error.code,
    'access_denied',
    'blocked tenant-scoped analysis run evidence error code',
  );

  await verifyBaseRevisionConflict(submitResponse.runId);
  await verifyAnalysisRunTerminalGuard(submitResponse.runId);
  await verifyOpenChangeRequestConflict(submitResponse);
  await verifyCreateAndSubmitChangeRequest();
  await verifyCurrentVersionChangeRequest();
  await verifyMakerCheckerDecisionFlow();

  const resultsResponse = await getJson(`${baseUrl}/templates/analysis-results`);
  aiTemplateAnalysisResultsResponseSchema.parse(resultsResponse);
  if (!Array.isArray(resultsResponse.results) || resultsResponse.results.length === 0) {
    throw new Error('analysis results projection was empty');
  }
  const locallyScopedResultsResponse = await getJson(
    `${baseUrl}/templates/analysis-results?limit=10`,
    {
      'x-gmi-scope-tenants': 'local',
    },
  );
  aiTemplateAnalysisResultsResponseSchema.parse(locallyScopedResultsResponse);
  if (locallyScopedResultsResponse.results.length === 0) {
    throw new Error('local tenant-scoped analysis results projection was empty');
  }
  const blockedScopeResultsResponse = await getJson(
    `${baseUrl}/templates/analysis-results?limit=10`,
    {
      'x-gmi-scope-tenants': 'tenant-without-access',
    },
  );
  aiTemplateAnalysisResultsResponseSchema.parse(blockedScopeResultsResponse);
  assertEqual(
    blockedScopeResultsResponse.results.length,
    0,
    'tenant-scoped analysis results are filtered',
  );
  const limitedResultsResponse = await getJson(
    `${baseUrl}/templates/analysis-results?limit=1`,
  );
  aiTemplateAnalysisResultsResponseSchema.parse(limitedResultsResponse);
  assertEqual(
    limitedResultsResponse.results.length,
    1,
    'analysis results limit query',
  );
  assertEqual(
    typeof resultsResponse.results[0].templateUuid,
    'string',
    'analysis result template uuid',
  );
  assertEqual(
    typeof resultsResponse.results[0].versionId,
    'string',
    'analysis result version id',
  );
  assertEqual(
    typeof resultsResponse.results[0].routing?.policyDecision,
    'string',
    'analysis result policy decision',
  );
  if (!('reviewTaskId' in resultsResponse.results[0].routing)) {
    throw new Error('analysis result routing must expose reviewTaskId');
  }

  const reviewTasksResponse = await getJson(
    `${baseUrl}/review-tasks?sourceRunId=${encodeURIComponent(resultsResponse.results[0].id)}`,
  );
  reviewTasksResponseSchema.parse(reviewTasksResponse);
  if (!Array.isArray(reviewTasksResponse.reviewTasks) || reviewTasksResponse.reviewTasks.length === 0) {
    throw new Error('review task projection was empty');
  }
  assertEqual(
    reviewTasksResponse.reviewTasks[0].taskId,
    resultsResponse.results[0].routing.reviewTaskId,
    'review task id matches analysis routing',
  );
  await verifyReviewTaskLifecycle(reviewTasksResponse.reviewTasks[0].taskId);

  const latestEvaluation = await getJson(`${baseUrl}/analysis-evaluations/latest`);
  latestAnalysisEvaluationResponseSchema.parse(latestEvaluation);
  assertEqual(latestEvaluation.source.kind, 'replay_fallback', 'latest eval source kind');
  assertEqual(latestEvaluation.source.persisted, false, 'latest eval persisted flag');
  assertEqual(latestEvaluation.evaluation.suite, 'template-analysis-golden', 'latest eval suite');
  assertEqual(latestEvaluation.evaluation.verdict, 'pass', 'latest eval verdict');
  assertEqual(latestEvaluation.evaluation.metrics.caseCount, 7, 'latest eval case count');
  assertEqual(
    latestEvaluation.release.status,
    'ReadyForPromotion',
    'latest eval release status',
  );
  assertIncludes(latestEvaluation.release.evidenceHash, 'sha256:', 'latest eval hash');

  await verifyApiDomainMetrics(submitResponse.runId);
  await verifyWorkerActivities();
  await verifyPublicAnalysisRunErrorMapping();

  console.log(
    `Backend local smoke passed. runId=${submitResponse.runId}, results=${resultsResponse.results.length}`,
  );
} finally {
  api.kill('SIGINT');
}

async function verifyApiDomainMetrics(runId) {
  const response = await fetch(`${baseUrl}/metrics`);

  if (!response.ok) {
    throw new Error(`GET /metrics returned ${response.status}: ${await response.text()}`);
  }

  const metrics = await response.text();

  assertIncludes(
    metrics,
    'gmi_analysis_runs_submitted_total{trigger_type="manual_reanalysis",effort="normal",workflow_driver="none"} 1',
    'API analysis submitted metric',
  );
  assertIncludes(
    metrics,
    'gmi_analysis_runs_confirmed_total{review_status="reviewed"} 1',
    'API analysis confirmed metric',
  );
  assertDoesNotInclude(metrics, runId, 'API metrics must not expose run ids');
  assertDoesNotInclude(metrics, 'tv-backend-local-smoke', 'API metrics must not expose version ids');
}

async function verifyPublicAnalysisRunErrorMapping() {
  const { toPublicAnalysisRunError } = await import(
    '../apps/api/dist/modules/analysis-runs/analysis-runs.service.js'
  );

  const providerError = toPublicAnalysisRunError({
    code: 'provider_error',
    message: 'provider_error:deepseek:network:fetch failed with socket details',
    retryable: true,
  });
  assertEqual(providerError.code, 'provider_error', 'public provider error code');
  assertEqual(
    providerError.message,
    'provider_error:deepseek:network',
    'public provider error message redaction',
  );
  assertEqual(providerError.retryable, true, 'public provider error retryable');

  const schemaError = toPublicAnalysisRunError({
    code: 'schema_validation_failed',
    message: 'schema_validation_failed: raw validation issue details',
    retryable: false,
  });
  assertEqual(
    schemaError.message,
    'schema_validation_failed',
    'public schema error message redaction',
  );
}

async function verifyReviewTaskLifecycle(taskId) {
  const assignedResult = await postJsonWithStatus(
    `${baseUrl}/review-tasks/${taskId}/transition`,
    {
      actorId: 'spoofed-reviewer-local-smoke',
      status: 'Assigned',
      assignedTo: 'reviewer-local-smoke',
      reason: 'backend smoke reviewer claim',
    },
    {
      'x-actor-id': 'reviewer-local-smoke',
    },
  );
  reviewTaskResponseSchema.parse(assignedResult.body);
  assertEqual(assignedResult.status, 200, 'review task assign status code');
  assertEqual(assignedResult.body.status, 'Assigned', 'review task assigned status');
  assertEqual(
    assignedResult.body.assignedTo,
    'reviewer-local-smoke',
    'review task assigned actor',
  );

  const assignedQueue = await getJson(
    `${baseUrl}/review-tasks?status=Assigned&assignedTo=reviewer-local-smoke`,
  );
  reviewTasksResponseSchema.parse(assignedQueue);
  if (!assignedQueue.reviewTasks.some((task) => task.taskId === taskId)) {
    throw new Error('assigned review task was missing from reviewer-filtered queue');
  }

  const otherReviewerQueue = await getJson(
    `${baseUrl}/review-tasks?status=Assigned&assignedTo=other-reviewer-local-smoke`,
  );
  reviewTasksResponseSchema.parse(otherReviewerQueue);
  if (otherReviewerQueue.reviewTasks.some((task) => task.taskId === taskId)) {
    throw new Error('assigned review task leaked into another reviewer queue');
  }

  const inReview = await postJson(
    `${baseUrl}/review-tasks/${taskId}/transition`,
    {
      status: 'InReview',
      reason: 'backend smoke reviewer started work',
    },
    {
      'x-actor-id': 'reviewer-local-smoke',
    },
  );
  reviewTaskResponseSchema.parse(inReview);
  assertEqual(inReview.status, 'InReview', 'review task in-review status');

  const resolved = await postJson(
    `${baseUrl}/review-tasks/${taskId}/transition`,
    {
      status: 'Resolved',
      reason: 'backend smoke reviewer completed task',
    },
    {
      'x-actor-id': 'reviewer-local-smoke',
    },
  );
  reviewTaskResponseSchema.parse(resolved);
  assertEqual(resolved.status, 'Resolved', 'review task resolved status');
  assertEqual(typeof resolved.resolvedAt, 'string', 'review task resolved timestamp');

  const invalidResponse = await fetch(
    `${baseUrl}/review-tasks/${taskId}/transition`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...defaultAuthHeaders(),
        'x-actor-id': 'reviewer-local-smoke',
      },
      body: JSON.stringify({
        status: 'InReview',
        reason: 'backend smoke terminal task cannot reopen',
      }),
    },
  );
  const invalidBody = await invalidResponse.json();
  standardErrorSchema.parse(invalidBody);
  assertEqual(invalidResponse.status, 422, 'review task invalid transition status');
  assertEqual(
    invalidBody.error?.code,
    'invalid_state_transition',
    'review task invalid transition code',
  );

  const auditEventsResponse = await getJson(
    `${baseUrl}/audit-events?sourceRunId=${encodeURIComponent(resolved.sourceRunId)}`,
  );
  auditEventsResponseSchema.parse(auditEventsResponse);
  const reviewTaskEvents = auditEventsResponse.auditEvents.filter(
    (event) => event.action === 'review_task_transitioned',
  );
  if (reviewTaskEvents.length < 3) {
    throw new Error('review task lifecycle audit events were missing');
  }
  assertEqual(
    reviewTaskEvents.some((event) => event.afterRef?.includes('Resolved')),
    true,
    'review task resolved audit event',
  );
  assertEqual(
    reviewTaskEvents.every((event) => event.actorId === 'reviewer-local-smoke'),
    true,
    'review task audit actor comes from auth header',
  );
}

async function verifyStandardValidationError() {
  const requestId = `backend-local-validation-${Date.now()}`;
  const response = await fetch(
    `${baseUrl}/template-versions/tv-invalid-smoke/analysis-runs`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        ...defaultAuthHeaders(),
      },
      body: JSON.stringify({
        triggerType: 'manual_reanalysis',
        reason: '',
        effort: 'normal',
        requestedOutputs: [],
      }),
    },
  );
  const body = await response.json();
  standardErrorSchema.parse(body);

  assertEqual(response.status, 400, 'validation status');
  assertEqual(body.error?.code, 'schema_validation_failed', 'validation error code');
  assertEqual(body.error?.requestId, requestId, 'validation error request id');
  assertEqual(
    response.headers.get('x-request-id'),
    requestId,
    'validation response request id header',
  );
}

async function verifyInvalidIdempotencyKey() {
  const response = await fetch(
    `${baseUrl}/template-versions/tv-invalid-idempotency-smoke/analysis-runs`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...defaultAuthHeaders(),
        'idempotency-key': 'invalid key with spaces',
      },
      body: JSON.stringify({
        triggerType: 'manual_reanalysis',
        reason: 'backend local invalid idempotency key smoke',
        effort: 'normal',
        requestedOutputs: [],
      }),
    },
  );
  const body = await response.json();
  standardErrorSchema.parse(body);

  assertEqual(response.status, 400, 'invalid idempotency key status');
  assertEqual(
    body.error?.code,
    'invalid_idempotency_key',
    'invalid idempotency key error code',
  );
  assertEqual(
    body.error?.details?.header,
    'idempotency-key',
    'invalid idempotency key header detail',
  );
}

async function verifyRbacRequired() {
  const response = await fetch(
    `${baseUrl}/template-versions/tv-rbac-denied-smoke/analysis-runs`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-actor-id': 'unauthorized-local-smoke',
      },
      body: JSON.stringify({
        triggerType: 'manual_reanalysis',
        reason: 'backend local RBAC denial smoke',
        effort: 'normal',
        requestedOutputs: [],
      }),
    },
  );
  const body = await response.json();
  standardErrorSchema.parse(body);

  assertEqual(response.status, 403, 'rbac missing role status');
  assertEqual(body.error?.code, 'access_denied', 'rbac missing role error code');
  assertEqual(
    body.error?.message,
    'Missing required role: analysis_runner',
    'rbac missing role message',
  );

  const missingActorResponse = await fetch(
    `${baseUrl}/template-versions/tv-rbac-missing-actor-smoke/analysis-runs`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gmi-roles': 'analysis_runner',
      },
      body: JSON.stringify({
        triggerType: 'manual_reanalysis',
        reason: 'backend local missing actor smoke',
        effort: 'normal',
        requestedOutputs: [],
      }),
    },
  );
  const missingActorBody = await missingActorResponse.json();
  standardErrorSchema.parse(missingActorBody);

  assertEqual(missingActorResponse.status, 403, 'rbac missing actor status');
  assertEqual(missingActorBody.error?.code, 'access_denied', 'rbac missing actor error code');
  assertEqual(
    missingActorBody.error?.message,
    'Missing required actor identity.',
    'rbac missing actor message',
  );
}

async function verifyReadiness() {
  const response = await fetch(`${baseUrl}/ready`);
  const body = await response.json();
  readinessResponseSchema.parse(body);

  assertEqual(response.status, 200, 'readiness status code');
  assertEqual(body.status, 'ready', 'readiness status');
  assertEqual(body.service, 'group-messaging-inventory-api', 'readiness service');

  const components = new Map(body.components.map((component) => [component.name, component]));
  assertEqual(components.get('api')?.status, 'up', 'readiness api component');
  assertEqual(components.get('database')?.status, 'skipped', 'readiness database component');
  assertEqual(components.get('workflow')?.status, 'up', 'readiness workflow component');
  assertEqual(components.get('ai-provider')?.status, 'up', 'readiness ai provider component');

  if (!response.headers.get('x-request-id')) {
    throw new Error('readiness response request id header was missing');
  }
}

async function verifyAccessLog() {
  const requestId = `backend-local-access-log-${Date.now()}`;
  const response = await fetch(`${baseUrl}/health`, {
    headers: {
      'x-request-id': requestId,
    },
  });

  if (!response.ok) {
    throw new Error(`access log health request returned ${response.status}`);
  }

  assertEqual(
    response.headers.get('x-request-id'),
    requestId,
    'access log response request id header',
  );

  await waitForCondition(() => apiOutput.includes(`"requestId":"${requestId}"`), {
    label: 'API access log request id',
  });
  await waitForCondition(() => apiOutput.includes('"event":"http_request"'), {
    label: 'API access log event',
  });
  await waitForCondition(() => apiOutput.includes('"actorId":"anonymous"'), {
    label: 'API access log anonymous actor',
  });
  await waitForCondition(() => apiOutput.includes('"roleCount":0'), {
    label: 'API access log anonymous role count',
  });

  const protectedRequestId = `backend-local-protected-access-log-${Date.now()}`;
  const protectedResponse = await fetch(`${baseUrl}/templates/analysis-results`, {
    headers: {
      'x-request-id': protectedRequestId,
      ...defaultAuthHeaders(),
    },
  });

  if (!protectedResponse.ok) {
    throw new Error(`access log protected request returned ${protectedResponse.status}`);
  }

  await waitForCondition(() => apiOutput.includes(`"requestId":"${protectedRequestId}"`), {
    label: 'API access log protected request id',
  });
  await waitForCondition(() => apiOutput.includes('"actorId":"backend-local-smoke"'), {
    label: 'API access log protected actor',
  });
  await waitForCondition(() => apiOutput.includes('"roleCount":4'), {
    label: 'API access log protected role count',
  });
}

async function verifyAnalysisRunTerminalGuard(runId) {
  const response = await fetch(
    `${baseUrl}/templates/pending-template-terminal-guard/lifecycle-change-requests`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...defaultAuthHeaders(),
        'idempotency-key': `backend-local-terminal-guard-${Date.now()}`,
      },
      body: JSON.stringify({
        baseRevision: 0,
        sourceRunId: runId,
        targetLifecycleStatus: 'Retired',
        reason: 'backend smoke non-terminal run guard',
      }),
    },
  );
  const body = await response.json();
  standardErrorSchema.parse(body);

  assertEqual(response.status, 422, 'analysis run terminal guard status');
  assertEqual(body.error?.code, 'analysis_run_not_terminal', 'analysis run terminal guard code');
}

async function verifyBaseRevisionConflict(runId) {
  const response = await fetch(
    `${baseUrl}/templates/pending-template-revision-conflict/mapping-change-requests`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...defaultAuthHeaders(),
        'idempotency-key': `backend-local-base-conflict-${Date.now()}`,
      },
      body: JSON.stringify({
        baseRevision: 99,
        sourceRunId: runId,
        targetUseCaseId: 'UC-BACKEND-SMOKE-REVISION',
        reason: 'backend smoke stale revision request',
      }),
    },
  );
  const body = await response.json();
  standardErrorSchema.parse(body);

  assertEqual(response.status, 409, 'base revision conflict status');
  assertEqual(body.error?.code, 'base_revision_conflict', 'base revision error code');
}

async function verifyOpenChangeRequestConflict(submitResponse) {
  const firstChangeRequest = await postJson(
    `${baseUrl}/templates/${submitResponse.templateUuid}/mapping-change-requests`,
    {
      baseRevision: 0,
      sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
      targetUseCaseId: 'UC-BACKEND-SMOKE',
      reason: 'backend smoke first mapping request',
    },
    {
      'idempotency-key': `backend-local-cr-${Date.now()}`,
    },
  );
  changeRequestResponseSchema.parse(firstChangeRequest);
  assertEqual(firstChangeRequest.status, 'Draft', 'first change request status');

  const response = await fetch(
    `${baseUrl}/templates/${submitResponse.templateUuid}/mapping-change-requests`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...defaultAuthHeaders(),
        'idempotency-key': `backend-local-cr-conflict-${Date.now()}`,
      },
      body: JSON.stringify({
        baseRevision: 0,
        sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
        targetUseCaseId: 'UC-BACKEND-SMOKE-2',
        reason: 'backend smoke conflicting mapping request',
      }),
    },
  );
  const body = await response.json();
  standardErrorSchema.parse(body);

  assertEqual(response.status, 409, 'open change request conflict status');
  assertEqual(body.error?.code, 'open_change_request_exists', 'open change request error code');
}

async function verifyCreateAndSubmitChangeRequest() {
  const submittedChangeRequest = await postJson(
    `${baseUrl}/templates/pending-template-create-submit/mapping-change-requests`,
    {
      baseRevision: 0,
      sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
      targetUseCaseId: 'UC-BACKEND-SMOKE-CREATE-SUBMIT',
      reason: 'backend smoke create and submit mapping request',
      submitterActorId: 'spoofed-analysis-maker-local-smoke',
    },
    {
      'idempotency-key': `backend-local-create-submit-${Date.now()}`,
      'x-actor-id': 'analysis-maker-local-smoke',
    },
  );
  changeRequestResponseSchema.parse(submittedChangeRequest);

  assertEqual(submittedChangeRequest.status, 'PendingApproval', 'create-submit status');
  assertEqual(
    submittedChangeRequest.submittedBy,
    'analysis-maker-local-smoke',
    'create-submit maker',
  );

  const pendingQueue = await getJson(`${baseUrl}/change-requests?status=PendingApproval`);
  changeRequestsResponseSchema.parse(pendingQueue);
  const blockedScopePendingQueue = await getJson(
    `${baseUrl}/change-requests?status=PendingApproval&limit=10`,
    {
      'x-gmi-scope-tenants': 'tenant-without-access',
    },
  );
  changeRequestsResponseSchema.parse(blockedScopePendingQueue);
  assertEqual(
    blockedScopePendingQueue.changeRequests.length,
    0,
    'tenant-scoped change requests are filtered',
  );
  const limitedPendingQueue = await getJson(
    `${baseUrl}/change-requests?status=PendingApproval&limit=1`,
  );
  changeRequestsResponseSchema.parse(limitedPendingQueue);
  assertEqual(
    limitedPendingQueue.changeRequests.length,
    1,
    'change requests limit query',
  );
  if (
    !pendingQueue.changeRequests.some(
      (item) => item.changeRequestId === submittedChangeRequest.changeRequestId,
    )
  ) {
    throw new Error('create-and-submit change request was missing from pending queue');
  }
}

async function verifyCurrentVersionChangeRequest() {
  const changeRequest = await postJson(
    `${baseUrl}/template-versions/tv-current-version-smoke/current-version-change-requests`,
    {
      baseRevision: 0,
      sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
      reason: 'backend smoke promote candidate version',
      submitterActorId: 'spoofed-version-maker-local-smoke',
    },
    {
      'idempotency-key': `backend-local-current-version-${Date.now()}`,
      'x-actor-id': 'version-maker-local-smoke',
    },
  );
  changeRequestResponseSchema.parse(changeRequest);

  assertEqual(changeRequest.status, 'PendingApproval', 'current version submitted status');
  assertEqual(changeRequest.objectId, 'pending-template-tv-current-version-smoke', 'current version object');

  const approvalResult = await postJsonWithStatus(
    `${baseUrl}/change-requests/${changeRequest.changeRequestId}/decision`,
    {
      decision: 'Approved',
      reason: 'backend smoke current version approval',
    },
    {
      'x-actor-id': 'version-checker-local-smoke',
    },
  );
  const approved = approvalResult.body;
  changeRequestResponseSchema.parse(approved);
  assertEqual(approvalResult.status, 200, 'current version decision status code');
  assertEqual(approved.status, 'Approved', 'current version approved status');

  const followUpChangeRequest = await postJson(
    `${baseUrl}/templates/pending-template-tv-current-version-smoke/lifecycle-change-requests`,
    {
      baseRevision: 1,
      sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
      targetLifecycleStatus: 'Active',
      reason: 'backend smoke current version advanced template revision',
    },
    {
      'idempotency-key': `backend-local-current-version-follow-up-${Date.now()}`,
    },
  );
  changeRequestResponseSchema.parse(followUpChangeRequest);
  assertEqual(followUpChangeRequest.status, 'Draft', 'current version follow-up status');
}

async function verifyMakerCheckerDecisionFlow() {
  const changeRequest = await postJson(
    `${baseUrl}/templates/pending-template-maker-checker/mapping-change-requests`,
    {
      baseRevision: 0,
      sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
      targetUseCaseId: 'UC-BACKEND-SMOKE-MAKER-CHECKER',
      reason: 'backend smoke maker-checker request',
    },
    {
      'idempotency-key': `backend-local-maker-checker-${Date.now()}`,
    },
  );
  changeRequestResponseSchema.parse(changeRequest);

  const submitChangeRequestResult = await postJsonWithStatus(
    `${baseUrl}/change-requests/${changeRequest.changeRequestId}/submit`,
    {
    },
    {
      'x-actor-id': 'maker-local-smoke',
    },
  );
  const submitted = submitChangeRequestResult.body;
  changeRequestResponseSchema.parse(submitted);
  assertEqual(submitChangeRequestResult.status, 200, 'submit change request status code');
  assertEqual(submitted.status, 'PendingApproval', 'submitted change request status');
  assertEqual(submitted.submittedBy, 'maker-local-smoke', 'submitted actor');

  const pendingQueue = await getJson(`${baseUrl}/change-requests?status=PendingApproval`);
  changeRequestsResponseSchema.parse(pendingQueue);
  if (!Array.isArray(pendingQueue.changeRequests)) {
    throw new Error('pending change request queue response was malformed');
  }
  const queuedChangeRequest = pendingQueue.changeRequests.find(
    (item) => item.changeRequestId === changeRequest.changeRequestId,
  );
  if (!queuedChangeRequest) {
    throw new Error('submitted change request was missing from pending approval queue');
  }
  assertEqual(queuedChangeRequest.status, 'PendingApproval', 'queued change request status');
  assertEqual(queuedChangeRequest.submittedBy, 'maker-local-smoke', 'queued change request maker');

  const selfApprovalResponse = await fetch(
    `${baseUrl}/change-requests/${changeRequest.changeRequestId}/decision`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...defaultAuthHeaders(),
        'x-actor-id': 'maker-local-smoke',
      },
      body: JSON.stringify({
        decision: 'Approved',
        reason: 'backend smoke self approval should be blocked',
      }),
    },
  );
  const selfApprovalBody = await selfApprovalResponse.json();
  standardErrorSchema.parse(selfApprovalBody);
  assertEqual(selfApprovalResponse.status, 403, 'self approval status');
  assertEqual(selfApprovalBody.error?.code, 'access_denied', 'self approval error code');

  const decisionResult = await postJsonWithStatus(
    `${baseUrl}/change-requests/${changeRequest.changeRequestId}/decision`,
    {
      decision: 'Approved',
      reason: 'backend smoke checker approval',
    },
    {
      'x-actor-id': 'checker-local-smoke',
    },
  );
  const approved = decisionResult.body;
  changeRequestResponseSchema.parse(approved);
  assertEqual(decisionResult.status, 200, 'checker decision status code');
  assertEqual(approved.status, 'Approved', 'checker decision status');
  assertEqual(approved.checkedBy, 'checker-local-smoke', 'checker actor');

  const evidencePackage = await getJson(
    `${baseUrl}/change-requests/${changeRequest.changeRequestId}/evidence-package`,
  );
  changeRequestEvidencePackageSchema.parse(evidencePackage);
  assertEqual(
    evidencePackage.changeRequest.changeRequestId,
    changeRequest.changeRequestId,
    'evidence package change request id',
  );
  assertEqual(evidencePackage.changeRequest.status, 'Approved', 'evidence package status');
  assertEqual(evidencePackage.sourceRun.runId, 'AR-LOCAL-SCAFFOLD-COMPLETE', 'evidence source run');
  if (!Array.isArray(evidencePackage.auditEvents) || evidencePackage.auditEvents.length < 2) {
    throw new Error('evidence package did not include submit and decision audit events');
  }
  if (!evidencePackage.proposedPatch?.targetUseCaseId) {
    throw new Error('evidence package did not include proposed mapping patch');
  }
  const blockedScopeEvidencePackage = await getJsonWithStatus(
    `${baseUrl}/change-requests/${changeRequest.changeRequestId}/evidence-package`,
    {
      'x-gmi-scope-tenants': 'tenant-without-access',
    },
  );
  assertEqual(
    blockedScopeEvidencePackage.status,
    403,
    'blocked tenant-scoped change request evidence status',
  );
  standardErrorSchema.parse(blockedScopeEvidencePackage.body);
  assertEqual(
    blockedScopeEvidencePackage.body.error.code,
    'access_denied',
    'blocked tenant-scoped change request evidence error code',
  );

  const auditEventsResponse = await getJson(
    `${baseUrl}/audit-events?changeRequestId=${changeRequest.changeRequestId}`,
  );
  auditEventsResponseSchema.parse(auditEventsResponse);
  const auditActions = auditEventsResponse.auditEvents.map((event) => event.action);
  assertIncludes(auditActions.join(','), 'change_request_submitted', 'audit submitted action');
  assertIncludes(auditActions.join(','), 'change_request_decided', 'audit decided action');
  assertEqual(
    auditEventsResponse.auditEvents.every(
      (event) => event.changeRequestId === changeRequest.changeRequestId,
    ),
    true,
    'audit event change request filter',
  );
  const blockedScopeAuditEventsResponse = await getJson(
    `${baseUrl}/audit-events?changeRequestId=${changeRequest.changeRequestId}`,
    {
      'x-gmi-scope-tenants': 'tenant-without-access',
    },
  );
  auditEventsResponseSchema.parse(blockedScopeAuditEventsResponse);
  assertEqual(
    blockedScopeAuditEventsResponse.auditEvents.length,
    0,
    'blocked tenant-scoped audit event count',
  );

  const queueAfterApproval = await getJson(`${baseUrl}/change-requests?status=PendingApproval`);
  changeRequestsResponseSchema.parse(queueAfterApproval);
  if (
    queueAfterApproval.changeRequests.some(
      (item) => item.changeRequestId === changeRequest.changeRequestId,
    )
  ) {
    throw new Error('approved change request remained in pending approval queue');
  }

  const followUpChangeRequest = await postJson(
    `${baseUrl}/templates/pending-template-maker-checker/lifecycle-change-requests`,
    {
      baseRevision: 1,
      sourceRunId: 'AR-LOCAL-SCAFFOLD-COMPLETE',
      targetLifecycleStatus: 'Retired',
      reason: 'backend smoke approved mapping advanced template revision',
    },
    {
      'idempotency-key': `backend-local-maker-checker-follow-up-${Date.now()}`,
    },
  );
  changeRequestResponseSchema.parse(followUpChangeRequest);
  assertEqual(followUpChangeRequest.status, 'Draft', 'follow-up change request status');
  assertEqual(followUpChangeRequest.baseRevision, 1, 'follow-up base revision');
}

async function verifyWorkerActivities() {
  const activities = await import('../apps/worker/dist/workflows/activities.js');
  const output = createReviewRequiredOutput();

  const routing = await activities.routeAnalysisResultActivity({
    effort: 'normal',
    output,
  });
  assertEqual(routing.decision, 'review_required', 'worker routing decision');

  const persisted = await activities.persistAnalysisResultActivity({
    runId: 'AR-BACKEND-LOCAL-SMOKE',
    output,
    routing,
  });
  assertEqual(persisted.persisted, false, 'worker local persistence flag');
  assertEqual(persisted.reason, 'missing_database_url', 'worker local persistence reason');

  const missingRunFailure = await activities.persistAnalysisFailureActivity({
    error: {
      code: 'provider_error',
      message: 'provider_error:mock-gateway:http_429:Too Many Requests',
      retryable: true,
    },
  });
  assertEqual(missingRunFailure.persisted, false, 'worker failure missing run persistence flag');
  assertEqual(missingRunFailure.reason, 'missing_run_id', 'worker failure missing run reason');

  const missingDatabaseFailure = await activities.persistAnalysisFailureActivity({
    runId: 'AR-BACKEND-LOCAL-SMOKE',
    error: {
      code: 'provider_error',
      message: 'provider_error:mock-gateway:http_429:Too Many Requests',
      retryable: true,
    },
  });
  assertEqual(
    missingDatabaseFailure.persisted,
    false,
    'worker failure missing database persistence flag',
  );
  assertEqual(
    missingDatabaseFailure.reason,
    'missing_database_url',
    'worker failure missing database reason',
  );

  const workerActivityLogs = await captureConsoleLogs(async () => {
    const maskedOutput = await activities.runTemplateAnalysisActivity({
      runId: 'AR-WORKER-LOG-SMOKE',
      templateUuid: 'tpl-worker-pii-mask-smoke',
      versionId: 'tv-worker-pii-mask-smoke-v1',
      effort: 'normal',
      rawContent:
        'Hi Jane Doe, email jane.doe@example.com or call +1 415-555-0134 about account 123456789012.',
    });
    assertIncludes(maskedOutput.extractedPattern, '{{email}}', 'worker masked email');
    assertDoesNotInclude(maskedOutput.extractedPattern, 'jane.doe@example.com', 'worker raw email');
    assertDoesNotInclude(maskedOutput.extractedPattern, '123456789012', 'worker raw account');
  });

  const activityLog = workerActivityLogs
    .map(parseJsonLog)
    .find((entry) => entry?.event === 'ai_analysis_activity');
  if (!activityLog) {
    throw new Error('worker analysis activity structured log was missing');
  }
  assertEqual(activityLog.status, 'succeeded', 'worker activity log status');
  assertEqual(activityLog.runId, 'AR-WORKER-LOG-SMOKE', 'worker activity log run id');
  assertEqual(activityLog.templateUuid, 'tpl-worker-pii-mask-smoke', 'worker activity log template uuid');
  assertEqual(activityLog.provider, 'noop', 'worker activity log provider');
  assertEqual(activityLog.modelName, 'noop-local', 'worker activity log model');
  assertEqual(typeof activityLog.durationMs, 'number', 'worker activity log duration');
  assertDoesNotInclude(workerActivityLogs.join('\n'), 'jane.doe@example.com', 'worker activity log raw email');
  assertDoesNotInclude(workerActivityLogs.join('\n'), '123456789012', 'worker activity log raw account');
}

async function verifyOpenAICompatibleAdapter() {
  let requestedUrl = '';
  let requestedBody;
  let requestedSignal;

  const adapter = new OpenAICompatibleChatAnalysisAdapter({
    baseUrl: 'http://mock-provider.example/v1/',
    apiKey: 'mock-api-key',
    model: 'mock-model',
    providerName: 'mock-gateway',
    extraBody: {
      thinking: {
        type: 'enabled',
      },
      reasoning_effort: 'high',
    },
    fetchImpl: async (url, init) => {
      requestedUrl = String(url);
      requestedBody = JSON.parse(String(init?.body));
      requestedSignal = init?.signal;

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(createReviewRequiredOutput()),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const output = await adapter.analyzeTemplate({
    templateUuid: 'TPL-OPENAI-COMPATIBLE-SMOKE',
    versionId: 'tv-openai-compatible-smoke',
    maskedContent: 'Hello {{name}}, your OTP is {{otp}}.',
    approvedContext: ['Use case: authentication servicing messages.'],
    effort: 'normal',
  });

  assertEqual(
    requestedUrl,
    'http://mock-provider.example/v1/chat/completions',
    'openai-compatible provider URL',
  );
  assertEqual(requestedBody.model, 'mock-model', 'openai-compatible model');
  assertEqual(
    requestedSignal instanceof AbortSignal,
    true,
    'openai-compatible request abort signal',
  );
  assertEqual(
    requestedBody.thinking?.type,
    'enabled',
    'openai-compatible extra thinking',
  );
  assertEqual(
    requestedBody.reasoning_effort,
    'high',
    'openai-compatible extra reasoning effort',
  );
  assertEqual(output.aiMessageType, 'Authentication', 'openai-compatible output parse');

  const metadata = getAiProviderRuntimeMetadata({
    AI_PROVIDER: 'openai-compatible',
    OPENAI_COMPATIBLE_PROVIDER_NAME: 'mock-gateway',
    OPENAI_COMPATIBLE_MODEL: 'mock-model',
  });
  assertEqual(metadata.provider, 'openai-compatible', 'openai-compatible metadata provider');
  assertEqual(metadata.modelName, 'mock-gateway:mock-model', 'openai-compatible metadata model');

  let retryAttempts = 0;
  const retryingAdapter = new OpenAICompatibleChatAnalysisAdapter({
    baseUrl: 'http://mock-provider.example/v1',
    apiKey: 'mock-api-key',
    model: 'mock-model',
    providerName: 'mock-gateway',
    maxRetries: 1,
    fetchImpl: async () => {
      retryAttempts += 1;

      if (retryAttempts === 1) {
        return new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
          statusText: 'Too Many Requests',
        });
      }

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(createReviewRequiredOutput()),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  await retryingAdapter.analyzeTemplate({
    templateUuid: 'TPL-OPENAI-COMPATIBLE-RETRY-SMOKE',
    versionId: 'tv-openai-compatible-retry-smoke',
    maskedContent: 'Hello {{name}}, your OTP is {{otp}}.',
    approvedContext: [],
    effort: 'normal',
  });
  assertEqual(retryAttempts, 2, 'openai-compatible retry attempts');

  let nonRetryAttempts = 0;
  const nonRetryingAdapter = new OpenAICompatibleChatAnalysisAdapter({
    baseUrl: 'http://mock-provider.example/v1',
    apiKey: 'mock-api-key',
    model: 'mock-model',
    providerName: 'mock-gateway',
    maxRetries: 2,
    fetchImpl: async () => {
      nonRetryAttempts += 1;

      return new Response(JSON.stringify({ error: 'bad_request' }), {
        status: 400,
        statusText: 'Bad Request',
      });
    },
  });

  await assertRejectsWith(
    () =>
      nonRetryingAdapter.analyzeTemplate({
        templateUuid: 'TPL-OPENAI-COMPATIBLE-NON-RETRY-SMOKE',
        versionId: 'tv-openai-compatible-non-retry-smoke',
        maskedContent: 'Hello {{name}}, your OTP is {{otp}}.',
        approvedContext: [],
        effort: 'normal',
      }),
    'provider_error',
    'openai-compatible non-retry provider error',
  );
  assertEqual(nonRetryAttempts, 1, 'openai-compatible non-retry attempts');
}

function createReviewRequiredOutput() {
  return {
    extractedPattern: 'Hello {{name}}, your OTP is {{otp}}.',
    placeholders: [
      {
        token: '{{name}}',
        type: 'name',
        confidence: 80,
      },
      {
        token: '{{otp}}',
        type: 'otp',
        confidence: 95,
      },
    ],
    aiMessageType: 'Authentication',
    governanceClassificationSuggestion: 'Servicing',
    overallConfidence: 80,
    qualityScore: 75,
    candidateMatches: [],
    anomalies: ['backend_local_smoke'],
    businessExplanation: ['Smoke output should require review because confidence is low.'],
    technicalEvidence: ['Generated by scripts/verify-backend-local.mjs.'],
  };
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        if (!response.headers.get('x-request-id')) {
          throw new Error('health response request id header was missing');
        }
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

async function getJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      ...defaultAuthHeaders(),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function getJsonWithStatus(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      ...defaultAuthHeaders(),
      ...headers,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function postJson(url, body, headers = {}) {
  return (await postJsonWithStatus(url, body, headers)).body;
}

async function postJsonWithStatus(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...defaultAuthHeaders(),
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${url} returned ${response.status}: ${await response.text()}`);
  }

  return {
    status: response.status,
    body: await response.json(),
  };
}

function defaultAuthHeaders() {
  return {
    'x-actor-id': 'backend-local-smoke',
    'x-gmi-roles': 'analysis_runner,change_maker,change_checker,auditor',
  };
}

async function waitForCondition(predicate, options) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < (options.timeoutMs ?? 2_000)) {
    if (predicate()) {
      return;
    }
    await sleep(25);
  }

  throw new Error(`${options.label} was not observed within timeout.\nOutput:\n${apiOutput}`);
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

function assertDoesNotInclude(value, forbidden, label) {
  if (value.includes(forbidden)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} not to include ${forbidden}`);
  }
}

async function captureConsoleLogs(fn) {
  const originalLog = console.log;
  const logs = [];
  console.log = (...args) => {
    logs.push(args.map(String).join(' '));
  };

  try {
    await fn();
  } finally {
    console.log = originalLog;
  }

  return logs;
}

function parseJsonLog(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function assertRejectsWith(fn, expectedMessage, label) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.includes(expectedMessage)) {
      throw new Error(`${label}: expected rejection to include ${expectedMessage}, got ${message}`);
    }

    return;
  }

  throw new Error(`${label}: expected rejection`);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
