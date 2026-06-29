import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';
import {
  createPostgresDatabase,
  createPostgresPool,
  getLatestAnalysisEvaluation,
  migratePostgresDatabase,
  recordAnalysisEvaluation,
  recordPipelineReleaseEvidence,
} from '@gmi/db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://gmi:gmi@127.0.0.1:55432/gmi';
const releaseId = `REL-PG-SMOKE-${Date.now()}`;
const pipelineVersion = `template-analysis-pipeline@pg-smoke-${Date.now()}`;
const promptVersion = 'template-analysis-agent@replay';
const modelProvider = 'replay';
const modelName = 'replay-golden-fixtures';
const rulesetVersion = 'messaging-governance-rules@local';

const pool = createPostgresPool({ connectionString: databaseUrl });
const db = createPostgresDatabase(pool);

try {
  await migratePostgresDatabase(db);

  const report = await runGoldenTemplateEvaluation();

  if (report.verdict !== 'pass') {
    throw new Error(`Release persistence pg smoke requires a passing report, got ${report.verdict}`);
  }

  const recordedEvaluation = await recordAnalysisEvaluation(db, {
    evaluationSuite: report.suite,
    pipelineVersion,
    promptVersion,
    modelProvider,
    modelName,
    rulesetVersion,
    datasetVersion: report.datasetVersion,
    metrics: report.metrics,
    thresholds: report.thresholds,
    verdict: report.verdict,
    reportRef: `pg-smoke:${releaseId}`,
  });

  const evidence = createPipelineReleaseEvidence(report, {
    releaseId,
    pipelineVersion,
    promptVersion,
    modelProvider,
    modelName,
    rulesetVersion,
    requestedBy: 'release-persistence-pg-smoke',
  });
  const recordedRelease = await recordPipelineReleaseEvidence(db, evidence);
  const latest = await getLatestAnalysisEvaluation(db);

  if (!latest) {
    throw new Error('Expected latest analysis evaluation to be available after pg smoke writes.');
  }

  assertEqual(latest.evaluation.suite, report.suite, 'latest evaluation suite');
  assertEqual(latest.evaluation.datasetVersion, report.datasetVersion, 'latest dataset version');
  assertEqual(latest.evaluation.verdict, 'pass', 'latest verdict');
  assertEqual(latest.evaluation.metrics.caseCount, report.metrics.caseCount, 'latest case count');
  assertEqual(latest.release.releaseId, releaseId, 'latest release id');
  assertEqual(latest.release.status, 'ReadyForPromotion', 'latest release status');
  assertEqual(latest.release.promotionAllowed, true, 'latest promotion flag');
  assertEqual(latest.release.evidenceHash, evidence.evidenceHash, 'latest evidence hash');
  assertEqual(
    latest.release.pipeline.pipelineVersion,
    pipelineVersion,
    'latest pipeline version',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        evaluationId: recordedEvaluation.evaluationId,
        releaseId: recordedRelease.releaseId,
        evidenceHash: recordedRelease.evidenceHash,
        verdict: latest.evaluation.verdict,
        promotionAllowed: latest.release.promotionAllowed,
      },
      null,
      2,
    ),
  );
} finally {
  await db.destroy();
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
