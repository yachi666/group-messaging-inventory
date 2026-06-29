import {
  createPostgresDatabase,
  createPostgresPool,
  migratePostgresDatabase,
  PostgresAnalysisRunRepository,
} from './postgres.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the Postgres smoke test.');
}

const pool = createPostgresPool({ connectionString });
const db = createPostgresDatabase(pool);
const repository = new PostgresAnalysisRunRepository(db);

try {
  await migratePostgresDatabase(db);

  const idempotencyKey = `smoke-${Date.now()}`;
  const firstRun = await repository.enqueueRun({
    versionId: `tv_smoke_${Date.now()}`,
    triggerType: 'manual_reanalysis',
    effort: 'normal',
    reason: 'Postgres repository smoke test',
    idempotencyKey,
  });
  const duplicateRun = await repository.enqueueRun({
    versionId: firstRun.versionId,
    triggerType: 'manual_reanalysis',
    effort: 'enhanced_review',
    reason: 'Postgres repository smoke test duplicate',
    idempotencyKey,
  });

  if (firstRun.runId !== duplicateRun.runId) {
    throw new Error('Idempotency check failed: duplicate enqueue returned a different run.');
  }

  const completedRun = await repository.getRun(firstRun.runId);

  if (!completedRun) {
    throw new Error(`Expected run ${firstRun.runId} to be readable.`);
  }

  await repository.recordAnalysisResult({
    runId: firstRun.runId,
    output: {
      extractedPattern: 'Your payment of {amount} is due on {due_date}.',
      placeholders: [
        {
          token: '{amount}',
          type: 'currency',
          confidence: 96,
        },
        {
          token: '{due_date}',
          type: 'date',
          confidence: 94,
        },
      ],
      aiMessageType: 'Transaction',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 92,
      qualityScore: 88,
      candidateMatches: [
        {
          useCaseId: 'UC-SMOKE',
          name: 'Smoke use case',
          similarity: 95,
          reason: 'Smoke match',
        },
      ],
      anomalies: [],
      businessExplanation: ['Smoke analysis output'],
      technicalEvidence: ['packages/db/src/smoke.ts'],
    },
    policyDecision: 'auto_record',
    policyReasons: ['smoke'],
    modelProvider: 'noop',
    modelName: 'noop-local',
    promptVersion: 'smoke',
  });

  const changeRequest = await repository.createMappingChangeRequest({
    templateUuid: firstRun.templateUuid,
    baseRevision: 0,
    sourceRunId: firstRun.runId,
    targetUseCaseId: 'UC-SMOKE',
    reason: 'Postgres repository smoke mapping change',
    idempotencyKey: `${idempotencyKey}-cr`,
  });

  await repository.submitChangeRequest({
    changeRequestId: changeRequest.changeRequestId,
    actorId: 'smoke-maker',
  });
  await repository.decideChangeRequest({
    changeRequestId: changeRequest.changeRequestId,
    actorId: 'smoke-checker',
    decision: 'Approved',
    reason: 'Postgres repository smoke approval',
  });

  const followUpChangeRequest = await repository.createLifecycleChangeRequest({
    templateUuid: firstRun.templateUuid,
    baseRevision: 1,
    sourceRunId: firstRun.runId,
    targetLifecycleStatus: 'Retired',
    reason: 'Postgres repository smoke lifecycle follow-up',
    idempotencyKey: `${idempotencyKey}-cr-follow-up`,
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        runId: firstRun.runId,
        duplicateRunId: duplicateRun.runId,
        changeRequestId: changeRequest.changeRequestId,
        followUpChangeRequestId: followUpChangeRequest.changeRequestId,
      },
      null,
      2,
    ),
  );
} finally {
  await db.destroy();
}
