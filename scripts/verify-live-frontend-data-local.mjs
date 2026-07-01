import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'apps/web/src/features/dashboard/DashboardPage.tsx',
    forbidden: ['../../data/governanceMock', 'governanceMock'],
    required: ['useProductInventory'],
  },
  {
    file: 'apps/web/src/features/governance/GovernancePages.tsx',
    forbidden: ['../../data/governanceMock', 'fetchAuditEvents', 'fallbackAuditEvents'],
    required: ['useProductInventory'],
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
