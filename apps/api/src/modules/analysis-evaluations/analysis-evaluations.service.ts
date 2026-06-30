import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  latestAnalysisEvaluationResponseSchema,
  recordPipelineReleaseEvidenceResponseSchema,
  type LatestAnalysisEvaluationResponse,
  type RecordPipelineReleaseEvidenceRequest,
  type RecordPipelineReleaseEvidenceResponse,
} from '@gmi/contracts';
import {
  createPostgresDatabase,
  createPostgresPool,
  getLatestAnalysisEvaluation,
  recordAnalysisEvaluation,
  recordPipelineReleaseEvidence,
} from '@gmi/db';
import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
  verifyPipelineReleaseEvidence,
  type PipelineReleaseEvidence,
} from '@gmi/evals';
import { domainMetricsRegistry } from '../metrics.service.js';

@Injectable()
export class AnalysisEvaluationsService {
  async getLatestEvaluation(): Promise<LatestAnalysisEvaluationResponse> {
    const persisted = await this.getPersistedLatestEvaluation();

    if (persisted) {
      return latestAnalysisEvaluationResponseSchema.parse(persisted);
    }

    const report = await runGoldenTemplateEvaluation();
    const release = createPipelineReleaseEvidence(report, {
      releaseId: `REL-${report.datasetVersion}`,
      pipelineVersion: process.env.EVAL_PIPELINE_VERSION ?? 'template-analysis-pipeline@local',
      promptVersion: process.env.EVAL_PROMPT_VERSION ?? 'template-analysis-agent@replay',
      modelProvider: process.env.EVAL_MODEL_PROVIDER ?? 'replay',
      modelName: process.env.EVAL_MODEL_NAME ?? 'replay-golden-fixtures',
      rulesetVersion:
        process.env.EVAL_RULESET_VERSION ?? 'messaging-governance-rules@local',
      requestedBy: 'analysis-evaluations-api',
      createdAt: '2026-06-28T00:00:00.000Z',
    });

    return latestAnalysisEvaluationResponseSchema.parse({
      source: {
        kind: 'replay_fallback',
        persisted: false,
        generatedAt: release.createdAt,
      },
      evaluation: {
        suite: report.suite,
        datasetVersion: report.datasetVersion,
        mode: report.mode,
        verdict: report.verdict,
        metrics: report.metrics,
        thresholds: report.thresholds,
        failedCaseIds: report.cases
          .filter((testCase) => testCase.failures.length > 0)
          .map((testCase) => testCase.id),
      },
      release: {
        releaseId: release.releaseId,
        status: release.status,
        promotionAllowed: release.promotionAllowed,
        evidenceHash: release.evidenceHash,
        pipeline: release.pipeline,
      },
    });
  }

  async recordReleaseEvidence(
    request: RecordPipelineReleaseEvidenceRequest,
  ): Promise<RecordPipelineReleaseEvidenceResponse> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new ServiceUnavailableException({
        code: 'dependency_unavailable',
        message: 'DATABASE_URL is required to record release evidence.',
        details: {
          dependency: 'postgres',
        },
      });
    }

    const evidence = request.evidence as PipelineReleaseEvidence;

    if (!verifyPipelineReleaseEvidence(evidence)) {
      throw new BadRequestException({
        code: 'invalid_release_evidence',
        message: 'Release evidence hash does not match the submitted payload.',
      });
    }

    const pool = createPostgresPool({ connectionString });
    const db = createPostgresDatabase(pool);

    try {
      const recordedEvaluation = await recordAnalysisEvaluation(db, {
        evaluationSuite: evidence.evaluation.suite,
        pipelineVersion: evidence.pipeline.pipelineVersion,
        promptVersion: evidence.pipeline.promptVersion,
        modelProvider: evidence.pipeline.modelProvider,
        modelName: evidence.pipeline.modelName,
        rulesetVersion: evidence.pipeline.rulesetVersion,
        datasetVersion: evidence.evaluation.datasetVersion,
        metrics: evidence.evaluation.metrics,
        thresholds: evidence.evaluation.thresholds,
        verdict: evidence.evaluation.verdict,
        reportRef: request.reportRef ?? null,
      });
      const recordedRelease = await recordPipelineReleaseEvidence(db, evidence);
      const latest = await getLatestAnalysisEvaluation(db);

      if (!latest) {
        throw new ServiceUnavailableException({
          code: 'dependency_unavailable',
          message: 'Latest evaluation could not be read after recording release evidence.',
          details: {
            dependency: 'postgres',
          },
        });
      }

      domainMetricsRegistry.recordReleaseEvidenceRecorded({
        verdict: evidence.evaluation.verdict,
        status: evidence.status,
        promotionAllowed: evidence.promotionAllowed,
      });

      return recordPipelineReleaseEvidenceResponseSchema.parse({
        recordedEvaluation,
        recordedRelease: {
          releaseId: recordedRelease.releaseId,
          status: recordedRelease.status,
          promotionAllowed: recordedRelease.promotionAllowed,
          evidenceHash: recordedRelease.evidenceHash,
        },
        latest,
      });
    } finally {
      await db.destroy();
    }
  }

  private async getPersistedLatestEvaluation() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      return null;
    }

    const pool = createPostgresPool({ connectionString });
    const db = createPostgresDatabase(pool);

    try {
      return await getLatestAnalysisEvaluation(db);
    } finally {
      await db.destroy();
    }
  }
}
