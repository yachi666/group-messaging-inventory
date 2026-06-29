import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
  verifyPipelineReleaseEvidence,
} from '@gmi/evals';

const report = await runGoldenTemplateEvaluation();
const releaseEvidence = createPipelineReleaseEvidence(report, {
  releaseId: 'REL-LOCAL-SMOKE',
  pipelineVersion: 'template-analysis-pipeline@local',
  promptVersion: 'template-analysis-agent@replay',
  modelProvider: 'replay',
  modelName: 'replay-golden-fixtures',
  rulesetVersion: 'messaging-governance-rules@local',
  requestedBy: 'release-smoke',
});

assertEqual(releaseEvidence.promotionAllowed, true, 'passing eval promotion flag');
assertEqual(releaseEvidence.status, 'ReadyForPromotion', 'passing eval status');
assertEqual(releaseEvidence.evaluation.suite, report.suite, 'release evaluation suite');
assertEqual(releaseEvidence.evaluation.verdict, 'pass', 'release evaluation verdict');
assertEqual(
  verifyPipelineReleaseEvidence(releaseEvidence),
  true,
  'passing release evidence hash',
);

const failedReleaseEvidence = createPipelineReleaseEvidence(
  {
    ...report,
    verdict: 'fail',
    metrics: {
      ...report.metrics,
      classificationAccuracy: 0.5,
    },
  },
  {
    releaseId: 'REL-LOCAL-SMOKE-FAIL',
    pipelineVersion: 'template-analysis-pipeline@local',
    promptVersion: 'template-analysis-agent@replay',
    modelProvider: 'replay',
    modelName: 'replay-golden-fixtures',
    rulesetVersion: 'messaging-governance-rules@local',
    requestedBy: 'release-smoke',
  },
);

assertEqual(failedReleaseEvidence.promotionAllowed, false, 'failing eval promotion flag');
assertEqual(failedReleaseEvidence.status, 'BlockedByEvaluation', 'failing eval status');
assertEqual(
  verifyPipelineReleaseEvidence(failedReleaseEvidence),
  true,
  'failing release evidence hash',
);

console.log(
  `Release gate local smoke passed. releaseId=${releaseEvidence.releaseId}, status=${releaseEvidence.status}`,
);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
