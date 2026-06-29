import {
  createAiAnalysisAdapterFromEnv,
  getAiProviderRuntimeMetadata,
} from '@gmi/ai-adapters';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createPipelineReleaseEvidence,
  runGoldenTemplateEvaluation,
} from './index.js';

const evaluationMode = process.env.EVAL_MODE === 'provider' ? 'provider' : 'replay';
const providerMetadata =
  evaluationMode === 'provider'
    ? getAiProviderRuntimeMetadata(process.env)
    : {
        provider: 'replay',
        modelName: 'replay-golden-fixtures',
        promptVersion: 'template-analysis-agent@replay',
      };
const report = await runGoldenTemplateEvaluation({
  mode: evaluationMode,
  ...(evaluationMode === 'provider'
    ? {
        adapter: createAiAnalysisAdapterFromEnv(process.env),
      }
    : {}),
});
let recordedEvaluation: unknown;
let recordedRelease: unknown;
const releaseEvidence =
  process.env.EVAL_CREATE_RELEASE_EVIDENCE === 'true'
    ? createPipelineReleaseEvidence(report, {
        releaseId: process.env.EVAL_RELEASE_ID ?? `REL-${new Date().toISOString().slice(0, 10)}`,
        pipelineVersion:
          process.env.EVAL_PIPELINE_VERSION ?? 'template-analysis-pipeline@local',
        promptVersion: process.env.EVAL_PROMPT_VERSION ?? providerMetadata.promptVersion,
        modelProvider: process.env.EVAL_MODEL_PROVIDER ?? providerMetadata.provider,
        modelName: process.env.EVAL_MODEL_NAME ?? providerMetadata.modelName,
        rulesetVersion:
          process.env.EVAL_RULESET_VERSION ?? 'messaging-governance-rules@local',
        requestedBy: process.env.EVAL_RELEASE_REQUESTED_BY ?? 'local-eval-runner',
      })
    : null;

if (releaseEvidence && process.env.EVAL_RELEASE_EVIDENCE_PATH) {
  await mkdir(path.dirname(process.env.EVAL_RELEASE_EVIDENCE_PATH), {
    recursive: true,
  });
  await writeFile(
    process.env.EVAL_RELEASE_EVIDENCE_PATH,
    `${JSON.stringify(releaseEvidence, null, 2)}\n`,
    'utf8',
  );
}

const shouldWriteEvaluation = process.env.EVAL_WRITE_DATABASE === 'true';
const shouldWriteRelease = process.env.EVAL_WRITE_RELEASE_DATABASE === 'true';

if (shouldWriteRelease && !releaseEvidence) {
  throw new Error(
    'EVAL_CREATE_RELEASE_EVIDENCE=true is required when EVAL_WRITE_RELEASE_DATABASE=true.',
  );
}

if (shouldWriteEvaluation || shouldWriteRelease) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required when EVAL_WRITE_DATABASE=true or EVAL_WRITE_RELEASE_DATABASE=true.',
    );
  }

  const {
    createPostgresDatabase,
    createPostgresPool,
    migratePostgresDatabase,
    recordAnalysisEvaluation,
    recordPipelineReleaseEvidence,
  } = await import('@gmi/db');
  const pool = createPostgresPool({ connectionString });
  const db = createPostgresDatabase(pool);

  try {
    await migratePostgresDatabase(db);

    if (shouldWriteEvaluation) {
      recordedEvaluation = await recordAnalysisEvaluation(db, {
        evaluationSuite: report.suite,
        pipelineVersion:
          process.env.EVAL_PIPELINE_VERSION ?? 'template-analysis-pipeline@local',
        promptVersion: process.env.EVAL_PROMPT_VERSION ?? providerMetadata.promptVersion,
        modelProvider: process.env.EVAL_MODEL_PROVIDER ?? providerMetadata.provider,
        modelName: process.env.EVAL_MODEL_NAME ?? providerMetadata.modelName,
        rulesetVersion:
          process.env.EVAL_RULESET_VERSION ?? 'messaging-governance-rules@local',
        datasetVersion: report.datasetVersion,
        metrics: report.metrics,
        thresholds: report.thresholds,
        verdict: report.verdict,
        reportRef: process.env.EVAL_REPORT_REF ?? null,
      });
    }

    if (shouldWriteRelease && releaseEvidence) {
      recordedRelease = await recordPipelineReleaseEvidence(db, releaseEvidence);
    }
  } finally {
    await db.destroy();
  }
}

console.log(
  JSON.stringify(
    {
      ...report,
      ...(recordedEvaluation ? { recordedEvaluation } : {}),
      ...(releaseEvidence ? { releaseEvidence } : {}),
      ...(recordedRelease ? { recordedRelease } : {}),
    },
    null,
    2,
  ),
);

if (report.verdict !== 'pass') {
  process.exitCode = 1;
}
