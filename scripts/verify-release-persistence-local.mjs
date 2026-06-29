import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';
import { mapPipelineReleaseEvidenceToRecord } from '@gmi/db';

const report = await runGoldenTemplateEvaluation();
const evidence = createPipelineReleaseEvidence(report, {
  releaseId: 'REL-PERSISTENCE-SMOKE',
  pipelineVersion: 'template-analysis-pipeline@local',
  promptVersion: 'template-analysis-agent@replay',
  modelProvider: 'replay',
  modelName: 'replay-golden-fixtures',
  rulesetVersion: 'messaging-governance-rules@local',
  requestedBy: 'release-persistence-smoke',
  createdAt: '2026-06-28T00:00:00.000Z',
});
const record = mapPipelineReleaseEvidenceToRecord(evidence);

assertEqual(record.releaseId, evidence.releaseId, 'release id');
assertEqual(record.status, 'ReadyForPromotion', 'release status');
assertEqual(record.promotionAllowed, true, 'promotion flag');
assertEqual(record.evidenceHash, evidence.evidenceHash, 'evidence hash');
assertEqual(record.evaluationSuite, 'template-analysis-golden', 'evaluation suite');
assertEqual(record.pipelineVersion, 'template-analysis-pipeline@local', 'pipeline version');

console.log(`Release persistence local smoke passed. releaseId=${record.releaseId}`);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
