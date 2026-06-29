import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

const webPackageJson = JSON.parse(
  await readFile(path.join(repoRoot, 'apps/web/package.json'), 'utf8'),
);
const analysisApi = await readFile(
  path.join(repoRoot, 'apps/web/src/features/ai-analysis/analysisApi.ts'),
  'utf8',
);
const aiTemplateAnalysisPage = await readFile(
  path.join(repoRoot, 'apps/web/src/features/ai-analysis/AiTemplateAnalysisPage.tsx'),
  'utf8',
);
const changeRequestApi = await readFile(
  path.join(repoRoot, 'apps/web/src/features/review-queue/changeRequestApi.ts'),
  'utf8',
);
const reviewTaskApi = await readFile(
  path.join(repoRoot, 'apps/web/src/features/review-queue/reviewTaskApi.ts'),
  'utf8',
);
const reviewQueuePage = await readFile(
  path.join(repoRoot, 'apps/web/src/features/review-queue/ReviewQueuePage.tsx'),
  'utf8',
);
const auditApi = await readFile(
  path.join(repoRoot, 'apps/web/src/features/workspace/auditApi.ts'),
  'utf8',
);
const apiClient = await readFile(
  path.join(repoRoot, 'apps/web/src/lib/apiClient.ts'),
  'utf8',
);

const dependencies = {
  ...webPackageJson.dependencies,
  ...webPackageJson.devDependencies,
};

if (dependencies['@gmi/contracts'] !== '0.1.0') {
  throw new Error('apps/web must depend on @gmi/contracts for API response validation.');
}

for (const expectedSchema of [
  'aiTemplateAnalysisResultsResponseSchema',
  'latestAnalysisEvaluationResponseSchema',
  'submitAnalysisRunResponseSchema',
  'analysisRunResponseSchema',
]) {
  if (!analysisApi.includes(expectedSchema)) {
    throw new Error(`analysisApi.ts must parse API responses with ${expectedSchema}.`);
  }
}

for (const expectedSource of [
  'submitTemplateReanalysisRun',
  'fetchAnalysisRun',
  "roles: ['analysis_runner']",
  "roles: ['analysis_reader']",
]) {
  if (!analysisApi.includes(expectedSource)) {
    throw new Error(`analysisApi.ts must keep the API-backed analysis run flow: ${expectedSource}`);
  }
}

for (const expectedSource of [
  'data-testid="analysis-run-reanalysis"',
  'data-testid="analysis-run-status"',
  'data-testid="analysis-policy-decision"',
  'submitTemplateReanalysisRun({',
  'fetchAnalysisRun(submittedRun.runId)',
]) {
  if (!aiTemplateAnalysisPage.includes(expectedSource)) {
    throw new Error(`AiTemplateAnalysisPage.tsx must keep the API-backed re-analysis flow: ${expectedSource}`);
  }
}

if (analysisApi.includes('as AnalysisResultsResponse')) {
  throw new Error('analysisApi.ts must not cast analysis results before schema parsing.');
}

if (analysisApi.includes('as LatestAnalysisEvaluation')) {
  throw new Error('analysisApi.ts must not cast latest evaluation before schema parsing.');
}

if (!auditApi.includes('auditEventsResponseSchema')) {
  throw new Error('auditApi.ts must parse API responses with auditEventsResponseSchema.');
}

if (auditApi.includes('as AuditEventsResponse')) {
  throw new Error('auditApi.ts must not cast audit events before schema parsing.');
}

if (!reviewTaskApi.includes('reviewTasksResponseSchema')) {
  throw new Error('reviewTaskApi.ts must parse API responses with reviewTasksResponseSchema.');
}

if (!reviewTaskApi.includes('/review-tasks?status=Open&objectType=template&limit=100')) {
  throw new Error('reviewTaskApi.ts must call the filtered review task API.');
}

if (reviewTaskApi.includes('as ReviewTask')) {
  throw new Error('reviewTaskApi.ts must not cast review tasks before schema parsing.');
}

for (const expectedSchema of [
  'changeRequestsResponseSchema',
  'changeRequestResponseSchema',
  'changeRequestEvidencePackageSchema',
]) {
  if (!changeRequestApi.includes(expectedSchema)) {
    throw new Error(`changeRequestApi.ts must parse API responses with ${expectedSchema}.`);
  }
}

if (changeRequestApi.includes('as ChangeRequest')) {
  throw new Error('changeRequestApi.ts must not cast change requests before schema parsing.');
}

for (const expectedApiPath of [
  '/change-requests?status=PendingApproval',
  '/change-requests/${encodeURIComponent(input.changeRequestId)}/decision',
  '/change-requests/${encodeURIComponent(changeRequestId)}/evidence-package',
]) {
  if (!changeRequestApi.includes(expectedApiPath)) {
    throw new Error(`changeRequestApi.ts must call ${expectedApiPath}.`);
  }
}

for (const expectedSource of [
  'fetchOpenReviewTasks(controller.signal)',
  'tasks.map(toQueueItem)',
  'Review task API unavailable. Showing local discovery queue.',
  'data-testid="review-task-refresh"',
  'fetchPendingChangeRequests(controller.signal)',
  'changeRequests.map(toApprovalItem)',
  'isApiBacked: true',
  'await decideChangeRequest({',
  'await fetchChangeRequestEvidencePackage(selected.id)',
]) {
  if (!reviewQueuePage.includes(expectedSource)) {
    throw new Error(`ReviewQueuePage.tsx must keep the API-backed governance approval path: ${expectedSource}`);
  }
}

if (!reviewQueuePage.includes('Approval API unavailable. Showing local mock approvals.')) {
  throw new Error('ReviewQueuePage.tsx should keep the local mock fallback message explicit.');
}

for (const [fileName, source] of [
  ['analysisApi.ts', analysisApi],
  ['changeRequestApi.ts', changeRequestApi],
  ['reviewTaskApi.ts', reviewTaskApi],
  ['auditApi.ts', auditApi],
]) {
  if (!source.includes('apiFetch')) {
    throw new Error(`${fileName} must use the shared apiFetch helper for API requests.`);
  }
  if (source.includes('VITE_API_BASE_URL')) {
    throw new Error(`${fileName} must not duplicate API base URL handling.`);
  }
  if (source.includes('x-gmi-roles')) {
    throw new Error(`${fileName} must not hand-roll governance role headers.`);
  }
}

for (const expected of ['VITE_API_BASE_URL', 'x-gmi-roles', 'x-actor-id']) {
  if (!apiClient.includes(expected)) {
    throw new Error(`apiClient.ts must centralize ${expected}.`);
  }
}

console.log('Web contract client local smoke passed.');
