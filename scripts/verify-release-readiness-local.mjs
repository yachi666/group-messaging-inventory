import {
  createPipelineReleaseEvidence,
  evaluateReleaseReadiness,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';

const report = await runGoldenTemplateEvaluation();
const releaseEvidence = createPipelineReleaseEvidence(report, {
  releaseId: 'REL-READINESS-SMOKE',
  pipelineVersion: 'template-analysis-pipeline@readiness-smoke',
  promptVersion: 'template-analysis-agent@readiness-smoke',
  modelProvider: 'replay',
  modelName: 'replay-golden-fixtures',
  rulesetVersion: 'messaging-governance-rules@local',
  requestedBy: 'release-readiness-smoke',
  createdAt: '2026-06-30T00:00:00.000Z',
});

const passingResponse = toLatestResponse({
  report,
  releaseEvidence,
  persisted: true,
});
const passingReadiness = evaluateReleaseReadiness(passingResponse, {
  requirePersistedEvidence: true,
  expectedPipelineVersion: releaseEvidence.pipeline.pipelineVersion,
  expectedPromptVersion: releaseEvidence.pipeline.promptVersion,
  expectedModelProvider: releaseEvidence.pipeline.modelProvider,
  expectedModelName: releaseEvidence.pipeline.modelName,
  expectedRulesetVersion: releaseEvidence.pipeline.rulesetVersion,
  expectedDatasetVersion: report.datasetVersion,
  minCaseCount: report.thresholds.minCaseCount,
});

assertEqual(passingReadiness.ready, true, 'passing readiness');
assertEqual(passingReadiness.failures.length, 0, 'passing failures');

const failedReport = {
  ...report,
  verdict: 'fail',
  metrics: {
    ...report.metrics,
    routingAccuracy: 0.5,
  },
  cases: report.cases.map((testCase, index) =>
    index === 0 ? { ...testCase, failures: ['routing_mismatch'] } : testCase,
  ),
};
const failedReleaseEvidence = createPipelineReleaseEvidence(failedReport, {
  ...releaseEvidence.pipeline,
  releaseId: 'REL-READINESS-SMOKE-FAIL',
  requestedBy: 'release-readiness-smoke',
  createdAt: '2026-06-30T00:00:00.000Z',
});
const failedReadiness = evaluateReleaseReadiness(
  toLatestResponse({
    report: failedReport,
    releaseEvidence: failedReleaseEvidence,
    persisted: true,
  }),
  {
    requirePersistedEvidence: true,
  },
);

assertEqual(failedReadiness.ready, false, 'failed readiness');
assertIncludes(failedReadiness.failures, 'evaluation verdict must be pass');
assertIncludes(failedReadiness.failures, 'release status must be ReadyForPromotion');
assertIncludes(failedReadiness.failures, 'release promotionAllowed must be true');
assertIncludes(failedReadiness.failures, 'routingAccuracy below threshold');
assertIncludes(failedReadiness.failures, 'evaluation has failed cases');

const fallbackReadiness = evaluateReleaseReadiness(
  toLatestResponse({
    report,
    releaseEvidence,
    persisted: false,
  }),
  {
    requirePersistedEvidence: true,
  },
);
assertEqual(fallbackReadiness.ready, false, 'fallback readiness');
assertIncludes(fallbackReadiness.failures, 'release evidence must be persisted');

const mismatchReadiness = evaluateReleaseReadiness(passingResponse, {
  expectedPipelineVersion: 'template-analysis-pipeline@other',
});
assertEqual(mismatchReadiness.ready, false, 'mismatch readiness');
assertIncludes(mismatchReadiness.failures, 'pipelineVersion must be');

console.log(
  JSON.stringify(
    {
      status: 'ok',
      releaseId: passingReadiness.summary.releaseId,
      evidenceHash: passingReadiness.summary.evidenceHash,
      negativeCases: {
        failedEvaluation: failedReadiness.failures.length,
        unpersistedEvidence: fallbackReadiness.failures.length,
        versionMismatch: mismatchReadiness.failures.length,
      },
    },
    null,
    2,
  ),
);

function toLatestResponse({ report, releaseEvidence, persisted }) {
  return {
    source: {
      kind: persisted ? 'postgres' : 'replay_fallback',
      persisted,
      generatedAt: releaseEvidence.createdAt,
    },
    evaluation: {
      suite: report.suite,
      datasetVersion: report.datasetVersion,
      mode: report.mode,
      verdict: report.verdict,
      metrics: report.metrics,
      thresholds: report.thresholds,
      failedCaseIds: report.cases
        .filter((testCase) => testCase.failures.length > 0)
        .map((testCase) => testCase.id),
    },
    release: {
      releaseId: releaseEvidence.releaseId,
      status: releaseEvidence.status,
      promotionAllowed: releaseEvidence.promotionAllowed,
      evidenceHash: releaseEvidence.evidenceHash,
      pipeline: releaseEvidence.pipeline,
    },
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(values, expectedSnippet) {
  if (!values.some((value) => value.includes(expectedSnippet))) {
    throw new Error(
      `Expected failures to include ${JSON.stringify(expectedSnippet)}, got ${JSON.stringify(values)}`,
    );
  }
}
