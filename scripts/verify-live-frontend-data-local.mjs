import { existsSync, readFileSync } from 'node:fs';

const governanceDetailFixture = JSON.parse(
  readFileSync('scripts/fixtures/governance-detail-live-data.json', 'utf8'),
);

const removedMockFiles = [
  'apps/web/src/data/governanceMock.ts',
  'apps/web/src/data/mockInventory.ts',
  'apps/web/src/features/ai-analysis/analysisData.ts',
];

const checks = [
  {
    file: 'apps/web/src/features/dashboard/DashboardPage.tsx',
    forbidden: ['../../data/governanceMock', 'governanceMock', 'monthlyTraffic = [', 'yearlyTraffic = [', '12.4 - index'],
    required: ['useProductInventory', 'coverageFlow', 'matchedShare'],
  },
  {
    file: 'apps/web/src/features/statistics/GeneralStatisticsPage.tsx',
    forbidden: ['const cities = [', 'const metrics = [', '2431340', '2080000', '126000'],
    required: ['useProductInventory', 'governanceTemplates', 'dashboardMetrics'],
  },
  {
    file: 'apps/web/src/features/governance/GovernancePages.tsx',
    forbidden: ['../../data/governanceMock', 'fetchAuditEvents', 'fallbackAuditEvents', '[42, 48, 55, 61, 58, 67, 74, 82]', ...governanceDetailFixture.forbiddenStaticEvidence],
    required: ['useProductInventory', 'coverageFlow', ...governanceDetailFixture.requiredLiveMarkers],
  },
  {
    file: 'apps/web/src/features/workspace/ProductWorkspace.tsx',
    forbidden: ['../../data/mockInventory', 'fetchAuditEvents', 'csvUploadJob,', 'policyControls,'],
    required: ['useProductInventory'],
  },
  {
    file: 'apps/web/src/features/review-queue/ReviewQueuePage.tsx',
    forbidden: ['../../data/governanceMock', 'fallbackQueueItems', 'Showing local mock approvals'],
    required: ['useProductInventory'],
  },
  {
    file: 'apps/web/src/features/ai-analysis/AiTemplateAnalysisPage.tsx',
    forbidden: ['initialAnalysisResults', 'getFallbackAnalysisResults', 'getFallbackLatestAnalysisEvaluation', "'mock'"],
    required: ["useState<ReadonlyArray<AiTemplateAnalysisResult>>([])", "dataSource === 'api' ? 'API' : 'Unavailable'"],
  },
  {
    file: 'apps/api/src/modules/analysis-runs/analysis-runs.controller.ts',
    forbidden: [],
    required: ["@Get('product-inventory')", 'getProductInventory'],
  },
];

const failures = [];

for (const file of removedMockFiles) {
  if (existsSync(file)) {
    failures.push(`${file} should not exist; frontend must use live API projections.`);
  }
}

for (const check of checks) {
  const source = readFileSync(check.file, 'utf8');

  for (const forbidden of check.forbidden) {
    if (source.includes(forbidden)) {
      failures.push(`${check.file} still contains forbidden live-data fallback marker: ${forbidden}`);
    }
  }

  for (const required of check.required) {
    if (!source.includes(required)) {
      failures.push(`${check.file} is missing required live-data marker: ${required}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Frontend live-data wiring verified.');
