import { z } from 'zod';

export const analysisEffortSchema = z.enum([
  'deterministic_only',
  'normal',
  'enhanced_review',
]);

export const analysisRunStatusSchema = z.enum([
  'Queued',
  'Running',
  'Retrying',
  'Succeeded',
  'Failed',
  'Cancelled',
]);

export const governanceClassificationSchema = z.enum([
  'Regulatory',
  'Servicing',
  'Marketing',
]);

export const aiMessageTypeSchema = z.enum([
  'OTP',
  'Transaction',
  'Marketing',
  'Profile update',
  'Alert',
]);

export const channelSchema = z.enum(['SMS', 'Email', 'Push', 'In-app']);

export const analysisReviewStatusSchema = z.enum([
  'needs-review',
  'reviewed',
  'merged',
]);

export const analysisLifecycleStatusSchema = z.enum(['active', 'demised']);

export const submitAnalysisRunSchema = z.object({
  triggerType: z.enum([
    'production_discovery',
    'manual_reanalysis',
    'candidate_version',
    'evaluation_replay',
  ]),
  reason: z.string().min(1).max(500),
  effort: analysisEffortSchema.default('normal'),
  compareToRunId: z.string().min(1).optional(),
  requestedOutputs: z.array(z.string().min(1)).default([]),
});

export const placeholderEvidenceSchema = z.object({
  token: z.string().min(1),
  type: z.enum(['currency', 'date', 'account', 'otp', 'name', 'unknown']),
  confidence: z.number().int().min(0).max(100),
});

export const candidateUseCaseMatchSchema = z.object({
  useCaseId: z.string().min(1),
  name: z.string().min(1),
  similarity: z.number().int().min(0).max(100),
  reason: z.string().min(1),
});

export const aiTemplateAnalysisOutputSchema = z.object({
  extractedPattern: z.string().min(1),
  placeholders: z.array(placeholderEvidenceSchema),
  aiMessageType: z.string().min(1),
  governanceClassificationSuggestion: governanceClassificationSchema,
  overallConfidence: z.number().int().min(0).max(100),
  qualityScore: z.number().int().min(0).max(100),
  candidateMatches: z.array(candidateUseCaseMatchSchema),
  anomalies: z.array(z.string().min(1)),
  businessExplanation: z.array(z.string().min(1)),
  technicalEvidence: z.array(z.string().min(1)),
});

export const analysisRunResponseSchema = z.object({
  runId: z.string().min(1),
  status: analysisRunStatusSchema,
  templateUuid: z.string().min(1),
  versionId: z.string().min(1),
  pipelineVersion: z.string().min(1).optional(),
  promptVersion: z.string().min(1).optional(),
  modelProvider: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  rulesetVersion: z.string().min(1).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  traceRef: z.string().min(1).optional(),
  output: aiTemplateAnalysisOutputSchema.optional(),
  routing: z
    .object({
      reviewTaskId: z.string().min(1).nullable(),
      changeRequestId: z.string().min(1).nullable(),
      policyDecision: z.string().min(1),
    })
    .optional(),
});

export const submitAnalysisRunResponseSchema = z.object({
  runId: z.string().min(1),
  status: z.literal('Queued'),
  templateUuid: z.string().min(1),
  versionId: z.string().min(1),
  createdAt: z.string().datetime(),
  idempotencyKey: z.string().min(1).nullable(),
  requestedEffort: analysisEffortSchema,
  pollUrl: z.string().min(1),
  workflow: z.object({
    driver: z.enum(['none', 'temporal']),
    started: z.boolean(),
    workflowId: z.string().min(1).nullable().optional(),
    runId: z.string().min(1).nullable().optional(),
  }),
});

export const createMappingChangeRequestSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  sourceRunId: z.string().min(1),
  targetUseCaseId: z.string().min(1),
  reason: z.string().min(1).max(1000),
  submitForApproval: z.boolean().default(false),
  submitterActorId: z.string().min(1).optional(),
});

export const createLifecycleChangeRequestSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  sourceRunId: z.string().min(1),
  targetLifecycleStatus: z.enum(['Retired', 'Active', 'No Traffic']),
  reason: z.string().min(1).max(1000),
  submitForApproval: z.boolean().default(false),
  submitterActorId: z.string().min(1).optional(),
});

export const createCurrentVersionChangeRequestSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  sourceRunId: z.string().min(1),
  reason: z.string().min(1).max(1000),
  submitForApproval: z.boolean().default(false),
  submitterActorId: z.string().min(1).optional(),
});

export const changeRequestStatusSchema = z.enum([
  'Draft',
  'PendingApproval',
  'Approved',
  'Rejected',
  'ChangesRequested',
  'Withdrawn',
]);

export const changeRequestResponseSchema = z.object({
  changeRequestId: z.string().min(1),
  status: changeRequestStatusSchema,
  objectType: z.literal('template'),
  objectId: z.string().min(1),
  baseRevision: z.number().int().nonnegative(),
  sourceRunId: z.string().min(1),
  createdAt: z.string().datetime(),
  idempotencyKey: z.string().min(1).nullable(),
  submittedBy: z.string().min(1).nullable().optional(),
  submittedAt: z.string().datetime().nullable().optional(),
  checkedBy: z.string().min(1).nullable().optional(),
  checkedAt: z.string().datetime().nullable().optional(),
  decisionReason: z.string().min(1).nullable().optional(),
});

export const submitChangeRequestSchema = z.object({
  actorId: z.string().min(1).optional(),
});

export const decideChangeRequestSchema = z.object({
  actorId: z.string().min(1).optional(),
  decision: z.enum(['Approved', 'Rejected', 'ChangesRequested']),
  reason: z.string().min(1).max(1000),
});

export const listChangeRequestsQuerySchema = z.object({
  status: changeRequestStatusSchema.optional(),
});

export const changeRequestsResponseSchema = z.object({
  changeRequests: z.array(changeRequestResponseSchema),
});

export const reviewTaskStatusSchema = z.enum([
  'Open',
  'Assigned',
  'InReview',
  'PendingApproval',
  'Resolved',
  'Dismissed',
]);

export const reviewTaskResponseSchema = z.object({
  taskId: z.string().min(1),
  taskType: z.string().min(1),
  objectType: z.string().min(1),
  objectId: z.string().min(1),
  sourceRunId: z.string().min(1).nullable(),
  priority: z.string().min(1),
  status: reviewTaskStatusSchema,
  assignedTo: z.string().min(1).nullable(),
  reason: z.string().min(1),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
});

export const listReviewTasksQuerySchema = z.object({
  status: reviewTaskStatusSchema.optional(),
  objectType: z.string().min(1).optional(),
  objectId: z.string().min(1).optional(),
  sourceRunId: z.string().min(1).optional(),
  assignedTo: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const reviewTasksResponseSchema = z.object({
  reviewTasks: z.array(reviewTaskResponseSchema),
});

export const transitionReviewTaskSchema = z.object({
  actorId: z.string().min(1).optional(),
  status: z.enum(['Assigned', 'InReview', 'PendingApproval', 'Resolved', 'Dismissed']),
  reason: z.string().min(1).max(1000).optional(),
  assignedTo: z.string().min(1).optional(),
});

export const auditEvidenceEventSchema = z.object({
  auditEventId: z.string().min(1),
  actorId: z.string().min(1).nullable(),
  action: z.string().min(1),
  objectType: z.string().min(1),
  objectId: z.string().min(1),
  sourceRunId: z.string().min(1).nullable(),
  changeRequestId: z.string().min(1).nullable(),
  beforeRef: z.string().min(1).nullable(),
  afterRef: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
});

export const listAuditEventsQuerySchema = z.object({
  objectType: z.string().min(1).optional(),
  objectId: z.string().min(1).optional(),
  sourceRunId: z.string().min(1).optional(),
  changeRequestId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const auditEventsResponseSchema = z.object({
  auditEvents: z.array(auditEvidenceEventSchema),
});

export const changeRequestEvidencePackageSchema = z.object({
  packageId: z.string().min(1),
  exportedAt: z.string().datetime(),
  changeRequest: changeRequestResponseSchema,
  proposedPatch: z.record(z.string(), z.unknown()),
  sourceRun: analysisRunResponseSchema,
  auditEvents: z.array(auditEvidenceEventSchema),
});

export const confirmAnalysisRunResponseSchema = z.object({
  runId: z.string().min(1),
  reviewStatus: z.literal('reviewed'),
  confirmedAt: z.string().datetime(),
});

export const aiTemplateAnalysisResultSchema = z.object({
  id: z.string().min(1),
  templateUuid: z.string().min(1),
  versionId: z.string().min(1),
  templateId: z.string().min(1),
  name: z.string().min(1),
  channel: channelSchema,
  analyzedAt: z.string().min(1),
  maskedMessage: z.string().min(1),
  extractedPattern: z.string().min(1),
  placeholders: z.array(z.string().min(1)),
  aiMessageType: aiMessageTypeSchema,
  governanceClassification: governanceClassificationSchema,
  confidence: z.number().int().min(0).max(100),
  qualityScore: z.number().int().min(0).max(100),
  nearestMatch: z
    .object({
      templateId: z.string().min(1),
      name: z.string().min(1),
      similarity: z.number().int().min(0).max(100),
    })
    .optional(),
  anomalies: z.array(z.string().min(1)),
  owner: z.string().min(1),
  reviewStatus: analysisReviewStatusSchema,
  lifecycleStatus: analysisLifecycleStatusSchema,
  routing: z.object({
    reviewTaskId: z.string().min(1).nullable(),
    changeRequestId: z.string().min(1).nullable(),
    policyDecision: z.string().min(1),
  }),
  explanation: z.array(z.string().min(1)),
});

export const aiTemplateAnalysisResultsResponseSchema = z.object({
  results: z.array(aiTemplateAnalysisResultSchema),
});

export const analysisEvaluationMetricsSchema = z.object({
  caseCount: z.number().int().nonnegative(),
  schemaPassRate: z.number().min(0).max(1),
  classificationAccuracy: z.number().min(0).max(1),
  routingAccuracy: z.number().min(0).max(1),
  placeholderRecall: z.number().min(0).max(1),
});

export const analysisEvaluationThresholdsSchema = z.object({
  minCaseCount: z.number().int().nonnegative(),
  minSchemaPassRate: z.number().min(0).max(1),
  minClassificationAccuracy: z.number().min(0).max(1),
  minRoutingAccuracy: z.number().min(0).max(1),
  minPlaceholderRecall: z.number().min(0).max(1),
});

export const latestAnalysisEvaluationResponseSchema = z.object({
  source: z.object({
    kind: z.enum(['postgres', 'replay_fallback']),
    persisted: z.boolean(),
    generatedAt: z.string().datetime(),
  }),
  evaluation: z.object({
    suite: z.string().min(1),
    datasetVersion: z.string().min(1),
    mode: z.enum(['replay', 'provider']),
    verdict: z.enum(['pass', 'fail']),
    metrics: analysisEvaluationMetricsSchema,
    thresholds: analysisEvaluationThresholdsSchema,
    failedCaseIds: z.array(z.string().min(1)),
  }),
  release: z.object({
    releaseId: z.string().min(1),
    status: z.enum(['ReadyForPromotion', 'BlockedByEvaluation']),
    promotionAllowed: z.boolean(),
    evidenceHash: z.string().startsWith('sha256:'),
    pipeline: z.object({
      pipelineVersion: z.string().min(1),
      promptVersion: z.string().min(1),
      modelProvider: z.string().min(1),
      modelName: z.string().min(1),
      rulesetVersion: z.string().min(1),
    }),
  }),
});

export const pipelineReleaseEvidenceSchema = z.object({
  releaseId: z.string().min(1),
  status: z.enum(['ReadyForPromotion', 'BlockedByEvaluation']),
  promotionAllowed: z.boolean(),
  evidenceHash: z.string().startsWith('sha256:'),
  requestedBy: z.string().min(1),
  createdAt: z.string().datetime(),
  pipeline: z.object({
    pipelineVersion: z.string().min(1),
    promptVersion: z.string().min(1),
    modelProvider: z.string().min(1),
    modelName: z.string().min(1),
    rulesetVersion: z.string().min(1),
  }),
  evaluation: z.object({
    suite: z.string().min(1),
    datasetVersion: z.string().min(1),
    mode: z.enum(['replay', 'provider']),
    verdict: z.enum(['pass', 'fail']),
    metrics: analysisEvaluationMetricsSchema,
    thresholds: analysisEvaluationThresholdsSchema,
    failureCaseIds: z.array(z.string().min(1)),
  }),
});

export const recordPipelineReleaseEvidenceSchema = z.object({
  evidence: pipelineReleaseEvidenceSchema,
  reportRef: z.string().min(1).nullable().optional(),
});

export const recordPipelineReleaseEvidenceResponseSchema = z.object({
  recordedEvaluation: z.object({
    evaluationId: z.string().min(1),
    evaluationSuite: z.string().min(1),
    datasetVersion: z.string().min(1),
    verdict: z.enum(['pass', 'fail']),
    createdAt: z.string().datetime(),
  }),
  recordedRelease: z.object({
    releaseId: z.string().min(1),
    status: z.enum(['ReadyForPromotion', 'BlockedByEvaluation']),
    promotionAllowed: z.boolean(),
    evidenceHash: z.string().startsWith('sha256:'),
  }),
  latest: latestAnalysisEvaluationResponseSchema,
});

export const readinessResponseSchema = z.object({
  status: z.enum(['ready', 'degraded']),
  service: z.literal('group-messaging-inventory-api'),
  checkedAt: z.string().datetime(),
  components: z.array(
    z.object({
      name: z.enum(['api', 'database', 'workflow', 'ai-provider']),
      status: z.enum(['up', 'degraded', 'skipped']),
      required: z.boolean(),
      detail: z.string().min(1),
    }),
  ),
});

export const standardErrorSchema = z.object({
  error: z.object({
    requestId: z.string().min(1),
    code: z.enum([
      'access_denied',
      'base_revision_conflict',
      'open_change_request_exists',
      'invalid_state_transition',
      'invalid_idempotency_key',
      'analysis_run_not_terminal',
      'provider_temporarily_unavailable',
      'pii_masking_failed',
      'schema_validation_failed',
      'rate_limited',
      'invalid_release_evidence',
      'dependency_unavailable',
    ]),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type SubmitAnalysisRunRequest = z.infer<typeof submitAnalysisRunSchema>;
export type SubmitAnalysisRunResponse = z.infer<typeof submitAnalysisRunResponseSchema>;
export type AnalysisRunResponse = z.infer<typeof analysisRunResponseSchema>;
export type CreateMappingChangeRequestRequest = z.infer<
  typeof createMappingChangeRequestSchema
>;
export type CreateLifecycleChangeRequestRequest = z.infer<
  typeof createLifecycleChangeRequestSchema
>;
export type CreateCurrentVersionChangeRequestRequest = z.infer<
  typeof createCurrentVersionChangeRequestSchema
>;
export type ChangeRequestResponse = z.infer<typeof changeRequestResponseSchema>;
export type SubmitChangeRequestRequest = z.infer<typeof submitChangeRequestSchema>;
export type DecideChangeRequestRequest = z.infer<typeof decideChangeRequestSchema>;
export type ListChangeRequestsQuery = z.infer<typeof listChangeRequestsQuerySchema>;
export type ChangeRequestsResponse = z.infer<typeof changeRequestsResponseSchema>;
export type ListReviewTasksQuery = z.infer<typeof listReviewTasksQuerySchema>;
export type TransitionReviewTaskRequest = z.infer<typeof transitionReviewTaskSchema>;
export type ReviewTaskResponse = z.infer<typeof reviewTaskResponseSchema>;
export type ReviewTasksResponse = z.infer<typeof reviewTasksResponseSchema>;
export type ListAuditEventsQuery = z.infer<typeof listAuditEventsQuerySchema>;
export type AuditEventsResponse = z.infer<typeof auditEventsResponseSchema>;
export type ChangeRequestEvidencePackage = z.infer<
  typeof changeRequestEvidencePackageSchema
>;
export type ConfirmAnalysisRunResponse = z.infer<
  typeof confirmAnalysisRunResponseSchema
>;
export type AiTemplateAnalysisResultResponse = z.infer<
  typeof aiTemplateAnalysisResultSchema
>;
export type AiTemplateAnalysisResultsResponse = z.infer<
  typeof aiTemplateAnalysisResultsResponseSchema
>;
export type LatestAnalysisEvaluationResponse = z.infer<
  typeof latestAnalysisEvaluationResponseSchema
>;
export type RecordPipelineReleaseEvidenceRequest = z.infer<
  typeof recordPipelineReleaseEvidenceSchema
>;
export type RecordPipelineReleaseEvidenceResponse = z.infer<
  typeof recordPipelineReleaseEvidenceResponseSchema
>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
