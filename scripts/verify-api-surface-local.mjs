import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifestPath = resolve(root, 'docs/api/template-analysis-api.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const analysisController = read('apps/api/src/modules/analysis-runs/analysis-runs.controller.ts');
const evaluationsController = read(
  'apps/api/src/modules/analysis-evaluations/analysis-evaluations.controller.ts',
);
const healthController = read('apps/api/src/modules/health.controller.ts');
const contracts = read('packages/contracts/src/index.ts');

const expectedEndpointCount = 18;

assertEqual(manifest.service, 'group-messaging-inventory-api', 'manifest service');
assertEqual(manifest.basePath, '/', 'manifest basePath');
assertEqual(manifest.endpoints.length, expectedEndpointCount, 'manifest endpoint count');
assertSourceContains(
  contracts,
  "kind: z.enum(['postgres', 'replay_fallback'])",
  'latest evaluation source provenance schema',
);
assertSourceContains(
  contracts,
  'assignedTo: z.string().min(1).optional()',
  'review task reviewer filter schema',
);

const operationIds = new Set();
for (const endpoint of manifest.endpoints) {
  assertUnique(operationIds, endpoint.operationId, 'operationId');
  assertIncludes(['GET', 'POST'], endpoint.method, `${endpoint.operationId} method`);
  assertEqual(endpoint.path.startsWith('/'), true, `${endpoint.operationId} path prefix`);
  assertEqual(Number.isInteger(endpoint.status), true, `${endpoint.operationId} status integer`);

  if (endpoint.request?.endsWith('Schema')) {
    assertSourceContains(contracts, `export const ${endpoint.request}`, `${endpoint.operationId} request schema`);
  }

  if (endpoint.response?.endsWith('Schema')) {
    assertSourceContains(
      contracts,
      `export const ${endpoint.response}`,
      `${endpoint.operationId} response schema`,
    );
  }
}

assertEndpoint('getHealth', healthController, {
  decorator: "@Get('health')",
  roles: [],
  status: 200,
});
assertEndpoint('getReadiness', healthController, {
  decorator: "@Get('ready')",
  roles: [],
  status: 200,
});
assertEndpoint('submitAnalysisRun', analysisController, {
  decorator: "@Post('template-versions/:versionId/analysis-runs')",
  roles: ['analysis_runner'],
  status: 202,
  requestSchema: 'submitAnalysisRunSchema',
});
assertEndpoint('getAnalysisRun', analysisController, {
  decorator: "@Get('analysis-runs/:runId')",
  roles: ['analysis_reader', 'analysis_runner', 'auditor'],
  status: 200,
});
assertEndpoint('confirmAnalysisRun', analysisController, {
  decorator: "@Post('analysis-runs/:runId/confirm')",
  roles: ['analysis_reader', 'analysis_runner'],
  status: 200,
});
assertEndpoint('listAnalysisResults', analysisController, {
  decorator: "@Get('templates/analysis-results')",
  roles: ['analysis_reader', 'analysis_runner', 'auditor'],
  status: 200,
});
assertEndpoint('listReviewTasks', analysisController, {
  decorator: "@Get('review-tasks')",
  roles: ['analysis_reader', 'analysis_runner', 'auditor'],
  status: 200,
  requestSchema: 'listReviewTasksQuerySchema',
});
assertEndpoint('transitionReviewTask', analysisController, {
  decorator: "@Post('review-tasks/:taskId/transition')",
  roles: ['analysis_runner', 'change_checker'],
  status: 200,
  requestSchema: 'transitionReviewTaskSchema',
});
assertEndpoint('listChangeRequests', analysisController, {
  decorator: "@Get('change-requests')",
  roles: ['change_maker', 'change_checker', 'auditor'],
  status: 200,
  requestSchema: 'listChangeRequestsQuerySchema',
});
assertEndpoint('listAuditEvents', analysisController, {
  decorator: "@Get('audit-events')",
  roles: ['change_checker', 'auditor'],
  status: 200,
  requestSchema: 'listAuditEventsQuerySchema',
});
assertEndpoint('getChangeRequestEvidencePackage', analysisController, {
  decorator: "@Get('change-requests/:changeRequestId/evidence-package')",
  roles: ['change_checker', 'auditor'],
  status: 200,
});
assertEndpoint('createMappingChangeRequest', analysisController, {
  decorator: "@Post('templates/:templateUuid/mapping-change-requests')",
  roles: ['change_maker'],
  status: 201,
  requestSchema: 'createMappingChangeRequestSchema',
});
assertEndpoint('createLifecycleChangeRequest', analysisController, {
  decorator: "@Post('templates/:templateUuid/lifecycle-change-requests')",
  roles: ['change_maker'],
  status: 201,
  requestSchema: 'createLifecycleChangeRequestSchema',
});
assertEndpoint('createCurrentVersionChangeRequest', analysisController, {
  decorator: "@Post('template-versions/:versionId/current-version-change-requests')",
  roles: ['change_maker'],
  status: 201,
  requestSchema: 'createCurrentVersionChangeRequestSchema',
});
assertEndpoint('submitChangeRequest', analysisController, {
  decorator: "@Post('change-requests/:changeRequestId/submit')",
  roles: ['change_maker'],
  status: 200,
  requestSchema: 'submitChangeRequestSchema',
});
assertEndpoint('decideChangeRequest', analysisController, {
  decorator: "@Post('change-requests/:changeRequestId/decision')",
  roles: ['change_checker'],
  status: 200,
  requestSchema: 'decideChangeRequestSchema',
});
assertEndpoint('getLatestEvaluation', evaluationsController, {
  decorator: "@Get('latest')",
  roles: ['analysis_reader', 'analysis_runner', 'auditor'],
  status: 200,
});
assertEndpoint('recordReleaseEvidence', evaluationsController, {
  decorator: "@Post('release-evidence')",
  roles: ['change_checker', 'auditor'],
  status: 201,
  requestSchema: 'recordPipelineReleaseEvidenceSchema',
});

console.log('API surface local smoke passed.');

function assertEndpoint(operationId, source, expected) {
  const endpoint = manifest.endpoints.find((candidate) => candidate.operationId === operationId);

  if (!endpoint) {
    throw new Error(`Missing endpoint manifest entry: ${operationId}`);
  }

  assertSourceContains(source, expected.decorator, `${operationId} route decorator`);
  assertEqual(endpoint.status, expected.status, `${operationId} manifest status`);

  if (expected.status === 202) {
    assertSourceContains(source, '@HttpCode(HttpStatus.ACCEPTED)', `${operationId} accepted status`);
  } else if (expected.status === 200 && endpoint.method === 'POST') {
    assertSourceContains(source, '@HttpCode(HttpStatus.OK)', `${operationId} ok status`);
  }

  if (expected.roles.length > 0) {
    assertSourceContains(
      source,
      `@RequiresRoles(${expected.roles.map((role) => `'${role}'`).join(', ')})`,
      `${operationId} roles`,
    );
  }

  assertEqual(
    JSON.stringify(endpoint.roles),
    JSON.stringify(expected.roles),
    `${operationId} manifest roles`,
  );

  if (expected.requestSchema) {
    assertSourceContains(source, `${expected.requestSchema}.parse`, `${operationId} request parser`);
  }
}

function read(path) {
  return readFileSync(resolve(root, path), 'utf8');
}

function assertUnique(set, value, label) {
  if (set.has(value)) {
    throw new Error(`Duplicate ${label}: ${value}`);
  }
  set.add(value);
}

function assertSourceContains(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: expected source to include ${expected}`);
  }
}

function assertIncludes(values, value, label) {
  if (!values.includes(value)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to be in ${JSON.stringify(values)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
