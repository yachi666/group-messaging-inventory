import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import pg from 'pg';
import type {
  AiTemplateAnalysisOutput,
  AnalysisEffort,
  GovernanceClassification,
  TemplateLifecycleStatus,
} from '@gmi/domain';
import { RepositoryError } from './index.js';
import type {
  AnalysisRunRepository,
  AiTemplateAnalysisProjection,
  ConfirmAnalysisRunRecord,
  CompletedAnalysisRunRecord,
  CreateCurrentVersionChangeRequestRecord,
  CreateMappingChangeRequestRecord,
  CreateLifecycleChangeRequestRecord,
  DecideChangeRequestRecord,
  Database,
  ChangeRequestEvidencePackageRecord,
  ListAuditEventsRecord,
  ListChangeRequestsRecord,
  LatestAnalysisEvaluationResponseRecord,
  LatestEvaluationRowsRecord,
  MappingChangeRequestRecord,
  PipelineReleaseEvidenceLike,
  PipelineReleaseEvidenceRecord,
  QueuedAnalysisRunRecord,
  RecordedAnalysisFailureRecord,
  RecordedAnalysisResultRecord,
  RecordedEvaluationResultRecord,
  RecordAnalysisFailureRecord,
  RecordAnalysisResultRecord,
  RecordEvaluationResultRecord,
  SubmitChangeRequestRecord,
  SubmitAnalysisRunRecord,
  AuditEvidenceEventRecord,
} from './index.js';

const { Pool } = pg;

function jsonb(value: unknown) {
  return sql`${JSON.stringify(value)}::jsonb`;
}

export type PostgresConnectionOptions = {
  connectionString: string;
};

export function createPostgresPool(options: PostgresConnectionOptions) {
  return new Pool({
    connectionString: options.connectionString,
  });
}

export function createPostgresDatabase(pool: pg.Pool): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}

export async function migratePostgresDatabase(db: Kysely<Database>) {
  const migrationsDir = await resolveMigrationsDir();
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  await sql`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `.execute(db);

  for (const fileName of migrationFiles) {
    const existing = await sql<{ version: string }>`
      select version from schema_migrations where version = ${fileName}
    `.execute(db);

    if (existing.rows.length > 0) {
      continue;
    }

    const migrationSql = await fs.readFile(path.join(migrationsDir, fileName), 'utf8');

    await db.transaction().execute(async (trx) => {
      await sql.raw(migrationSql).execute(trx);
      await sql`
        insert into schema_migrations (version) values (${fileName})
      `.execute(trx);
    });
  }
}

export async function recordAnalysisEvaluation(
  db: Kysely<Database>,
  command: RecordEvaluationResultRecord,
): Promise<RecordedEvaluationResultRecord> {
  const evaluationId = `EVAL-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;

  await db
    .insertInto('analysis_evaluations')
    .values({
      evaluation_id: evaluationId,
      evaluation_suite: command.evaluationSuite,
      pipeline_version: command.pipelineVersion,
      prompt_version: command.promptVersion ?? null,
      model_provider: command.modelProvider ?? null,
      model_name: command.modelName ?? null,
      ruleset_version: command.rulesetVersion ?? null,
      dataset_version: command.datasetVersion,
      metrics_json: jsonb(command.metrics),
      thresholds_json: jsonb(command.thresholds),
      verdict: command.verdict,
      report_ref: command.reportRef ?? null,
    })
    .execute();

  return {
    evaluationId,
    evaluationSuite: command.evaluationSuite,
    datasetVersion: command.datasetVersion,
    verdict: command.verdict,
    createdAt: new Date().toISOString(),
  };
}

export function mapPipelineReleaseEvidenceToRecord(
  evidence: PipelineReleaseEvidenceLike,
): PipelineReleaseEvidenceRecord {
  return {
    releaseId: evidence.releaseId,
    status: evidence.status,
    promotionAllowed: evidence.promotionAllowed,
    requestedBy: evidence.requestedBy,
    pipelineVersion: evidence.pipeline.pipelineVersion,
    promptVersion: evidence.pipeline.promptVersion,
    modelProvider: evidence.pipeline.modelProvider,
    modelName: evidence.pipeline.modelName,
    rulesetVersion: evidence.pipeline.rulesetVersion,
    evaluationSuite: evidence.evaluation.suite,
    datasetVersion: evidence.evaluation.datasetVersion,
    evaluationMode: evidence.evaluation.mode,
    evaluationVerdict: evidence.evaluation.verdict,
    metrics: evidence.evaluation.metrics,
    thresholds: evidence.evaluation.thresholds,
    failureCaseIds: evidence.evaluation.failureCaseIds,
    evidenceHash: evidence.evidenceHash,
    evidence: evidence as unknown as Record<string, unknown>,
    createdAt: evidence.createdAt,
  };
}

export async function recordPipelineReleaseEvidence(
  db: Kysely<Database>,
  evidence: PipelineReleaseEvidenceLike,
): Promise<PipelineReleaseEvidenceRecord> {
  const record = mapPipelineReleaseEvidenceToRecord(evidence);

  await db
    .insertInto('pipeline_releases')
    .values({
      release_id: record.releaseId,
      status: record.status,
      promotion_allowed: record.promotionAllowed,
      requested_by: record.requestedBy,
      pipeline_version: record.pipelineVersion,
      prompt_version: record.promptVersion,
      model_provider: record.modelProvider,
      model_name: record.modelName,
      ruleset_version: record.rulesetVersion,
      evaluation_suite: record.evaluationSuite,
      dataset_version: record.datasetVersion,
      evaluation_mode: record.evaluationMode,
      evaluation_verdict: record.evaluationVerdict,
      metrics_json: jsonb(record.metrics),
      thresholds_json: jsonb(record.thresholds),
      failure_case_ids_json: jsonb(record.failureCaseIds),
      evidence_hash: record.evidenceHash,
      evidence_json: jsonb(record.evidence),
      created_at: record.createdAt,
    })
    .onConflict((oc) =>
      oc.column('release_id').doUpdateSet({
        status: record.status,
        promotion_allowed: record.promotionAllowed,
        evidence_hash: record.evidenceHash,
        evidence_json: jsonb(record.evidence),
      }),
    )
    .execute();

  return record;
}

export function mapLatestEvaluationRowsToResponse(
  rows: LatestEvaluationRowsRecord,
): LatestAnalysisEvaluationResponseRecord {
  return {
    source: {
      kind: 'postgres',
      persisted: true,
      generatedAt: toIsoString(rows.release.created_at),
    },
    evaluation: {
      suite: rows.evaluation.evaluation_suite,
      datasetVersion: rows.evaluation.dataset_version,
      mode: toEvaluationMode(rows.release.evaluation_mode),
      verdict: toEvaluationVerdict(rows.evaluation.verdict),
      metrics: toEvaluationMetrics(rows.evaluation.metrics_json),
      thresholds: toEvaluationThresholds(rows.evaluation.thresholds_json),
      failedCaseIds: toStringArray(rows.release.failure_case_ids_json),
    },
    release: {
      releaseId: rows.release.release_id,
      status: toReleaseStatus(rows.release.status),
      promotionAllowed: rows.release.promotion_allowed,
      evidenceHash: rows.release.evidence_hash,
      pipeline: {
        pipelineVersion: rows.release.pipeline_version,
        promptVersion: rows.release.prompt_version,
        modelProvider: rows.release.model_provider,
        modelName: rows.release.model_name,
        rulesetVersion: rows.release.ruleset_version,
      },
    },
  };
}

export async function getLatestAnalysisEvaluation(
  db: Kysely<Database>,
): Promise<LatestAnalysisEvaluationResponseRecord | null> {
  const release = await db
    .selectFrom('pipeline_releases')
    .selectAll()
    .orderBy('created_at', 'desc')
    .limit(1)
    .executeTakeFirst();

  if (!release) {
    return null;
  }

  const evaluation = await db
    .selectFrom('analysis_evaluations')
    .selectAll()
    .where('evaluation_suite', '=', release.evaluation_suite)
    .where('dataset_version', '=', release.dataset_version)
    .orderBy('created_at', 'desc')
    .limit(1)
    .executeTakeFirst();

  if (!evaluation) {
    return null;
  }

  return mapLatestEvaluationRowsToResponse({ evaluation, release });
}

function toEvaluationMode(value: string): LatestAnalysisEvaluationResponseRecord['evaluation']['mode'] {
  return value === 'provider' ? 'provider' : 'replay';
}

function toEvaluationVerdict(
  value: string,
): LatestAnalysisEvaluationResponseRecord['evaluation']['verdict'] {
  return value === 'fail' ? 'fail' : 'pass';
}

function toReleaseStatus(
  value: string,
): LatestAnalysisEvaluationResponseRecord['release']['status'] {
  return value === 'BlockedByEvaluation' ? 'BlockedByEvaluation' : 'ReadyForPromotion';
}

function toEvaluationMetrics(
  value: unknown,
): LatestAnalysisEvaluationResponseRecord['evaluation']['metrics'] {
  const metrics = toRecord(value);

  return {
    caseCount: toNumber(metrics.caseCount),
    schemaPassRate: toNumber(metrics.schemaPassRate),
    classificationAccuracy: toNumber(metrics.classificationAccuracy),
    routingAccuracy: toNumber(metrics.routingAccuracy),
    placeholderRecall: toNumber(metrics.placeholderRecall),
  };
}

function toEvaluationThresholds(
  value: unknown,
): LatestAnalysisEvaluationResponseRecord['evaluation']['thresholds'] {
  const thresholds = toRecord(value);

  return {
    minCaseCount: toNumber(thresholds.minCaseCount),
    minSchemaPassRate: toNumber(thresholds.minSchemaPassRate),
    minClassificationAccuracy: toNumber(thresholds.minClassificationAccuracy),
    minRoutingAccuracy: toNumber(thresholds.minRoutingAccuracy),
    minPlaceholderRecall: toNumber(thresholds.minPlaceholderRecall),
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toNumber(value: unknown) {
  return typeof value === 'number' ? value : 0;
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

async function resolveMigrationsDir() {
  const candidates = [
    path.resolve(process.cwd(), 'packages/db/migrations'),
    path.resolve(process.cwd(), 'migrations'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations'),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);

      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Could not find migrations directory. Tried: ${candidates.join(', ')}`);
}

export class PostgresAnalysisRunRepository implements AnalysisRunRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async onModuleDestroy() {
    await this.db.destroy();
  }

  async enqueueRun(command: SubmitAnalysisRunRecord): Promise<QueuedAnalysisRunRecord> {
    if (command.idempotencyKey) {
      const existing = await this.db
        .selectFrom('analysis_runs')
        .select([
          'run_id',
          'status',
          'template_uuid',
          'version_id',
          'created_at',
          'idempotency_key',
        ])
        .where('idempotency_key', '=', command.idempotencyKey)
        .executeTakeFirst();

      if (existing) {
        return {
          runId: existing.run_id,
          status: 'Queued',
          templateUuid: existing.template_uuid,
          versionId: existing.version_id,
          createdAt: toIsoString(existing.created_at),
          idempotencyKey: existing.idempotency_key,
          requestedEffort: command.effort,
        };
      }
    }

    const templateUuid = `tpluuid_${command.versionId}`;
    const runId = `AR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;

    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('templates')
        .values({
          template_uuid: templateUuid,
          platform: 'MDP',
          tenant_or_workspace: 'local',
          external_template_id: command.versionId,
          current_version_id: null,
          parent_use_case_id: null,
          mapping_status: 'Unassigned',
          lifecycle_status: 'Active',
          approval_status: 'Draft',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          approved_revision: 0,
          updated_at: new Date(),
        })
        .onConflict((oc) =>
          oc.columns(['platform', 'tenant_or_workspace', 'external_template_id']).doNothing(),
        )
        .execute();

      await trx
        .insertInto('template_versions')
        .values({
          version_id: command.versionId,
          template_uuid: templateUuid,
          version_number: 1,
          masked_content: command.reason,
          content_fingerprint: `local:${command.versionId}`,
          configuration_fingerprint: 'local:default',
          variables_json: jsonb([]),
          material_configuration_snapshot_json: jsonb({}),
          change_summary: null,
          previous_version_id: null,
          version_status: 'Candidate',
          approval_status: 'Draft',
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          effective_at: null,
        })
        .onConflict((oc) => oc.column('version_id').doNothing())
        .execute();

      await trx
        .insertInto('analysis_runs')
        .values({
          run_id: runId,
          template_uuid: templateUuid,
          version_id: command.versionId,
          trigger_type: command.triggerType,
          triggered_by: null,
          source_input_snapshot_id: null,
          masked_input_summary: command.reason,
          pipeline_version: 'template-analysis-pipeline@local',
          prompt_version: null,
          model_provider: null,
          model_name: null,
          model_version: null,
          ruleset_version: 'messaging-governance-rules@local',
          embedding_version: null,
          retrieved_context_refs_json: jsonb([]),
          status: 'Queued',
          started_at: null,
          completed_at: null,
          duration_ms: null,
          warnings_json: jsonb([]),
          errors_json: jsonb([]),
          retry_count: 0,
          trace_ref: null,
          idempotency_key: command.idempotencyKey ?? null,
        })
        .execute();
    });

    return {
      runId,
      status: 'Queued',
      templateUuid,
      versionId: command.versionId,
      createdAt: new Date().toISOString(),
      idempotencyKey: command.idempotencyKey ?? null,
      requestedEffort: command.effort,
    };
  }

  async getRun(runId: string): Promise<CompletedAnalysisRunRecord | null> {
    const run = await this.db
      .selectFrom('analysis_runs')
      .selectAll()
      .where('run_id', '=', runId)
      .executeTakeFirst();

    if (!run) {
      return null;
    }

    const output = await this.db
      .selectFrom('analysis_outputs')
      .selectAll()
      .where('run_id', '=', runId)
      .executeTakeFirst();

    return {
      runId,
      status: run.status,
      templateUuid: run.template_uuid,
      versionId: run.version_id,
      pipelineVersion: run.pipeline_version,
      ...(run.prompt_version ? { promptVersion: run.prompt_version } : {}),
      ...(run.model_provider ? { modelProvider: run.model_provider } : {}),
      ...(run.model_name ? { modelName: run.model_name } : {}),
      ...(run.ruleset_version ? { rulesetVersion: run.ruleset_version } : {}),
      ...(run.started_at ? { startedAt: toIsoString(run.started_at) } : {}),
      ...(run.completed_at ? { completedAt: toIsoString(run.completed_at) } : {}),
      ...(run.trace_ref ? { traceRef: run.trace_ref } : {}),
      ...(output ? { output: mapAnalysisOutput(output) } : {}),
    };
  }

  async listAnalysisResults(): Promise<AiTemplateAnalysisProjection[]> {
    const rows = await this.db
      .selectFrom('analysis_runs as ar')
      .innerJoin('template_versions as tv', 'tv.version_id', 'ar.version_id')
      .leftJoin('analysis_outputs as ao', 'ao.run_id', 'ar.run_id')
      .select([
        'ar.run_id',
        'ar.version_id',
        'ar.created_at',
        'ar.masked_input_summary',
        'tv.template_uuid',
        'tv.masked_content',
        'ao.extracted_pattern',
        'ao.placeholders_json',
        'ao.ai_message_type',
        'ao.governance_classification_suggestion',
        'ao.overall_confidence',
        'ao.quality_score',
        'ao.candidate_matches_json',
        'ao.anomalies_json',
        'ao.business_explanation_json',
      ])
      .orderBy('ar.created_at', 'desc')
      .limit(50)
      .execute();

    return rows.map((row) => {
      const candidateMatches = asArray<{
        templateId?: string;
        useCaseId?: string;
        name: string;
        similarity: number;
      }>(row.candidate_matches_json);
      const nearestMatch = candidateMatches[0]
        ? {
            templateId: candidateMatches[0].templateId ?? candidateMatches[0].useCaseId ?? 'unknown',
            name: candidateMatches[0].name,
            similarity: candidateMatches[0].similarity,
          }
        : undefined;

      return {
        id: row.run_id,
        templateUuid: row.template_uuid,
        versionId: row.version_id,
        templateId: row.version_id,
        name: row.version_id,
        channel: 'SMS',
        analyzedAt: toIsoString(row.created_at),
        maskedMessage: row.masked_content || row.masked_input_summary,
        extractedPattern: row.extracted_pattern ?? row.masked_content ?? row.masked_input_summary,
        placeholders: asArray<{ token: string }>(row.placeholders_json).map(
          (placeholder) => placeholder.token,
        ),
        aiMessageType: row.ai_message_type ?? 'Unknown',
        governanceClassification:
          (row.governance_classification_suggestion as
            | 'Regulatory'
            | 'Servicing'
            | 'Marketing'
            | null) ?? 'Servicing',
        confidence: row.overall_confidence ?? 0,
        qualityScore: row.quality_score ?? 0,
        ...(nearestMatch ? { nearestMatch } : {}),
        anomalies: asArray<string>(row.anomalies_json),
        owner: 'Unassigned',
        reviewStatus: row.overall_confidence && row.overall_confidence >= 90 ? 'reviewed' : 'needs-review',
        lifecycleStatus: 'active',
        explanation: asArray<string>(row.business_explanation_json),
      };
    });
  }

  async recordAnalysisResult(
    command: RecordAnalysisResultRecord,
  ): Promise<RecordedAnalysisResultRecord> {
    const completedAt = new Date();
    const outputId = `AO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;
    const reviewTaskId =
      command.policyDecision === 'review_required' || command.policyDecision === 'blocked'
        ? `RT-${command.runId}`
        : null;
    const auditEventId = `AUD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;

    await this.db.transaction().execute(async (trx) => {
      const run = await trx
        .selectFrom('analysis_runs')
        .select(['run_id', 'template_uuid', 'started_at'])
        .where('run_id', '=', command.runId)
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('analysis_runs')
        .set({
          status: 'Succeeded',
          started_at: run.started_at ?? completedAt,
          completed_at: completedAt,
          model_provider: command.modelProvider,
          model_name: command.modelName,
          prompt_version: command.promptVersion,
          trace_ref: command.traceRef ?? `trace_${command.runId}`,
          warnings_json: jsonb(command.policyReasons),
        })
        .where('run_id', '=', command.runId)
        .execute();

      await trx
        .insertInto('analysis_outputs')
        .values({
          output_id: outputId,
          run_id: command.runId,
          extracted_pattern: command.output.extractedPattern,
          placeholders_json: jsonb(command.output.placeholders),
          ai_message_type: command.output.aiMessageType,
          governance_classification_suggestion:
            command.output.governanceClassificationSuggestion,
          candidate_matches_json: jsonb(command.output.candidateMatches),
          similar_templates_json: jsonb([]),
          field_confidence_json: jsonb({}),
          overall_confidence: command.output.overallConfidence,
          quality_score: command.output.qualityScore,
          anomalies_json: jsonb(command.output.anomalies),
          business_explanation_json: jsonb(command.output.businessExplanation),
          technical_evidence_json: jsonb(command.output.technicalEvidence),
        })
        .onConflict((oc) =>
          oc.column('run_id').doUpdateSet({
            extracted_pattern: command.output.extractedPattern,
            placeholders_json: jsonb(command.output.placeholders),
            ai_message_type: command.output.aiMessageType,
            governance_classification_suggestion:
              command.output.governanceClassificationSuggestion,
            candidate_matches_json: jsonb(command.output.candidateMatches),
            overall_confidence: command.output.overallConfidence,
            quality_score: command.output.qualityScore,
            anomalies_json: jsonb(command.output.anomalies),
            business_explanation_json: jsonb(command.output.businessExplanation),
            technical_evidence_json: jsonb(command.output.technicalEvidence),
          }),
        )
        .execute();

      if (reviewTaskId) {
        await trx
          .insertInto('review_tasks')
          .values({
            task_id: reviewTaskId,
            task_type: 'analysis_review',
            object_type: 'template',
            object_id: run.template_uuid,
            source_run_id: command.runId,
            priority: command.policyDecision === 'blocked' ? 'high' : 'normal',
            status: 'Open',
            assigned_to: null,
            reason: command.policyReasons.join(', ') || command.policyDecision,
            resolved_at: null,
          })
          .onConflict((oc) => oc.column('task_id').doNothing())
          .execute();
      }

      await trx
        .insertInto('audit_events')
        .values({
          audit_event_id: auditEventId,
          actor_id: null,
          action: 'analysis_result_recorded',
          object_type: 'analysis_run',
          object_id: command.runId,
          source_run_id: command.runId,
          change_request_id: null,
          before_ref: null,
          after_ref: command.policyDecision,
        })
        .execute();
    });

    return {
      runId: command.runId,
      status: 'Succeeded',
      reviewTaskId,
      auditEventId,
      completedAt: toIsoString(completedAt),
    };
  }

  async recordAnalysisFailure(
    command: RecordAnalysisFailureRecord,
  ): Promise<RecordedAnalysisFailureRecord> {
    const completedAt = new Date();
    const auditEventId = `AUD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;
    const errorPayload = [
      {
        code: command.errorCode,
        message: command.errorMessage,
        retryable: command.retryable,
      },
    ];

    await this.db.transaction().execute(async (trx) => {
      const run = await trx
        .selectFrom('analysis_runs')
        .select(['run_id', 'started_at'])
        .where('run_id', '=', command.runId)
        .executeTakeFirstOrThrow();

      await trx
        .updateTable('analysis_runs')
        .set({
          status: 'Failed',
          started_at: run.started_at ?? completedAt,
          completed_at: completedAt,
          errors_json: jsonb(errorPayload),
        })
        .where('run_id', '=', command.runId)
        .execute();

      await trx
        .insertInto('audit_events')
        .values({
          audit_event_id: auditEventId,
          actor_id: null,
          action: 'analysis_run_failed',
          object_type: 'analysis_run',
          object_id: command.runId,
          source_run_id: command.runId,
          change_request_id: null,
          before_ref: null,
          after_ref: command.errorCode,
        })
        .execute();
    });

    return {
      runId: command.runId,
      status: 'Failed',
      auditEventId,
      completedAt: toIsoString(completedAt),
    };
  }

  async confirmRun(runId: string): Promise<ConfirmAnalysisRunRecord> {
    await this.db
      .insertInto('audit_events')
      .values({
        audit_event_id: `AUD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`,
        actor_id: null,
        action: 'analysis_run_confirmed',
        object_type: 'analysis_run',
        object_id: runId,
        source_run_id: runId,
        change_request_id: null,
        before_ref: null,
        after_ref: 'reviewed',
      })
      .execute();

    return {
      runId,
      reviewStatus: 'reviewed',
      confirmedAt: new Date().toISOString(),
    };
  }

  async createMappingChangeRequest(
    command: CreateMappingChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    return this.createTemplateChangeRequest({
      templateUuid: command.templateUuid,
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
    return this.createTemplateChangeRequest({
      templateUuid: command.templateUuid,
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
    const templateVersion = await this.db
      .selectFrom('template_versions')
      .select(['template_uuid'])
      .where('version_id', '=', command.versionId)
      .executeTakeFirst();
    const templateUuid = templateVersion?.template_uuid ?? `pending-template-${command.versionId}`;

    return this.createTemplateChangeRequest({
      templateUuid,
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
    let query = this.db
      .selectFrom('change_requests')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(100);

    if (command.status) {
      query = query.where('status', '=', command.status);
    }

    const rows = await query.execute();

    return rows.map(mapChangeRequest);
  }

  async getChangeRequestEvidencePackage(
    changeRequestId: string,
  ): Promise<ChangeRequestEvidencePackageRecord | null> {
    const changeRequest = await this.db
      .selectFrom('change_requests')
      .selectAll()
      .where('change_request_id', '=', changeRequestId)
      .executeTakeFirst();

    if (!changeRequest?.source_run_id) {
      return null;
    }

    const sourceRun = await this.getRun(changeRequest.source_run_id);

    if (!sourceRun) {
      return null;
    }

    const auditRows = await this.db
      .selectFrom('audit_events')
      .selectAll()
      .where('change_request_id', '=', changeRequestId)
      .orderBy('created_at', 'asc')
      .execute();

    return {
      packageId: `EVP-${changeRequestId}`,
      exportedAt: new Date().toISOString(),
      changeRequest: mapChangeRequest(changeRequest),
      proposedPatch: asRecord(changeRequest.proposed_patch_json),
      sourceRun,
      auditEvents: auditRows.map((row) => ({
        ...mapAuditEvent(row),
      })),
    };
  }

  async listAuditEvents(
    command: ListAuditEventsRecord = {},
  ): Promise<AuditEvidenceEventRecord[]> {
    let query = this.db
      .selectFrom('audit_events')
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(command.limit ?? 100);

    if (command.objectType) {
      query = query.where('object_type', '=', command.objectType);
    }

    if (command.objectId) {
      query = query.where('object_id', '=', command.objectId);
    }

    if (command.sourceRunId) {
      query = query.where('source_run_id', '=', command.sourceRunId);
    }

    if (command.changeRequestId) {
      query = query.where('change_request_id', '=', command.changeRequestId);
    }

    const rows = await query.execute();

    return rows.map(mapAuditEvent);
  }

  private async createTemplateChangeRequest(command: {
    templateUuid: string;
    baseRevision: number;
    sourceRunId: string;
    changeType: 'template_mapping' | 'template_lifecycle' | 'template_current_version';
    proposedPatch: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<MappingChangeRequestRecord> {
    if (command.idempotencyKey) {
      const existing = await this.db
        .selectFrom('change_requests')
        .select([
          'change_request_id',
          'object_id',
          'base_revision',
          'source_run_id',
          'created_at',
          'idempotency_key',
        ])
        .where('idempotency_key', '=', command.idempotencyKey)
        .executeTakeFirst();

      if (existing) {
        return {
          changeRequestId: existing.change_request_id,
          status: 'Draft',
          objectType: 'template',
          objectId: existing.object_id,
          baseRevision: existing.base_revision,
          sourceRunId: existing.source_run_id ?? command.sourceRunId,
          createdAt: toIsoString(existing.created_at),
          idempotencyKey: existing.idempotency_key,
        };
      }
    }

    const template = await this.db
      .selectFrom('templates')
      .select(['approved_revision'])
      .where('template_uuid', '=', command.templateUuid)
      .executeTakeFirst();
    const currentRevision = template?.approved_revision ?? 0;

    if (command.baseRevision !== currentRevision) {
      throw new RepositoryError(
        'base_revision_conflict',
        'The approved object revision has changed. Rebase or withdraw the change request.',
        {
          objectType: 'template',
          objectId: command.templateUuid,
          expectedRevision: command.baseRevision,
          currentRevision,
        },
      );
    }

    const sourceRun = await this.db
      .selectFrom('analysis_runs as ar')
      .leftJoin('analysis_outputs as ao', 'ao.run_id', 'ar.run_id')
      .select(['ar.status', 'ao.output_id'])
      .where('ar.run_id', '=', command.sourceRunId)
      .executeTakeFirst();

    if (sourceRun?.status !== 'Succeeded' || !sourceRun.output_id) {
      throw new RepositoryError(
        'analysis_run_not_terminal',
        'The source analysis run must be succeeded and have recorded output before it can support a governed change request.',
        {
          sourceRunId: command.sourceRunId,
          status: sourceRun?.status ?? 'unknown',
        },
      );
    }

    const openChangeRequest = await this.db
      .selectFrom('change_requests')
      .select(['change_request_id'])
      .where('object_type', '=', 'template')
      .where('object_id', '=', command.templateUuid)
      .where('status', 'in', ['Draft', 'PendingApproval', 'ChangesRequested'])
      .executeTakeFirst();

    if (openChangeRequest) {
      throw new RepositoryError(
        'open_change_request_exists',
        'An open change request already exists for this template.',
        {
          objectType: 'template',
          objectId: command.templateUuid,
          changeRequestId: openChangeRequest.change_request_id,
        },
      );
    }

    const changeRequestId = `CR-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;

    await this.db
      .insertInto('change_requests')
      .values({
        change_request_id: changeRequestId,
        object_type: 'template',
        object_id: command.templateUuid,
        base_revision: command.baseRevision,
        source_run_id: command.sourceRunId,
        change_type: command.changeType,
        proposed_patch_json: jsonb(command.proposedPatch),
        status: 'Draft',
        submitted_by: null,
        submitted_at: null,
        checked_by: null,
        checked_at: null,
        decision_reason: null,
        idempotency_key: command.idempotencyKey ?? null,
      })
      .execute();

    return {
      changeRequestId,
      status: 'Draft',
      objectType: 'template',
      objectId: command.templateUuid,
      baseRevision: command.baseRevision,
      sourceRunId: command.sourceRunId,
      createdAt: new Date().toISOString(),
      idempotencyKey: command.idempotencyKey ?? null,
    };
  }

  async submitChangeRequest(
    command: SubmitChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    const submittedAt = new Date();
    const auditEventId = `AUD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;

    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('change_requests')
        .selectAll()
        .where('change_request_id', '=', command.changeRequestId)
        .executeTakeFirst();

      if (!existing || (existing.status !== 'Draft' && existing.status !== 'ChangesRequested')) {
        throw new RepositoryError(
          'invalid_state_transition',
          'Only a draft or changes-requested change request can be submitted for approval.',
          {
            changeRequestId: command.changeRequestId,
            status: existing?.status ?? 'not_found',
          },
        );
      }

      await trx
        .updateTable('change_requests')
        .set({
          status: 'PendingApproval',
          submitted_by: command.actorId,
          submitted_at: submittedAt,
          checked_by: null,
          checked_at: null,
          decision_reason: null,
        })
        .where('change_request_id', '=', command.changeRequestId)
        .execute();

      await trx
        .insertInto('audit_events')
        .values({
          audit_event_id: auditEventId,
          actor_id: command.actorId,
          action: 'change_request_submitted',
          object_type: existing.object_type,
          object_id: existing.object_id,
          source_run_id: existing.source_run_id,
          change_request_id: existing.change_request_id,
          before_ref: existing.status,
          after_ref: 'PendingApproval',
        })
        .execute();

      return mapChangeRequest({
        ...existing,
        status: 'PendingApproval',
        submitted_by: command.actorId,
        submitted_at: submittedAt,
        checked_by: null,
        checked_at: null,
        decision_reason: null,
      });
    });
  }

  async decideChangeRequest(
    command: DecideChangeRequestRecord,
  ): Promise<MappingChangeRequestRecord> {
    const checkedAt = new Date();
    const auditEventId = `AUD-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`;

    return this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('change_requests')
        .selectAll()
        .where('change_request_id', '=', command.changeRequestId)
        .executeTakeFirst();

      if (!existing || existing.status !== 'PendingApproval') {
        throw new RepositoryError(
          'invalid_state_transition',
          'Only a pending approval change request can receive a checker decision.',
          {
            changeRequestId: command.changeRequestId,
            status: existing?.status ?? 'not_found',
          },
        );
      }

      if (existing.submitted_by === command.actorId) {
        throw new RepositoryError(
          'access_denied',
          'The checker cannot approve, reject, or request changes on their own submission.',
          {
            changeRequestId: command.changeRequestId,
            actorId: command.actorId,
          },
        );
      }

      if (command.decision === 'Approved') {
        const proposedPatch = asRecord(existing.proposed_patch_json);
        const updateResult = await applyApprovedTemplatePatch({
          trx,
          objectId: existing.object_id,
          baseRevision: existing.base_revision,
          changeType: existing.change_type,
          proposedPatch,
          checkedAt,
        });

        if (Number(updateResult.numUpdatedRows) !== 1) {
          throw new RepositoryError(
            'base_revision_conflict',
            'The approved object revision has changed. Rebase or withdraw the change request.',
            {
              objectType: existing.object_type,
              objectId: existing.object_id,
              expectedRevision: existing.base_revision,
            },
          );
        }
      }

      await trx
        .updateTable('change_requests')
        .set({
          status: command.decision,
          checked_by: command.actorId,
          checked_at: checkedAt,
          decision_reason: command.reason,
        })
        .where('change_request_id', '=', command.changeRequestId)
        .execute();

      await trx
        .insertInto('audit_events')
        .values({
          audit_event_id: auditEventId,
          actor_id: command.actorId,
          action: 'change_request_decided',
          object_type: existing.object_type,
          object_id: existing.object_id,
          source_run_id: existing.source_run_id,
          change_request_id: existing.change_request_id,
          before_ref: existing.status,
          after_ref: command.decision,
        })
        .execute();

      return mapChangeRequest({
        ...existing,
        status: command.decision,
        checked_by: command.actorId,
        checked_at: checkedAt,
        decision_reason: command.reason,
      });
    });
  }
}

function mapChangeRequest(row: {
  change_request_id: string;
  status: string;
  object_type: string;
  object_id: string;
  base_revision: number;
  source_run_id: string | null;
  created_at: unknown;
  idempotency_key: string | null;
  submitted_by: string | null;
  submitted_at: unknown | null;
  checked_by: string | null;
  checked_at: unknown | null;
  decision_reason: string | null;
}): MappingChangeRequestRecord {
  return {
    changeRequestId: row.change_request_id,
    status: row.status as MappingChangeRequestRecord['status'],
    objectType: row.object_type as 'template',
    objectId: row.object_id,
    baseRevision: row.base_revision,
    sourceRunId: row.source_run_id ?? '',
    createdAt: toIsoString(row.created_at),
    idempotencyKey: row.idempotency_key,
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at ? toIsoString(row.submitted_at) : null,
    checkedBy: row.checked_by,
    checkedAt: row.checked_at ? toIsoString(row.checked_at) : null,
    decisionReason: row.decision_reason,
  };
}

async function applyApprovedTemplatePatch(command: {
  trx: Transaction<Database>;
  objectId: string;
  baseRevision: number;
  changeType: string;
  proposedPatch: Record<string, unknown>;
  checkedAt: Date;
}) {
  if (command.changeType === 'template_mapping') {
    return command.trx
      .updateTable('templates')
      .set({
        parent_use_case_id: asString(command.proposedPatch.targetUseCaseId),
        mapping_status: 'Assigned',
        approval_status: 'Approved',
        approved_revision: sql<number>`approved_revision + 1`,
        updated_at: command.checkedAt,
      })
      .where('template_uuid', '=', command.objectId)
      .where('approved_revision', '=', command.baseRevision)
      .executeTakeFirst();
  }

  if (command.changeType === 'template_current_version') {
    const targetVersionId = asString(command.proposedPatch.targetVersionId);

    await command.trx
      .updateTable('template_versions')
      .set({
        version_status: 'Superseded',
      })
      .where('template_uuid', '=', command.objectId)
      .where('version_status', '=', 'Current')
      .execute();

    await command.trx
      .updateTable('template_versions')
      .set({
        version_status: 'Current',
        approval_status: 'Approved',
        effective_at: command.checkedAt,
      })
      .where('version_id', '=', targetVersionId)
      .execute();

    return command.trx
      .updateTable('templates')
      .set({
        current_version_id: targetVersionId,
        approval_status: 'Approved',
        approved_revision: sql<number>`approved_revision + 1`,
        updated_at: command.checkedAt,
      })
      .where('template_uuid', '=', command.objectId)
      .where('approved_revision', '=', command.baseRevision)
      .executeTakeFirst();
  }

  return command.trx
    .updateTable('templates')
    .set({
      lifecycle_status: asTemplateLifecycleStatus(command.proposedPatch.targetLifecycleStatus),
      approval_status: 'Approved',
      approved_revision: sql<number>`approved_revision + 1`,
      updated_at: command.checkedAt,
    })
    .where('template_uuid', '=', command.objectId)
    .where('approved_revision', '=', command.baseRevision)
    .executeTakeFirst();
}

function mapAnalysisOutput(row: {
  extracted_pattern: string;
  placeholders_json: unknown;
  ai_message_type: string;
  governance_classification_suggestion: string;
  candidate_matches_json: unknown;
  overall_confidence: number;
  quality_score: number;
  anomalies_json: unknown;
  business_explanation_json: unknown;
  technical_evidence_json: unknown;
}): AiTemplateAnalysisOutput {
  return {
    extractedPattern: row.extracted_pattern,
    placeholders: asArray(row.placeholders_json),
    aiMessageType: row.ai_message_type,
    governanceClassificationSuggestion:
      row.governance_classification_suggestion as GovernanceClassification,
    overallConfidence: row.overall_confidence,
    qualityScore: row.quality_score,
    candidateMatches: asArray(row.candidate_matches_json),
    anomalies: asArray(row.anomalies_json),
    businessExplanation: asArray(row.business_explanation_json),
    technicalEvidence: asArray(row.technical_evidence_json),
  };
}

function mapAuditEvent(row: {
  audit_event_id: string;
  actor_id: string | null;
  action: string;
  object_type: string;
  object_id: string;
  source_run_id: string | null;
  change_request_id: string | null;
  before_ref: string | null;
  after_ref: string | null;
  created_at: unknown;
}): AuditEvidenceEventRecord {
  return {
    auditEventId: row.audit_event_id,
    actorId: row.actor_id,
    action: row.action,
    objectType: row.object_type,
    objectId: row.object_id,
    sourceRunId: row.source_run_id,
    changeRequestId: row.change_request_id,
    beforeRef: row.before_ref,
    afterRef: row.after_ref,
    createdAt: toIsoString(row.created_at),
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asTemplateLifecycleStatus(value: unknown): TemplateLifecycleStatus {
  if (value === 'Retired' || value === 'Active' || value === 'No Traffic') {
    return value;
  }

  return 'Active';
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}
