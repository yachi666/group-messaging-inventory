import { Injectable } from '@nestjs/common';
import {
  latestAnalysisEvaluationResponseSchema,
  type LatestAnalysisEvaluationResponse,
} from '@gmi/contracts';
import {
  createPostgresDatabase,
  createPostgresPool,
  getLatestAnalysisEvaluation,
} from '@gmi/db';
import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
} from '@gmi/evals';

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
