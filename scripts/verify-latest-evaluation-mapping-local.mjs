import { mapLatestEvaluationRowsToResponse } from '@gmi/db';

const response = mapLatestEvaluationRowsToResponse({
  evaluation: {
    evaluation_id: 'EVAL-SMOKE',
    evaluation_suite: 'template-analysis-golden',
    pipeline_version: 'template-analysis-pipeline@local',
    prompt_version: 'template-analysis-agent@replay',
    model_provider: 'replay',
    model_name: 'replay-golden-fixtures',
    ruleset_version: 'messaging-governance-rules@local',
    dataset_version: 'golden-template-analysis@2026.06.27',
    metrics_json: {
      caseCount: 7,
      schemaPassRate: 1,
      classificationAccuracy: 1,
      routingAccuracy: 1,
      placeholderRecall: 1,
    },
    thresholds_json: {
      minCaseCount: 6,
      minSchemaPassRate: 1,
      minClassificationAccuracy: 1,
      minRoutingAccuracy: 1,
      minPlaceholderRecall: 1,
    },
    verdict: 'pass',
    report_ref: null,
    created_at: new Date('2026-06-28T00:00:00.000Z'),
  },
  release: {
    release_id: 'REL-SMOKE',
    status: 'ReadyForPromotion',
    promotion_allowed: true,
    requested_by: 'local-smoke',
    pipeline_version: 'template-analysis-pipeline@local',
    prompt_version: 'template-analysis-agent@replay',
    model_provider: 'replay',
    model_name: 'replay-golden-fixtures',
    ruleset_version: 'messaging-governance-rules@local',
    evaluation_suite: 'template-analysis-golden',
    dataset_version: 'golden-template-analysis@2026.06.27',
    evaluation_mode: 'replay',
    evaluation_verdict: 'pass',
    metrics_json: {
      caseCount: 7,
      schemaPassRate: 1,
      classificationAccuracy: 1,
      routingAccuracy: 1,
      placeholderRecall: 1,
    },
    thresholds_json: {
      minCaseCount: 6,
      minSchemaPassRate: 1,
      minClassificationAccuracy: 1,
      minRoutingAccuracy: 1,
      minPlaceholderRecall: 1,
    },
    failure_case_ids_json: [],
    evidence_hash: 'sha256:abc123',
    evidence_json: {},
    created_at: new Date('2026-06-28T00:00:00.000Z'),
  },
});

assertEqual(response.evaluation.suite, 'template-analysis-golden', 'suite');
assertEqual(response.evaluation.mode, 'replay', 'mode');
assertEqual(response.evaluation.verdict, 'pass', 'verdict');
assertEqual(response.evaluation.metrics.caseCount, 7, 'case count');
assertEqual(response.release.status, 'ReadyForPromotion', 'release status');
assertEqual(response.release.evidenceHash, 'sha256:abc123', 'evidence hash');

console.log('Latest evaluation mapping local smoke passed.');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
