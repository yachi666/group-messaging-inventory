import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
  verificationSeedCases,
} from '@gmi/evals';
import {
  createPostgresDatabase,
  createPostgresPool,
  getLatestAnalysisEvaluation,
  migratePostgresDatabase,
  PostgresAnalysisRunRepository,
  recordAnalysisEvaluation,
  recordPipelineReleaseEvidence,
} from '@gmi/db';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://gmi:gmi@127.0.0.1:55432/gmi';
const datasetId =
  process.env.SEED_DATASET_ID ??
  `verification-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

const pool = createPostgresPool({ connectionString: databaseUrl });
const db = createPostgresDatabase(pool);
const repository = new PostgresAnalysisRunRepository(db);

try {
  await migratePostgresDatabase(db);

  const runs = await seedAnalysisRuns();
  const reviewSummary = await seedReviewTaskLifecycle(runs.reviewRequired.reviewTaskId);
  const changeRequests = await seedChangeRequests(runs);
  const evaluation = await seedReleaseEvidence();

  const analysisResults = await repository.listAnalysisResults();
  const seededResults = analysisResults.filter((result) =>
    result.versionId.includes(datasetId),
  );

  if (seededResults.length < verificationSeedCases.length) {
    throw new Error(
      `Expected at least ${verificationSeedCases.length} seeded analysis results, got ${seededResults.length}.`,
    );
  }

  const pendingChangeRequests = await repository.listChangeRequests({
    status: 'PendingApproval',
  });
  const seededPending = pendingChangeRequests.filter((request) =>
    request.objectId.includes(datasetId),
  );

  if (seededPending.length !== 1) {
    throw new Error(`Expected 1 seeded pending approval, got ${seededPending.length}.`);
  }

  const evidencePackage = await repository.getChangeRequestEvidencePackage(
    changeRequests.approved.changeRequestId,
  );

  if (!evidencePackage || evidencePackage.auditEvents.length < 2) {
    throw new Error('Expected approved change request evidence package with audit events.');
  }

  const latestEvaluation = await getLatestAnalysisEvaluation(db);

  if (!latestEvaluation || latestEvaluation.release.releaseId !== evaluation.releaseId) {
    throw new Error('Expected latest evaluation to point at seeded release evidence.');
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        datasetId,
        analysisRuns: Object.fromEntries(
          Object.entries(runs).map(([key, value]) => [key, value.runId]),
        ),
        reviewSummary,
        changeRequests: {
          approved: changeRequests.approved.changeRequestId,
          pending: changeRequests.pending.changeRequestId,
          changesRequested: changeRequests.changesRequested.changeRequestId,
          rejected: changeRequests.rejected.changeRequestId,
        },
        latestEvaluation: {
          releaseId: latestEvaluation.release.releaseId,
          verdict: latestEvaluation.evaluation.verdict,
          promotionAllowed: latestEvaluation.release.promotionAllowed,
        },
        verificationHints: {
          listAnalysisResults: 'GET /templates/analysis-results',
          pendingApprovals: 'GET /change-requests?status=PendingApproval',
          openReviewTasks: 'GET /review-tasks?status=Open&objectType=template',
          evidencePackage: `GET /change-requests/${changeRequests.approved.changeRequestId}/evidence-package`,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await db.destroy();
}

async function seedAnalysisRuns() {
  const autoRecorded = await seedRun(getSeedCase('payment-reminder-auto'));
  const reviewRequired = await seedRun(getSeedCase('otp-low-confidence-review'));
  const blocked = await seedRun(getSeedCase('pii-blocked'));
  const approvalCandidate = await seedRun(getSeedCase('candidate-mapping-approval'));
  const lifecycleCandidate = await seedRun(getSeedCase('retired-but-live'));
  const regulatoryEnhancedReview = await seedRun(getSeedCase('regulatory-enhanced-review'));
  const candidateVersionDrift = await seedRun(getSeedCase('candidate-version-drift'));

  return {
    autoRecorded,
    reviewRequired,
    blocked,
    approvalCandidate,
    lifecycleCandidate,
    regulatoryEnhancedReview,
    candidateVersionDrift,
  };
}

async function seedRun(seedCase) {
  const { slug } = seedCase;
  const versionId = `tv-${datasetId}-${slug}`;
  const queued = await repository.enqueueRun({
    versionId,
    triggerType: 'manual_reanalysis',
    effort: seedCase.effort,
    reason: seedCase.reason,
    idempotencyKey: `${datasetId}-${slug}-run`,
  });

  const recorded = await repository.recordAnalysisResult({
    runId: queued.runId,
    output: withSeedTrace(seedCase.output, slug),
    policyDecision: seedCase.expectedPolicyDecision,
    policyReasons:
      seedCase.output.anomalies.length > 0
        ? seedCase.output.anomalies
        : ['seed_verified_output'],
    modelProvider: 'replay',
    modelName: 'seed-verification-fixtures',
    promptVersion: `template-analysis-agent@seed-${datasetId}`,
    traceRef: `trace_seed_${datasetId}_${slug}`,
  });

  return {
    ...queued,
    reviewTaskId: recorded.reviewTaskId,
  };
}

async function seedReviewTaskLifecycle(reviewTaskId) {
  if (!reviewTaskId) {
    throw new Error('Expected review-required seed run to create a review task.');
  }

  const assigned = await repository.transitionReviewTask({
    taskId: reviewTaskId,
    actorId: 'seed-reviewer',
    status: 'Assigned',
    assignedTo: 'seed-reviewer',
    reason: 'Seed reviewer claim',
  });

  const inReview = await repository.transitionReviewTask({
    taskId: reviewTaskId,
    actorId: 'seed-reviewer',
    status: 'InReview',
    reason: 'Seed reviewer started review',
  });

  return {
    taskId: reviewTaskId,
    assignedStatus: assigned.status,
    inReviewStatus: inReview.status,
    assignedTo: inReview.assignedTo,
  };
}

async function seedChangeRequests(runs) {
  const approvedDraft = await repository.createMappingChangeRequest({
    templateUuid: runs.approvalCandidate.templateUuid,
    baseRevision: 0,
    sourceRunId: runs.approvalCandidate.runId,
    targetUseCaseId: 'UC-CARD-REPAYMENT',
    reason: 'Seed approved mapping change request',
    idempotencyKey: `${datasetId}-approved-cr`,
  });
  const approvedSubmitted = await repository.submitChangeRequest({
    changeRequestId: approvedDraft.changeRequestId,
    actorId: 'seed-maker',
  });
  const approved = await repository.decideChangeRequest({
    changeRequestId: approvedSubmitted.changeRequestId,
    actorId: 'seed-checker',
    decision: 'Approved',
    reason: 'Seed checker approval',
  });

  const pendingDraft = await repository.createLifecycleChangeRequest({
    templateUuid: runs.lifecycleCandidate.templateUuid,
    baseRevision: 0,
    sourceRunId: runs.lifecycleCandidate.runId,
    targetLifecycleStatus: 'Retired',
    reason: 'Seed pending lifecycle change request',
    idempotencyKey: `${datasetId}-pending-cr`,
  });
  const pending = await repository.submitChangeRequest({
    changeRequestId: pendingDraft.changeRequestId,
    actorId: 'seed-maker',
  });

  const changesRequestedRun = await seedRun(getSeedCase('classification-conflict-changes'));
  const changesDraft = await repository.createMappingChangeRequest({
    templateUuid: changesRequestedRun.templateUuid,
    baseRevision: 0,
    sourceRunId: changesRequestedRun.runId,
    targetUseCaseId: 'UC-CLASSIFICATION-REVIEW',
    reason: 'Seed changes requested mapping change request',
    idempotencyKey: `${datasetId}-changes-requested-cr`,
  });
  const changesSubmitted = await repository.submitChangeRequest({
    changeRequestId: changesDraft.changeRequestId,
    actorId: 'seed-maker',
  });
  const changesRequested = await repository.decideChangeRequest({
    changeRequestId: changesSubmitted.changeRequestId,
    actorId: 'seed-checker',
    decision: 'ChangesRequested',
    reason: 'Seed checker requested more evidence',
  });

  const rejectedRun = await seedRun(getSeedCase('marketing-rejected'));
  const rejectedDraft = await repository.createMappingChangeRequest({
    templateUuid: rejectedRun.templateUuid,
    baseRevision: 0,
    sourceRunId: rejectedRun.runId,
    targetUseCaseId: 'UC-MARKETING-CAMPAIGN',
    reason: 'Seed rejected mapping change request',
    idempotencyKey: `${datasetId}-rejected-cr`,
  });
  const rejectedSubmitted = await repository.submitChangeRequest({
    changeRequestId: rejectedDraft.changeRequestId,
    actorId: 'seed-maker',
  });
  const rejected = await repository.decideChangeRequest({
    changeRequestId: rejectedSubmitted.changeRequestId,
    actorId: 'seed-checker',
    decision: 'Rejected',
    reason: 'Seed checker rejected marketing mapping',
  });

  return {
    approved,
    pending,
    changesRequested,
    rejected,
  };
}

async function seedReleaseEvidence() {
  const report = await runGoldenTemplateEvaluation();
  const pipelineVersion = `template-analysis-pipeline@seed-${datasetId}`;
  const promptVersion = `template-analysis-agent@seed-${datasetId}`;
  const modelProvider = 'replay';
  const modelName = 'seed-verification-fixtures';
  const rulesetVersion = 'messaging-governance-rules@local';
  const releaseId = `REL-SEED-${datasetId}`;

  await recordAnalysisEvaluation(db, {
    evaluationSuite: report.suite,
    pipelineVersion,
    promptVersion,
    modelProvider,
    modelName,
    rulesetVersion,
    datasetVersion: `${report.datasetVersion}+${datasetId}`,
    metrics: report.metrics,
    thresholds: report.thresholds,
    verdict: report.verdict,
    reportRef: `seed:${datasetId}`,
  });

  const releaseEvidence = createPipelineReleaseEvidence(
    {
      ...report,
      datasetVersion: `${report.datasetVersion}+${datasetId}`,
    },
    {
      releaseId,
      pipelineVersion,
      promptVersion,
      modelProvider,
      modelName,
      rulesetVersion,
      requestedBy: 'seed-verification-data',
    },
  );

  return recordPipelineReleaseEvidence(db, releaseEvidence);
}

function getSeedCase(slug) {
  const seedCase = verificationSeedCases.find((candidate) => candidate.slug === slug);

  if (!seedCase) {
    throw new Error(`Missing verification seed case: ${slug}`);
  }

  return seedCase;
}

function withSeedTrace(output, slug) {
  return {
    ...output,
    technicalEvidence: [
      ...output.technicalEvidence,
      `seed-verification-data-pg:${datasetId}:${slug}`,
    ],
  };
}
