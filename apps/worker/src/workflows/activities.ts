import {
  createAiAnalysisAdapterFromEnv,
  getAiProviderRuntimeMetadata,
} from '@gmi/ai-adapters';
import {
  createPostgresDatabase,
  createPostgresPool,
  PostgresAnalysisRunRepository,
  type AnalysisRunRepository,
  type RecordedAnalysisResultRecord,
} from '@gmi/db';
import type { AiTemplateAnalysisOutput, AnalysisEffort } from '@gmi/domain';
import {
  evaluateAnalysisPolicy,
  maskTemplateContent,
  type EvaluateAnalysisPolicyResult,
} from '@gmi/policy';

export type RunTemplateAnalysisActivityInput = {
  runId?: string;
  templateUuid: string;
  versionId: string;
  effort: AnalysisEffort;
  rawContent?: string;
  maskedContent?: string;
};

export async function runTemplateAnalysisActivity(
  input: RunTemplateAnalysisActivityInput,
): Promise<AiTemplateAnalysisOutput> {
  const startedAt = performance.now();
  const adapter = createAiAnalysisAdapterFromEnv(process.env);
  const providerMetadata = getAiProviderRuntimeMetadata(process.env);
  const maskedContent = resolveMaskedContent(input);

  try {
    const output = await adapter.analyzeTemplate({
      templateUuid: input.templateUuid,
      versionId: input.versionId,
      maskedContent,
      approvedContext: [],
      effort: input.effort,
    });

    logAnalysisActivityEvent({
      input,
      providerMetadata,
      startedAt,
      status: 'succeeded',
    });

    return output;
  } catch (error) {
    logAnalysisActivityEvent({
      input,
      providerMetadata,
      startedAt,
      status: 'failed',
      errorCode: toActivityErrorCode(error),
      retryable: isRetryableActivityError(error),
    });

    throw error;
  }
}

export type RouteAnalysisResultActivityInput = {
  effort: AnalysisEffort;
  output: AiTemplateAnalysisOutput;
};

export async function routeAnalysisResultActivity(
  input: RouteAnalysisResultActivityInput,
) {
  return evaluateAnalysisPolicy({
    output: input.output,
    effort: input.effort,
    piiMaskingPassed: true,
    hasRetiredButLiveTraffic: false,
    hasClassificationConflict: false,
  });
}

export type PersistAnalysisResultActivityInput = {
  runId?: string;
  output: AiTemplateAnalysisOutput;
  routing: EvaluateAnalysisPolicyResult;
};

export type PersistAnalysisResultActivityOutput =
  | (RecordedAnalysisResultRecord & {
      persisted: true;
    })
  | {
      persisted: false;
      reason: 'missing_run_id' | 'missing_database_url';
    };

export type PersistAnalysisFailureActivityInput = {
  runId?: string;
  error: {
    code: 'provider_error' | 'schema_validation_failed' | 'unknown_error';
    message: string;
    retryable: boolean;
  };
};

export type PersistAnalysisFailureActivityOutput =
  | {
      persisted: true;
      runId: string;
      status: 'Failed';
      recordedAt: string;
    }
  | {
      persisted: false;
      reason: 'missing_run_id' | 'missing_database_url';
    };

export async function persistAnalysisResultActivity(
  input: PersistAnalysisResultActivityInput,
): Promise<PersistAnalysisResultActivityOutput> {
  if (!input.runId) {
    return {
      persisted: false,
      reason: 'missing_run_id',
    };
  }

  const repository = getAnalysisRunRepository();

  if (!repository) {
    return {
      persisted: false,
      reason: 'missing_database_url',
    };
  }

  const providerMetadata = getAiProviderRuntimeMetadata(process.env);

  const recorded = await repository.recordAnalysisResult({
    runId: input.runId,
    output: input.output,
    policyDecision: input.routing.decision,
    policyReasons: input.routing.reasons,
    modelProvider: providerMetadata.provider,
    modelName: providerMetadata.modelName,
    promptVersion: providerMetadata.promptVersion,
    traceRef: `trace_${input.runId}`,
  });

  return {
    ...recorded,
    persisted: true,
  };
}

export async function persistAnalysisFailureActivity(
  input: PersistAnalysisFailureActivityInput,
): Promise<PersistAnalysisFailureActivityOutput> {
  if (!input.runId) {
    return {
      persisted: false,
      reason: 'missing_run_id',
    };
  }

  const repository = getAnalysisRunRepository();

  if (!repository) {
    return {
      persisted: false,
      reason: 'missing_database_url',
    };
  }

  await repository.recordAnalysisFailure({
    runId: input.runId,
    errorCode: input.error.code,
    errorMessage: input.error.message,
    retryable: input.error.retryable,
  });

  return {
    persisted: true,
    runId: input.runId,
    status: 'Failed',
    recordedAt: new Date().toISOString(),
  };
}

let repository: AnalysisRunRepository | null | undefined;
let repositoryShutdown: (() => Promise<void>) | undefined;

function getAnalysisRunRepository() {
  if (repository !== undefined) {
    return repository;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    repository = null;
    return repository;
  }

  const pool = createPostgresPool({ connectionString });
  const db = createPostgresDatabase(pool);
  const postgresRepository = new PostgresAnalysisRunRepository(db);
  repository = postgresRepository;
  repositoryShutdown = () => postgresRepository.onModuleDestroy();

  return repository;
}

export async function shutdownAnalysisRunRepository() {
  if (!repositoryShutdown) {
    return;
  }

  await repositoryShutdown();
  repositoryShutdown = undefined;
  repository = undefined;
}

function resolveMaskedContent(input: RunTemplateAnalysisActivityInput) {
  if (input.rawContent) {
    return maskTemplateContent(input.rawContent).maskedContent;
  }

  return input.maskedContent ?? 'Local scaffold masked content with no provider configured.';
}

function logAnalysisActivityEvent({
  input,
  providerMetadata,
  startedAt,
  status,
  errorCode,
  retryable,
}: {
  input: RunTemplateAnalysisActivityInput;
  providerMetadata: ReturnType<typeof getAiProviderRuntimeMetadata>;
  startedAt: number;
  status: 'succeeded' | 'failed';
  errorCode?: 'provider_error' | 'schema_validation_failed' | 'unknown_error';
  retryable?: boolean;
}) {
  console.log(
    JSON.stringify({
      event: 'ai_analysis_activity',
      status,
      runId: input.runId ?? null,
      templateUuid: input.templateUuid,
      versionId: input.versionId,
      effort: input.effort,
      provider: providerMetadata.provider,
      modelName: providerMetadata.modelName,
      promptVersion: providerMetadata.promptVersion,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      ...(errorCode ? { errorCode } : {}),
      ...(retryable !== undefined ? { retryable } : {}),
    }),
  );
}

function toActivityErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('provider_error:')) {
    return 'provider_error';
  }

  if (message.includes('schema')) {
    return 'schema_validation_failed';
  }

  return 'unknown_error';
}

function isRetryableActivityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes(':http_408:') ||
    message.includes(':http_429:') ||
    /:http_5\d\d:/.test(message) ||
    message.includes(':network:')
  );
}
