import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
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

  if (seededResults.length < 5) {
    throw new Error(`Expected at least 5 seeded analysis results, got ${seededResults.length}.`);
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
  const autoRecorded = await seedRun({
    slug: 'payment-reminder-auto',
    policyDecision: 'auto_record',
    confidence: 96,
    qualityScore: 94,
    candidateUseCaseId: 'UC-PAYMENT-REMINDER',
    anomalies: [],
    reason: 'Seed auto-recorded servicing payment reminder',
  });

  const reviewRequired = await seedRun({
    slug: 'otp-low-confidence-review',
    policyDecision: 'review_required',
    confidence: 68,
    qualityScore: 76,
    candidateUseCaseId: 'UC-AUTHENTICATION',
    anomalies: ['low_confidence_candidate_match'],
    reason: 'Seed review-required OTP low confidence match',
  });

  const blocked = await seedRun({
    slug: 'pii-blocked',
    policyDecision: 'blocked',
    confidence: 40,
    qualityScore: 45,
    candidateUseCaseId: 'UC-UNKNOWN',
    anomalies: ['pii_masking_required_before_provider'],
    reason: 'Seed blocked PII masking review case',
  });

  const approvalCandidate = await seedRun({
    slug: 'candidate-mapping-approval',
    policyDecision: 'review_required',
    confidence: 87,
    qualityScore: 90,
    candidateUseCaseId: 'UC-CARD-REPAYMENT',
    anomalies: ['candidate_mapping_requires_checker'],
    reason: 'Seed candidate mapping approval package',
  });

  const lifecycleCandidate = await seedRun({
    slug: 'retired-but-live',
    policyDecision: 'review_required',
    confidence: 82,
    qualityScore: 84,
    candidateUseCaseId: 'UC-RETENTION',
    anomalies: ['retired_but_live_traffic'],
    reason: 'Seed retired-but-live lifecycle approval package',
  });

  return {
    autoRecorded,
    reviewRequired,
    blocked,
    approvalCandidate,
    lifecycleCandidate,
  };
}

async function seedRun({
  slug,
  policyDecision,
  confidence,
  qualityScore,
  candidateUseCaseId,
  anomalies,
  reason,
}) {
  const versionId = `tv-${datasetId}-${slug}`;
  const queued = await repository.enqueueRun({
    versionId,
    triggerType: 'manual_reanalysis',
    effort: policyDecision === 'blocked' ? 'enhanced_review' : 'normal',
    reason,
    idempotencyKey: `${datasetId}-${slug}-run`,
  });

  const recorded = await repository.recordAnalysisResult({
    runId: queued.runId,
    output: createAnalysisOutput({
      slug,
      confidence,
      qualityScore,
      candidateUseCaseId,
      anomalies,
    }),
    policyDecision,
    policyReasons: anomalies.length > 0 ? anomalies : ['seed_verified_output'],
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

  const changesRequestedRun = await seedRun({
    slug: 'classification-conflict-changes',
    policyDecision: 'review_required',
    confidence: 74,
    qualityScore: 81,
    candidateUseCaseId: 'UC-CLASSIFICATION-REVIEW',
    anomalies: ['classification_conflict'],
    reason: 'Seed changes-requested approval package',
  });
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

  const rejectedRun = await seedRun({
    slug: 'marketing-rejected',
    policyDecision: 'review_required',
    confidence: 79,
    qualityScore: 80,
    candidateUseCaseId: 'UC-MARKETING-CAMPAIGN',
    anomalies: ['missing_marketing_consent_evidence'],
    reason: 'Seed rejected approval package',
  });
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

function createAnalysisOutput({
  slug,
  confidence,
  qualityScore,
  candidateUseCaseId,
  anomalies,
}) {
  return {
    extractedPattern: `Seed ${slug} message for {customer} with {date}.`,
    placeholders: [
      {
        token: '{customer}',
        type: 'name',
        confidence: 91,
      },
      {
        token: '{date}',
        type: 'date',
        confidence: 93,
      },
    ],
    aiMessageType: slug.includes('otp') ? 'OTP' : 'Transaction',
    governanceClassificationSuggestion: slug.includes('marketing')
      ? 'Marketing'
      : slug.includes('pii')
        ? 'Regulatory'
        : 'Servicing',
    overallConfidence: confidence,
    qualityScore,
    candidateMatches: [
      {
        useCaseId: candidateUseCaseId,
        name: `Seed ${candidateUseCaseId}`,
        similarity: Math.max(50, confidence - 3),
        reason: `Seeded candidate match for ${slug}.`,
      },
    ],
    anomalies,
    businessExplanation: [`Seeded verification case ${slug}.`],
    technicalEvidence: [`seed-verification-data-pg:${datasetId}:${slug}`],
  };
}
