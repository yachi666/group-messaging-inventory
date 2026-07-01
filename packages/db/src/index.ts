import type {
  AiTemplateAnalysisOutput,
  AnalysisRunStatus,
  AnalysisTriggerType,
  ApprovalStatus,
  ChangeRequestStatus,
  MappingStatus,
  ReviewTaskStatus,
  AnalysisEffort,
  TemplateLifecycleStatus,
  TemplateVersionStatus,
} from '@gmi/domain';
import type { ColumnType, Generated } from 'kysely';

export {
  createPostgresDatabase,
  createPostgresPool,
  migratePostgresDatabase,
  getLatestAnalysisEvaluation,
  mapPipelineReleaseEvidenceToRecord,
  mapLatestEvaluationRowsToResponse,
  PostgresAnalysisRunRepository,
  recordAnalysisEvaluation,
  recordPipelineReleaseEvidence,
} from './postgres.js';

export type TimestampColumn = ColumnType<Date, Date | string | undefined, Date | string>;

export type TemplatesTable = {
  template_uuid: string;
  platform: string;
  tenant_or_workspace: string;
  external_template_id: string;
  current_version_id: string | null;
  parent_use_case_id: string | null;
  mapping_status: MappingStatus;
  lifecycle_status: TemplateLifecycleStatus;
  approval_status: ApprovalStatus;
  first_seen_at: TimestampColumn;
  last_seen_at: TimestampColumn;
  approved_revision: number;
  created_at: Generated<TimestampColumn>;
  updated_at: TimestampColumn;
};

export type TemplateVersionsTable = {
  version_id: string;
  template_uuid: string;
  version_number: number;
  masked_content: string;
  content_fingerprint: string;
  configuration_fingerprint: string;
  variables_json: unknown;
  material_configuration_snapshot_json: unknown;
  change_summary: string | null;
  previous_version_id: string | null;
  version_status: TemplateVersionStatus;
  approval_status: ApprovalStatus;
  first_seen_at: TimestampColumn;
  last_seen_at: TimestampColumn;
  effective_at: TimestampColumn | null;
  created_at: Generated<TimestampColumn>;
};

export type AnalysisRunsTable = {
  run_id: string;
  template_uuid: string;
  version_id: string;
  trigger_type: string;
  triggered_by: string | null;
  source_input_snapshot_id: string | null;
  masked_input_summary: string;
  pipeline_version: string;
  prompt_version: string | null;
  model_provider: string | null;
  model_name: string | null;
  model_version: string | null;
  ruleset_version: string | null;
  embedding_version: string | null;
  retrieved_context_refs_json: unknown;
  status: AnalysisRunStatus;
  started_at: TimestampColumn | null;
  completed_at: TimestampColumn | null;
  duration_ms: number | null;
  warnings_json: unknown;
  errors_json: unknown;
  retry_count: number;
  trace_ref: string | null;
  idempotency_key: string | null;
  created_at: Generated<TimestampColumn>;
};

export type AnalysisOutputsTable = {
  output_id: string;
  run_id: string;
  extracted_pattern: string;
  placeholders_json: unknown;
  ai_message_type: string;
  governance_classification_suggestion: string;
  candidate_matches_json: unknown;
  similar_templates_json: unknown;
  field_confidence_json: unknown;
  overall_confidence: number;
  quality_score: number;
  anomalies_json: unknown;
  business_explanation_json: unknown;
  technical_evidence_json: unknown;
  created_at: Generated<TimestampColumn>;
};

export type ChangeRequestsTable = {
  change_request_id: string;
  object_type: string;
  object_id: string;
  base_revision: number;
  source_run_id: string | null;
  change_type: string;
  proposed_patch_json: unknown;
  status: ChangeRequestStatus;
  submitted_by: string | null;
  submitted_at: TimestampColumn | null;
  checked_by: string | null;
  checked_at: TimestampColumn | null;
  decision_reason: string | null;
  idempotency_key: string | null;
  created_at: Generated<TimestampColumn>;
};

export type ReviewTasksTable = {
  task_id: string;
  task_type: string;
  object_type: string;
  object_id: string;
  source_run_id: string | null;
  priority: string;
  status: ReviewTaskStatus;
  assigned_to: string | null;
  reason: string;
  created_at: Generated<TimestampColumn>;
  resolved_at: TimestampColumn | null;
};

export type AnalysisEvaluationsTable = {
  evaluation_id: string;
  evaluation_suite: string;
  pipeline_version: string;
  prompt_version: string | null;
  model_provider: string | null;
  model_name: string | null;
  ruleset_version: string | null;
  dataset_version: string;
  metrics_json: unknown;
  thresholds_json: unknown;
  verdict: string;
  report_ref: string | null;
  created_at: Generated<TimestampColumn>;
};

export type PipelineReleasesTable = {
  release_id: string;
  status: string;
  promotion_allowed: boolean;
  requested_by: string;
  pipeline_version: string;
  prompt_version: string;
  model_provider: string;
  model_name: string;
  ruleset_version: string;
  evaluation_suite: string;
  dataset_version: string;
  evaluation_mode: string;
  evaluation_verdict: string;
  metrics_json: unknown;
  thresholds_json: unknown;
  failure_case_ids_json: unknown;
  evidence_hash: string;
  evidence_json: unknown;
  created_at: TimestampColumn;
};

export type AuditEventsTable = {
  audit_event_id: string;
  actor_id: string | null;
  action: string;
  object_type: string;
  object_id: string;
  source_run_id: string | null;
  change_request_id: string | null;
  before_ref: string | null;
  after_ref: string | null;
  created_at: Generated<TimestampColumn>;
};

export type Database = {
  templates: TemplatesTable;
  template_versions: TemplateVersionsTable;
  analysis_runs: AnalysisRunsTable;
  analysis_outputs: AnalysisOutputsTable;
  review_tasks: ReviewTasksTable;
  change_requests: ChangeRequestsTable;
  analysis_evaluations: AnalysisEvaluationsTable;
  pipeline_releases: PipelineReleasesTable;
  audit_events: AuditEventsTable;
};

export type SubmitAnalysisRunRecord = {
  versionId: string;
  triggerType: AnalysisTriggerType;
  effort: AnalysisEffort;
  reason: string;
  idempotencyKey?: string;
};

export type QueuedAnalysisRunRecord = {
  runId: string;
  status: AnalysisRunStatus;
  templateUuid: string;
  versionId: string;
  createdAt: string;
  idempotencyKey: string | null;
  requestedEffort: AnalysisEffort;
  idempotencyReused?: boolean;
};

export type CompletedAnalysisRunRecord = {
  runId: string;
  status: AnalysisRunStatus;
  templateUuid: string;
  versionId: string;
  pipelineVersion?: string;
  promptVersion?: string;
  modelProvider?: string;
  modelName?: string;
  rulesetVersion?: string;
  startedAt?: string;
  completedAt?: string;
  traceRef?: string;
  errors?: AnalysisRunErrorSummary[];
  output?: AiTemplateAnalysisOutput;
};

export type AnalysisRunErrorSummary = {
  code: string;
  message: string;
  retryable: boolean;
};

export type CreateMappingChangeRequestRecord = {
  templateUuid: string;
  baseRevision: number;
  sourceRunId: string;
  targetUseCaseId: string;
  reason: string;
  idempotencyKey?: string;
};

export type CreateLifecycleChangeRequestRecord = {
  templateUuid: string;
  baseRevision: number;
  sourceRunId: string;
  targetLifecycleStatus: 'Retired' | 'Active' | 'No Traffic';
  reason: string;
  idempotencyKey?: string;
};

export type CreateCurrentVersionChangeRequestRecord = {
  versionId: string;
  baseRevision: number;
  sourceRunId: string;
  reason: string;
  idempotencyKey?: string;
};

export type MappingChangeRequestRecord = {
  changeRequestId: string;
  status: ChangeRequestStatus;
  objectType: 'template';
  objectId: string;
  baseRevision: number;
  sourceRunId: string;
  createdAt: string;
  idempotencyKey: string | null;
  submittedBy?: string | null;
  submittedAt?: string | null;
  checkedBy?: string | null;
  checkedAt?: string | null;
  decisionReason?: string | null;
};

type TemplateChangeRequestRecord = MappingChangeRequestRecord & {
  changeType: 'template_mapping' | 'template_lifecycle' | 'template_current_version';
  proposedPatch: Record<string, unknown>;
};

export type SubmitChangeRequestRecord = {
  changeRequestId: string;
  actorId: string;
};

export type DecideChangeRequestRecord = {
  changeRequestId: string;
  actorId: string;
  decision: Extract<ChangeRequestStatus, 'Approved' | 'Rejected' | 'ChangesRequested'>;
  reason: string;
};

export type ListChangeRequestsRecord = {
  status?: ChangeRequestStatus;
  limit?: number;
  tenantScopes?: string[];
};

export type ListAnalysisResultsRecord = {
  limit?: number;
  tenantScopes?: string[];
};

export type ReviewTaskRecord = {
  taskId: string;
  taskType: string;
  objectType: string;
  objectId: string;
  sourceRunId: string | null;
  priority: string;
  status: ReviewTaskStatus;
  assignedTo: string | null;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type ListReviewTasksRecord = {
  status?: ReviewTaskStatus;
  objectType?: string;
  objectId?: string;
  sourceRunId?: string;
  assignedTo?: string;
  limit?: number;
  tenantScopes?: string[];
};

export type TransitionReviewTaskRecord = {
  taskId: string;
  actorId: string;
  status: Exclude<ReviewTaskStatus, 'Open'>;
  assignedTo?: string;
  reason?: string;
};

export type ConfirmAnalysisRunRecord = {
  runId: string;
  reviewStatus: 'reviewed';
  confirmedAt: string;
};

export type RecordAnalysisResultRecord = {
  runId: string;
  output: AiTemplateAnalysisOutput;
  policyDecision: 'auto_record' | 'review_required' | 'change_request_required' | 'blocked';
  policyReasons: ReadonlyArray<string>;
  modelProvider: string;
  modelName: string;
  promptVersion: string;
  traceRef?: string;
};

export type RecordedAnalysisResultRecord = {
  runId: string;
  status: 'Succeeded';
  reviewTaskId: string | null;
  auditEventId: string;
  completedAt: string;
};

export type RecordAnalysisFailureRecord = {
  runId: string;
  errorCode: string;
  errorMessage: string;
  retryable: boolean;
};

export type RecordedAnalysisFailureRecord = {
  runId: string;
  status: 'Failed';
  auditEventId: string;
  completedAt: string;
};

export type RecordEvaluationResultRecord = {
  evaluationSuite: string;
  pipelineVersion: string;
  promptVersion?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  rulesetVersion?: string | null;
  datasetVersion: string;
  metrics: Record<string, unknown>;
  thresholds: Record<string, unknown>;
  verdict: string;
  reportRef?: string | null;
};

export type RecordedEvaluationResultRecord = {
  evaluationId: string;
  evaluationSuite: string;
  datasetVersion: string;
  verdict: string;
  createdAt: string;
};

export type PipelineReleaseEvidenceRecord = {
  releaseId: string;
  status: 'ReadyForPromotion' | 'BlockedByEvaluation' | string;
  promotionAllowed: boolean;
  requestedBy: string;
  pipelineVersion: string;
  promptVersion: string;
  modelProvider: string;
  modelName: string;
  rulesetVersion: string;
  evaluationSuite: string;
  datasetVersion: string;
  evaluationMode: string;
  evaluationVerdict: string;
  metrics: Record<string, unknown>;
  thresholds: Record<string, unknown>;
  failureCaseIds: string[];
  evidenceHash: string;
  evidence: Record<string, unknown>;
  createdAt: string;
};

export type PipelineReleaseEvidenceLike = {
  releaseId: string;
  status: 'ReadyForPromotion' | 'BlockedByEvaluation' | string;
  promotionAllowed: boolean;
  evidenceHash: string;
  requestedBy: string;
  createdAt: string;
  pipeline: {
    pipelineVersion: string;
    promptVersion: string;
    modelProvider: string;
    modelName: string;
    rulesetVersion: string;
  };
  evaluation: {
    suite: string;
    datasetVersion: string;
    mode: string;
    verdict: string;
    metrics: Record<string, unknown>;
    thresholds: Record<string, unknown>;
    failureCaseIds: string[];
  };
};

export type LatestAnalysisEvaluationResponseRecord = {
  source: {
    kind: 'postgres' | 'replay_fallback';
    persisted: boolean;
    generatedAt: string;
  };
  evaluation: {
    suite: string;
    datasetVersion: string;
    mode: 'replay' | 'provider';
    verdict: 'pass' | 'fail';
    metrics: {
      caseCount: number;
      schemaPassRate: number;
      classificationAccuracy: number;
      routingAccuracy: number;
      placeholderRecall: number;
    };
    thresholds: {
      minCaseCount: number;
      minSchemaPassRate: number;
      minClassificationAccuracy: number;
      minRoutingAccuracy: number;
      minPlaceholderRecall: number;
    };
    failedCaseIds: string[];
  };
  release: {
    releaseId: string;
    status: 'ReadyForPromotion' | 'BlockedByEvaluation';
    promotionAllowed: boolean;
    evidenceHash: string;
    pipeline: {
      pipelineVersion: string;
      promptVersion: string;
      modelProvider: string;
      modelName: string;
      rulesetVersion: string;
    };
  };
};

export type LatestEvaluationRowsRecord = {
  evaluation: {
    evaluation_id: string;
    evaluation_suite: string;
    pipeline_version: string;
    prompt_version: string | null;
    model_provider: string | null;
    model_name: string | null;
    ruleset_version: string | null;
    dataset_version: string;
    metrics_json: unknown;
    thresholds_json: unknown;
    verdict: string;
    report_ref: string | null;
    created_at: unknown;
  };
  release: {
    release_id: string;
    status: string;
    promotion_allowed: boolean;
    requested_by: string;
    pipeline_version: string;
    prompt_version: string;
    model_provider: string;
    model_name: string;
    ruleset_version: string;
    evaluation_suite: string;
    dataset_version: string;
    evaluation_mode: string;
    evaluation_verdict: string;
    metrics_json: unknown;
    thresholds_json: unknown;
    failure_case_ids_json: unknown;
    evidence_hash: string;
    evidence_json: unknown;
    created_at: unknown;
  };
};

export type AiTemplateAnalysisProjection = {
  id: string;
  templateUuid: string;
  versionId: string;
  templateId: string;
  name: string;
  channel: 'SMS' | 'Email' | 'Push' | 'In-app';
  analyzedAt: string;
  maskedMessage: string;
  extractedPattern: string;
  placeholders: string[];
  aiMessageType: string;
  governanceClassification: 'Regulatory' | 'Servicing' | 'Marketing';
  confidence: number;
  qualityScore: number;
  nearestMatch?: {
    templateId: string;
    name: string;
    similarity: number;
  };
  anomalies: string[];
  owner: string;
  reviewStatus: 'needs-review' | 'reviewed' | 'merged';
  lifecycleStatus: 'active' | 'demised';
  routing: {
    reviewTaskId: string | null;
    changeRequestId: string | null;
    policyDecision: string;
  };
  explanation: string[];
};

export type AuditEvidenceEventRecord = {
  auditEventId: string;
  actorId: string | null;
  action: string;
  objectType: string;
  objectId: string;
  sourceRunId: string | null;
  changeRequestId: string | null;
  beforeRef: string | null;
  afterRef: string | null;
  createdAt: string;
};

export type ListAuditEventsRecord = {
  objectType?: string;
  objectId?: string;
  sourceRunId?: string;
  changeRequestId?: string;
  limit?: number;
  tenantScopes?: string[];
};

export type GetAnalysisRunEvidencePackageRecord = {
  runId: string;
  tenantScopes?: string[];
};

export type GetChangeRequestEvidencePackageRecord = {
  changeRequestId: string;
  tenantScopes?: string[];
};

export type ChangeRequestEvidencePackageRecord = {
  packageId: string;
  exportedAt: string;
  changeRequest: MappingChangeRequestRecord;
  proposedPatch: Record<string, unknown>;
  sourceRun: CompletedAnalysisRunRecord;
  auditEvents: AuditEvidenceEventRecord[];
};

export type AnalysisRunEvidencePackageRecord = {
  packageId: string;
  exportedAt: string;
  sourceRun: CompletedAnalysisRunRecord;
  auditEvents: AuditEvidenceEventRecord[];
};

export type AnalysisRunRepository = {
  enqueueRun(command: SubmitAnalysisRunRecord): Promise<QueuedAnalysisRunRecord>;
  getRun(runId: string): Promise<CompletedAnalysisRunRecord | null>;
  listAnalysisResults(
    command?: ListAnalysisResultsRecord,
  ): Promise<AiTemplateAnalysisProjection[]>;
  recordAnalysisResult(
    command: RecordAnalysisResultRecord,
  ): Promise<RecordedAnalysisResultRecord>;
  recordAnalysisFailure(
    command: RecordAnalysisFailureRecord,
  ): Promise<RecordedAnalysisFailureRecord>;
  confirmRun(runId: string): Promise<ConfirmAnalysisRunRecord>;
  createMappingChangeRequest(
    command: CreateMappingChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord>;
  createLifecycleChangeRequest(
    command: CreateLifecycleChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord>;
  createCurrentVersionChangeRequest(
    command: CreateCurrentVersionChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord>;
  listChangeRequests(command?: ListChangeRequestsRecord): Promise<MappingChangeRequestRecord[]>;
  listReviewTasks(command?: ListReviewTasksRecord): Promise<ReviewTaskRecord[]>;
  transitionReviewTask(command: TransitionReviewTaskRecord): Promise<ReviewTaskRecord>;
  listAuditEvents(command?: ListAuditEventsRecord): Promise<AuditEvidenceEventRecord[]>;
  getAnalysisRunEvidencePackage(
    command: GetAnalysisRunEvidencePackageRecord,
  ): Promise<AnalysisRunEvidencePackageRecord | null>;
  getChangeRequestEvidencePackage(
    command: GetChangeRequestEvidencePackageRecord,
  ): Promise<ChangeRequestEvidencePackageRecord | null>;
  submitChangeRequest(command: SubmitChangeRequestRecord): Promise<MappingChangeRequestRecord>;
  decideChangeRequest(command: DecideChangeRequestRecord): Promise<MappingChangeRequestRecord>;
};

export type RepositoryErrorCode =
  | 'open_change_request_exists'
  | 'base_revision_conflict'
  | 'invalid_idempotency_key'
  | 'analysis_run_not_terminal'
  | 'invalid_state_transition'
  | 'access_denied';

export class RepositoryError extends Error {
  constructor(
    readonly code: RepositoryErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

const localAnalysisOutput: AiTemplateAnalysisOutput = {
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
  qualityScore: 87,
  candidateMatches: [
    {
      useCaseId: 'UC-1023',
      name: 'Payment reminder',
      similarity: 95,
      reason: 'Matched payment due pattern and account context',
    },
  ],
  anomalies: ['local_scaffold_response'],
  businessExplanation: [
    'Detected payment context with amount and due date.',
    'Suggested Servicing because the message supports an existing customer obligation.',
  ],
  technicalEvidence: [
    'This local scaffold response exercises the repository seam before Postgres is wired.',
  ],
};

export class InMemoryAnalysisRunRepository implements AnalysisRunRepository {
  private readonly queuedRuns = new Map<string, QueuedAnalysisRunRecord>();
  private readonly completedRuns = new Map<string, CompletedAnalysisRunRecord>();
  private readonly reviewTaskIndex = new Map<string, string>();
  private readonly reviewTasks = new Map<string, ReviewTaskRecord>();
  private readonly auditEvents: AuditEvidenceEventRecord[] = [];
  private readonly idempotencyIndex = new Map<string, string>();
  private readonly changeRequests = new Map<string, TemplateChangeRequestRecord>();
  private readonly changeRequestIdempotencyIndex = new Map<string, string>();
  private readonly templateRevisions = new Map<string, number>();

  async enqueueRun(command: SubmitAnalysisRunRecord): Promise<QueuedAnalysisRunRecord> {
    if (command.idempotencyKey) {
      const existingRunId = this.idempotencyIndex.get(command.idempotencyKey);

      if (existingRunId) {
        const existingRun = this.queuedRuns.get(existingRunId);

        if (existingRun) {
          return {
            ...existingRun,
            idempotencyReused: true,
          };
        }

        const completedRun = this.completedRuns.get(existingRunId);

        if (completedRun) {
          return {
            runId: completedRun.runId,
            status: completedRun.status,
            templateUuid: completedRun.templateUuid,
            versionId: completedRun.versionId,
            createdAt: completedRun.startedAt ?? completedRun.completedAt ?? new Date().toISOString(),
            idempotencyKey: command.idempotencyKey,
            requestedEffort: command.effort,
            idempotencyReused: true,
          };
        }
      }
    }

    const runId = `AR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(this.queuedRuns.size + 1).padStart(4, '0')}`;
    const run: QueuedAnalysisRunRecord = {
      runId,
      status: 'Queued',
      templateUuid: 'pending-template-resolution',
      versionId: command.versionId,
      createdAt: new Date().toISOString(),
      idempotencyKey: command.idempotencyKey ?? null,
      requestedEffort: command.effort,
    };

    this.queuedRuns.set(run.runId, run);

    if (command.idempotencyKey) {
      this.idempotencyIndex.set(command.idempotencyKey, run.runId);
    }

    return run;
  }

  async getRun(runId: string): Promise<CompletedAnalysisRunRecord | null> {
    const completedRun = this.completedRuns.get(runId);

    if (completedRun) {
      return completedRun;
    }

    const now = new Date().toISOString();

    return {
      runId,
      status: 'Succeeded',
      templateUuid: 'tpluuid_local_scaffold',
      versionId: 'tv_local_scaffold',
      pipelineVersion: 'template-analysis-pipeline@local',
      promptVersion: 'template-classifier@local',
      modelProvider: 'noop',
      modelName: 'noop-local',
      rulesetVersion: 'messaging-governance-rules@local',
      startedAt: now,
      completedAt: now,
      traceRef: `trace_${runId}`,
      output: localAnalysisOutput,
    };
  }

  async listAnalysisResults(
    command: ListAnalysisResultsRecord = {},
  ): Promise<AiTemplateAnalysisProjection[]> {
    const completedProjections = Array.from(this.completedRuns.values())
      .filter(hasCompletedOutput)
      .map((run) => ({
      id: run.runId,
      templateUuid: run.templateUuid,
      versionId: run.versionId,
      templateId: run.versionId,
      name: run.versionId,
      channel: 'SMS' as const,
      analyzedAt: run.completedAt,
      maskedMessage: run.output.extractedPattern,
      extractedPattern: run.output.extractedPattern,
      placeholders: run.output.placeholders.map((placeholder) => placeholder.token),
      aiMessageType: run.output.aiMessageType,
      governanceClassification: run.output.governanceClassificationSuggestion,
      confidence: run.output.overallConfidence,
      qualityScore: run.output.qualityScore,
      nearestMatch: run.output.candidateMatches[0]
        ? {
            templateId: run.output.candidateMatches[0].useCaseId,
            name: run.output.candidateMatches[0].name,
            similarity: run.output.candidateMatches[0].similarity,
          }
        : undefined,
      anomalies: [...run.output.anomalies],
      owner: 'Unassigned',
      reviewStatus:
        run.output.overallConfidence >= 90 ? ('reviewed' as const) : ('needs-review' as const),
      lifecycleStatus: 'active' as const,
      routing: {
        reviewTaskId: this.reviewTaskIndex.get(run.runId) ?? null,
        changeRequestId: null,
        policyDecision: this.reviewTaskIndex.has(run.runId) ? 'review_required' : 'auto_record',
      },
      explanation: [...run.output.businessExplanation],
    }));

    if (completedProjections.length > 0) {
      return completedProjections
        .filter((projection) => matchesTenantScope(projection.templateUuid, command.tenantScopes))
        .slice(0, command.limit ?? 100);
    }

    const fallbackProjections: AiTemplateAnalysisProjection[] = [
      {
        id: 'ATA-LOCAL-001',
        templateUuid: 'tpluuid_local_scaffold',
        versionId: 'tv_local_scaffold',
        templateId: 'TPL-LOCAL-001',
        name: 'Payment due reminder',
        channel: 'SMS',
        analyzedAt: new Date().toISOString(),
        maskedMessage:
          'Your payment of *** for account ending **1234 is due on **/**/2026.',
        extractedPattern: localAnalysisOutput.extractedPattern,
        placeholders: localAnalysisOutput.placeholders.map((placeholder) => placeholder.token),
        aiMessageType: localAnalysisOutput.aiMessageType,
        governanceClassification: localAnalysisOutput.governanceClassificationSuggestion,
        confidence: localAnalysisOutput.overallConfidence,
        qualityScore: localAnalysisOutput.qualityScore,
        nearestMatch: {
          templateId: 'TPL-1023',
          name: 'Payment reminder',
          similarity: 95,
        },
        anomalies: [...localAnalysisOutput.anomalies],
        owner: 'Unassigned',
        reviewStatus: 'needs-review',
        lifecycleStatus: 'active',
        routing: {
          reviewTaskId: 'RT-LOCAL-SCAFFOLD',
          changeRequestId: null,
          policyDecision: 'review_required',
        },
        explanation: [...localAnalysisOutput.businessExplanation],
      },
    ];

    return fallbackProjections
      .filter((projection) => matchesTenantScope(projection.templateUuid, command.tenantScopes))
      .slice(0, command.limit ?? 100);
  }

  async recordAnalysisResult(
    command: RecordAnalysisResultRecord,
  ): Promise<RecordedAnalysisResultRecord> {
    const queuedRun = this.queuedRuns.get(command.runId);
    const completedAt = new Date().toISOString();
    const reviewTaskId =
      command.policyDecision === 'review_required' || command.policyDecision === 'blocked'
        ? `RT-${command.runId}`
        : null;
    const auditEventId = `AUD-${command.runId}`;

    if (reviewTaskId) {
      this.reviewTaskIndex.set(command.runId, reviewTaskId);
      this.reviewTasks.set(reviewTaskId, {
        taskId: reviewTaskId,
        taskType: 'analysis_review',
        objectType: 'template',
        objectId: queuedRun?.templateUuid ?? 'pending-template-resolution',
        sourceRunId: command.runId,
        priority: command.policyDecision === 'blocked' ? 'high' : 'normal',
        status: 'Open',
        assignedTo: null,
        reason: command.policyReasons.join(', ') || command.policyDecision,
        createdAt: completedAt,
        resolvedAt: null,
      });
    }

    this.completedRuns.set(command.runId, {
      runId: command.runId,
      status: 'Succeeded',
      templateUuid: queuedRun?.templateUuid ?? 'pending-template-resolution',
      versionId: queuedRun?.versionId ?? 'unknown-version',
      pipelineVersion: 'template-analysis-pipeline@local',
      promptVersion: command.promptVersion,
      modelProvider: command.modelProvider,
      modelName: command.modelName,
      rulesetVersion: 'messaging-governance-rules@local',
      startedAt: queuedRun?.createdAt ?? completedAt,
      completedAt,
      traceRef: command.traceRef ?? `trace_${command.runId}`,
      output: command.output,
    });

    this.auditEvents.push({
      auditEventId,
      actorId: null,
      action: 'analysis_result_recorded',
      objectType: 'analysis_run',
      objectId: command.runId,
      sourceRunId: command.runId,
      changeRequestId: null,
      beforeRef: null,
      afterRef: command.policyDecision,
      createdAt: completedAt,
    });

    return {
      runId: command.runId,
      status: 'Succeeded',
      reviewTaskId,
      auditEventId,
      completedAt,
    };
  }

  async recordAnalysisFailure(
    command: RecordAnalysisFailureRecord,
  ): Promise<RecordedAnalysisFailureRecord> {
    const queuedRun = this.queuedRuns.get(command.runId);
    const completedAt = new Date().toISOString();
    const auditEventId = `AUD-${command.runId}-FAILED`;

    this.completedRuns.set(command.runId, {
      runId: command.runId,
      status: 'Failed',
      templateUuid: queuedRun?.templateUuid ?? 'pending-template-resolution',
      versionId: queuedRun?.versionId ?? 'unknown-version',
      pipelineVersion: 'template-analysis-pipeline@local',
      promptVersion: 'template-analysis-agent@failure',
      modelProvider: 'unknown',
      modelName: 'unknown',
      rulesetVersion: 'messaging-governance-rules@local',
      startedAt: queuedRun?.createdAt ?? completedAt,
      completedAt,
      traceRef: `trace_${command.runId}`,
      errors: [
        {
          code: command.errorCode,
          message: command.errorMessage,
          retryable: command.retryable,
        },
      ],
    });

    return {
      runId: command.runId,
      status: 'Failed',
      auditEventId,
      completedAt,
    };
  }

  async confirmRun(runId: string): Promise<ConfirmAnalysisRunRecord> {
    this.auditEvents.push({
      auditEventId: `AUD-${runId}-CONFIRMED-${this.auditEvents.length + 1}`,
      actorId: null,
      action: 'analysis_run_confirmed',
      objectType: 'analysis_run',
      objectId: runId,
      sourceRunId: runId,
      changeRequestId: null,
      beforeRef: null,
      afterRef: 'reviewed',
      createdAt: new Date().toISOString(),
    });

    return {
      runId,
      reviewStatus: 'reviewed',
      confirmedAt: new Date().toISOString(),
    };
  }

  async createMappingChangeRequest(
    command: CreateMappingChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    return this.createTemplateChangeRequest(command.templateUuid, {
      changeRequestId: `CR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${command.templateUuid}`,
      baseRevision: command.baseRevision,
      sourceRunId: command.sourceRunId,
      changeType: 'template_mapping',
      proposedPatch: {
        targetUseCaseId: command.targetUseCaseId,
        reason: command.reason,
      },
      idempotencyKey: command.idempotencyKey,
    });
  }

  async createLifecycleChangeRequest(
    command: CreateLifecycleChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    return this.createTemplateChangeRequest(command.templateUuid, {
      changeRequestId: `CR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${command.templateUuid}-lifecycle`,
      baseRevision: command.baseRevision,
      sourceRunId: command.sourceRunId,
      changeType: 'template_lifecycle',
      proposedPatch: {
        targetLifecycleStatus: command.targetLifecycleStatus,
        reason: command.reason,
      },
      idempotencyKey: command.idempotencyKey,
    });
  }

  async createCurrentVersionChangeRequest(
    command: CreateCurrentVersionChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    const templateUuid = `pending-template-${command.versionId}`;

    return this.createTemplateChangeRequest(templateUuid, {
      changeRequestId: `CR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${templateUuid}-current-version`,
      baseRevision: command.baseRevision,
      sourceRunId: command.sourceRunId,
      changeType: 'template_current_version',
      proposedPatch: {
        targetVersionId: command.versionId,
        reason: command.reason,
      },
      idempotencyKey: command.idempotencyKey,
    });
  }

  async listChangeRequests(
    command: ListChangeRequestsRecord = {},
  ): Promise<MappingChangeRequestRecord[]> {
    return Array.from(this.changeRequests.values())
      .filter((changeRequest) => !command.status || changeRequest.status === command.status)
      .filter((changeRequest) => matchesTenantScope(changeRequest.objectId, command.tenantScopes))
      .map(toChangeRequestRecord)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, command.limit ?? 100);
  }

  async listReviewTasks(command: ListReviewTasksRecord = {}): Promise<ReviewTaskRecord[]> {
    const tasks =
      this.reviewTasks.size > 0
        ? Array.from(this.reviewTasks.values())
        : [
            {
              taskId: 'RT-LOCAL-SCAFFOLD',
              taskType: 'analysis_review',
              objectType: 'template',
              objectId: 'tpluuid_local_scaffold',
              sourceRunId: 'ATA-LOCAL-001',
              priority: 'normal',
              status: 'Open' as const,
              assignedTo: null,
              reason: 'local scaffold review task for API contract verification',
              createdAt: new Date().toISOString(),
              resolvedAt: null,
            },
          ];

    return tasks
      .filter((task) => !command.status || task.status === command.status)
      .filter((task) => !command.objectType || task.objectType === command.objectType)
      .filter((task) => !command.objectId || task.objectId === command.objectId)
      .filter((task) => !command.sourceRunId || task.sourceRunId === command.sourceRunId)
      .filter((task) => !command.assignedTo || task.assignedTo === command.assignedTo)
      .filter((task) => matchesTenantScope(task.objectId, command.tenantScopes))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, command.limit ?? 100);
  }

  async transitionReviewTask(command: TransitionReviewTaskRecord): Promise<ReviewTaskRecord> {
    const task = this.getExistingReviewTask(command.taskId);
    assertReviewTaskTransition(task, command.status);

    const transitionedAt = new Date().toISOString();
    const assignedTo =
      command.status === 'Assigned' || command.status === 'InReview'
        ? command.assignedTo ?? task.assignedTo ?? command.actorId
        : task.assignedTo;
    const resolvedAt =
      command.status === 'Resolved' || command.status === 'Dismissed'
        ? transitionedAt
        : task.resolvedAt;
    const transitioned: ReviewTaskRecord = {
      ...task,
      status: command.status,
      assignedTo,
      resolvedAt,
    };

    this.reviewTasks.set(transitioned.taskId, transitioned);
    this.auditEvents.push({
      auditEventId: `AUD-${command.taskId}-${command.status}-${this.auditEvents.length + 1}`,
      actorId: command.actorId,
      action: 'review_task_transitioned',
      objectType: task.objectType,
      objectId: task.objectId,
      sourceRunId: task.sourceRunId,
      changeRequestId: null,
      beforeRef: task.status,
      afterRef: command.reason ? `${command.status}: ${command.reason}` : command.status,
      createdAt: transitionedAt,
    });

    return transitioned;
  }

  async getChangeRequestEvidencePackage(
    command: GetChangeRequestEvidencePackageRecord,
  ): Promise<ChangeRequestEvidencePackageRecord | null> {
    const { changeRequestId } = command;
    const changeRequest = this.changeRequests.get(changeRequestId);

    if (!changeRequest) {
      return null;
    }

    if (!matchesTenantScope(changeRequest.objectId, command.tenantScopes)) {
      throw new RepositoryError(
        'access_denied',
        'Data scope does not permit access to this change request evidence package.',
        {
          objectType: 'change_request',
          objectId: changeRequestId,
        },
      );
    }

    const sourceRun = await this.getRun(changeRequest.sourceRunId);

    if (!sourceRun) {
      return null;
    }

    const record = toChangeRequestRecord(changeRequest);
    const auditEvents = toAuditEvents(record);

    return {
      packageId: `EVP-${changeRequestId}`,
      exportedAt: new Date().toISOString(),
      changeRequest: record,
      proposedPatch: { ...changeRequest.proposedPatch },
      sourceRun,
      auditEvents,
    };
  }

  async getAnalysisRunEvidencePackage(
    command: GetAnalysisRunEvidencePackageRecord,
  ): Promise<AnalysisRunEvidencePackageRecord | null> {
    const { runId } = command;
    const sourceRun = await this.getRun(runId);

    if (!sourceRun) {
      return null;
    }

    if (!matchesTenantScope(sourceRun.templateUuid, command.tenantScopes)) {
      throw new RepositoryError(
        'access_denied',
        'Data scope does not permit access to this analysis run evidence package.',
        {
          objectType: 'analysis_run',
          objectId: runId,
        },
      );
    }

    const auditEvents = await this.listAuditEvents({
      sourceRunId: runId,
      limit: 200,
      tenantScopes: command.tenantScopes,
    });

    return {
      packageId: `AEP-${runId}`,
      exportedAt: new Date().toISOString(),
      sourceRun,
      auditEvents,
    };
  }

  async listAuditEvents(
    command: ListAuditEventsRecord = {},
  ): Promise<AuditEvidenceEventRecord[]> {
    const limit = command.limit ?? 100;

    return [
      ...Array.from(this.changeRequests.values()).flatMap((changeRequest) =>
        toAuditEvents(toChangeRequestRecord(changeRequest)),
      ),
      ...this.auditEvents,
    ]
      .filter((event) => !command.objectType || event.objectType === command.objectType)
      .filter((event) => !command.objectId || event.objectId === command.objectId)
      .filter((event) => !command.sourceRunId || event.sourceRunId === command.sourceRunId)
      .filter(
        (event) =>
          !command.changeRequestId || event.changeRequestId === command.changeRequestId,
      )
      .filter((event) => this.matchesAuditEventTenantScope(event, command.tenantScopes))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  private matchesAuditEventTenantScope(
    event: AuditEvidenceEventRecord,
    tenantScopes: string[] | undefined,
  ) {
    if (!tenantScopes || tenantScopes.length === 0) {
      return true;
    }

    if (event.sourceRunId) {
      const sourceRun =
        this.completedRuns.get(event.sourceRunId) ?? this.queuedRuns.get(event.sourceRunId);

      if (sourceRun) {
        return matchesTenantScope(sourceRun.templateUuid, tenantScopes);
      }
    }

    if (event.changeRequestId) {
      const changeRequest = this.changeRequests.get(event.changeRequestId);

      if (changeRequest) {
        return matchesTenantScope(changeRequest.objectId, tenantScopes);
      }
    }

    return matchesTenantScope(event.objectId, tenantScopes);
  }

  private getExistingReviewTask(taskId: string): ReviewTaskRecord {
    const task = this.reviewTasks.get(taskId);

    if (task) {
      return task;
    }

    if (taskId === 'RT-LOCAL-SCAFFOLD') {
      const localTask: ReviewTaskRecord = {
        taskId: 'RT-LOCAL-SCAFFOLD',
        taskType: 'analysis_review',
        objectType: 'template',
        objectId: 'tpluuid_local_scaffold',
        sourceRunId: 'ATA-LOCAL-001',
        priority: 'normal',
        status: 'Open',
        assignedTo: null,
        reason: 'local scaffold review task for API contract verification',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };
      this.reviewTasks.set(localTask.taskId, localTask);
      return localTask;
    }

    throw new RepositoryError(
      'invalid_state_transition',
      'The review task was not found or is no longer actionable.',
      {
        taskId,
      },
    );
  }

  private createTemplateChangeRequest(
    templateUuid: string,
    command: {
      changeRequestId: string;
      baseRevision: number;
      sourceRunId: string;
      changeType: 'template_mapping' | 'template_lifecycle' | 'template_current_version';
      proposedPatch: Record<string, unknown>;
      idempotencyKey?: string;
    },
  ): MappingChangeRequestRecord {
    if (command.idempotencyKey) {
      const existingId = this.changeRequestIdempotencyIndex.get(command.idempotencyKey);
      const existing = existingId ? this.changeRequests.get(existingId) : undefined;

      if (existing) {
        return existing;
      }
    }

    const currentRevision = this.templateRevisions.get(templateUuid) ?? 0;

    if (command.baseRevision !== currentRevision) {
      throw new RepositoryError(
        'base_revision_conflict',
        'The approved object revision has changed. Rebase or withdraw the change request.',
        {
          objectType: 'template',
          objectId: templateUuid,
          expectedRevision: command.baseRevision,
          currentRevision,
        },
      );
    }

    const sourceRun = this.completedRuns.get(command.sourceRunId);
    const queuedSourceRun = this.queuedRuns.get(command.sourceRunId);

    if (queuedSourceRun && (!sourceRun?.output || sourceRun.status !== 'Succeeded')) {
      throw new RepositoryError(
        'analysis_run_not_terminal',
        'The source analysis run must be succeeded and have recorded output before it can support a governed change request.',
        {
          sourceRunId: command.sourceRunId,
          status: sourceRun?.status ?? queuedSourceRun.status,
        },
      );
    }

    const openChangeRequest = Array.from(this.changeRequests.values()).find(
      (changeRequest) =>
        changeRequest.objectId === templateUuid &&
        ['Draft', 'PendingApproval', 'ChangesRequested'].includes(changeRequest.status),
    );

    if (openChangeRequest) {
      throw new RepositoryError(
        'open_change_request_exists',
        'An open change request already exists for this template.',
        {
          objectType: 'template',
          objectId: templateUuid,
          changeRequestId: openChangeRequest.changeRequestId,
        },
      );
    }

    const changeRequest: TemplateChangeRequestRecord = {
      changeRequestId: command.changeRequestId,
      status: 'Draft',
      objectType: 'template',
      objectId: templateUuid,
      baseRevision: command.baseRevision,
      sourceRunId: command.sourceRunId,
      createdAt: new Date().toISOString(),
      idempotencyKey: command.idempotencyKey ?? null,
      changeType: command.changeType,
      proposedPatch: command.proposedPatch,
    };

    this.changeRequests.set(changeRequest.changeRequestId, changeRequest);

    if (command.idempotencyKey) {
      this.changeRequestIdempotencyIndex.set(
        command.idempotencyKey,
        changeRequest.changeRequestId,
      );
    }

    return changeRequest;
  }

  async submitChangeRequest(
    command: SubmitChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    const changeRequest = this.getExistingChangeRequest(command.changeRequestId);

    if (changeRequest.status !== 'Draft' && changeRequest.status !== 'ChangesRequested') {
      throw new RepositoryError(
        'invalid_state_transition',
        'Only a draft or changes-requested change request can be submitted for approval.',
        {
          changeRequestId: command.changeRequestId,
          status: changeRequest.status,
        },
      );
    }

    const submitted: TemplateChangeRequestRecord = {
      ...changeRequest,
      status: 'PendingApproval',
      submittedBy: command.actorId,
      submittedAt: new Date().toISOString(),
      checkedBy: null,
      checkedAt: null,
      decisionReason: null,
    };

    this.changeRequests.set(submitted.changeRequestId, submitted);
    return submitted;
  }

  async decideChangeRequest(
    command: DecideChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    const changeRequest = this.getExistingChangeRequest(command.changeRequestId);

    if (changeRequest.status !== 'PendingApproval') {
      throw new RepositoryError(
        'invalid_state_transition',
        'Only a pending approval change request can receive a checker decision.',
        {
          changeRequestId: command.changeRequestId,
          status: changeRequest.status,
        },
      );
    }

    if (changeRequest.submittedBy === command.actorId) {
      throw new RepositoryError(
        'access_denied',
        'The checker cannot approve, reject, or request changes on their own submission.',
        {
          changeRequestId: command.changeRequestId,
          actorId: command.actorId,
        },
      );
    }

    const decided: TemplateChangeRequestRecord = {
      ...changeRequest,
      status: command.decision,
      checkedBy: command.actorId,
      checkedAt: new Date().toISOString(),
      decisionReason: command.reason,
    };

    if (command.decision === 'Approved') {
      this.templateRevisions.set(
        decided.objectId,
        (this.templateRevisions.get(decided.objectId) ?? decided.baseRevision) + 1,
      );
    }

    this.changeRequests.set(decided.changeRequestId, decided);
    return decided;
  }

  private getExistingChangeRequest(changeRequestId: string): TemplateChangeRequestRecord {
    const changeRequest = this.changeRequests.get(changeRequestId);

    if (!changeRequest) {
      throw new RepositoryError(
        'invalid_state_transition',
        'The change request was not found or is no longer actionable.',
        {
          changeRequestId,
        },
      );
    }

    return changeRequest;
  }
}

function assertReviewTaskTransition(
  task: ReviewTaskRecord,
  targetStatus: TransitionReviewTaskRecord['status'],
) {
  const allowed: Record<ReviewTaskStatus, ReadonlyArray<TransitionReviewTaskRecord['status']>> = {
    Open: ['Assigned', 'InReview', 'Dismissed'],
    Assigned: ['InReview', 'PendingApproval', 'Resolved', 'Dismissed'],
    InReview: ['PendingApproval', 'Resolved', 'Dismissed'],
    PendingApproval: ['Resolved', 'Dismissed'],
    Resolved: [],
    Dismissed: [],
  };

  if (!allowed[task.status].includes(targetStatus)) {
    throw new RepositoryError(
      'invalid_state_transition',
      'The requested review task transition is not allowed.',
      {
        taskId: task.taskId,
        status: task.status,
        targetStatus,
      },
    );
  }
}

function toChangeRequestRecord(
  changeRequest: TemplateChangeRequestRecord,
): MappingChangeRequestRecord {
  const { changeType: _changeType, proposedPatch: _proposedPatch, ...record } = changeRequest;
  return record;
}

function toAuditEvents(record: MappingChangeRequestRecord): AuditEvidenceEventRecord[] {
  const auditEvents: AuditEvidenceEventRecord[] = [];

  if (record.submittedBy && record.submittedAt) {
    auditEvents.push({
      auditEventId: `AUD-${record.changeRequestId}-submitted`,
      actorId: record.submittedBy,
      action: 'change_request_submitted',
      objectType: record.objectType,
      objectId: record.objectId,
      sourceRunId: record.sourceRunId,
      changeRequestId: record.changeRequestId,
      beforeRef: 'Draft',
      afterRef: 'PendingApproval',
      createdAt: record.submittedAt,
    });
  }

  if (record.checkedBy && record.checkedAt) {
    auditEvents.push({
      auditEventId: `AUD-${record.changeRequestId}-decided`,
      actorId: record.checkedBy,
      action: 'change_request_decided',
      objectType: record.objectType,
      objectId: record.objectId,
      sourceRunId: record.sourceRunId,
      changeRequestId: record.changeRequestId,
      beforeRef: 'PendingApproval',
      afterRef: record.status,
      createdAt: record.checkedAt,
    });
  }

  return auditEvents;
}

function matchesTenantScope(objectId: string, tenantScopes: string[] | undefined) {
  if (!tenantScopes || tenantScopes.length === 0) {
    return true;
  }

  return tenantScopes.includes('local') && objectId.startsWith('tpluuid_');
}

function hasCompletedOutput(
  run: CompletedAnalysisRunRecord,
): run is CompletedAnalysisRunRecord & {
  completedAt: string;
  output: AiTemplateAnalysisOutput;
} {
  return Boolean(run.completedAt && run.output);
}
