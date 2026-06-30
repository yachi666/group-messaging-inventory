export type RuntimeEnv = Record<string, string | undefined>;

export type RuntimeConfigMode = 'api' | 'worker';

export type RuntimeConfig = {
  mode: RuntimeConfigMode;
  port?: number;
  databaseUrl?: string;
  authMode?: 'header' | 'gateway' | 'disabled';
  workflow: {
    driver: 'none' | 'temporal';
    temporalAddress?: string;
    temporalNamespace: string;
    temporalTaskQueue: string;
  };
  aiProvider: {
    provider: 'noop' | 'openai' | 'openai-compatible';
    openaiModel?: string;
    openaiCompatibleBaseUrl?: string;
    openaiCompatibleModel?: string;
    openaiCompatibleProviderName?: string;
    openaiCompatibleTimeoutMs?: number;
    openaiCompatibleMaxRetries?: number;
    openaiCompatibleRetryBackoffMs?: number;
  };
  readinessTimeoutMs: number;
};

export class RuntimeConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid runtime configuration: ${issues.join('; ')}`);
    this.name = 'RuntimeConfigError';
  }
}

export function loadRuntimeConfig(
  mode: RuntimeConfigMode,
  env: RuntimeEnv = process.env,
): RuntimeConfig {
  const issues: string[] = [];
  const port = mode === 'api' ? readOptionalPositiveInteger(env.PORT, 'PORT', issues, 4000) : undefined;
  const authMode = readEnum(
    env.API_AUTH_MODE,
    'API_AUTH_MODE',
    ['header', 'gateway', 'disabled'],
    issues,
    'header',
  );
  const workflowDriver = readEnum(
    env.ANALYSIS_WORKFLOW_DRIVER,
    'ANALYSIS_WORKFLOW_DRIVER',
    ['none', 'temporal'],
    issues,
    'none',
  );
  const aiProvider = readEnum(
    env.AI_PROVIDER,
    'AI_PROVIDER',
    ['noop', 'openai', 'openai-compatible'],
    issues,
    'noop',
  );
  const readinessTimeoutMs = readOptionalPositiveInteger(
    env.READINESS_TIMEOUT_MS,
    'READINESS_TIMEOUT_MS',
    issues,
    1000,
  );

  if (workflowDriver === 'temporal') {
    readRequired(env.TEMPORAL_ADDRESS, 'TEMPORAL_ADDRESS', issues);
  }

  if (mode === 'worker' && workflowDriver === 'none' && env.TEMPORAL_ADDRESS === '') {
    issues.push('TEMPORAL_ADDRESS must not be empty when starting the worker.');
  }

  if (aiProvider === 'openai') {
    readRequired(env.OPENAI_API_KEY, 'OPENAI_API_KEY', issues);
  }

  if (aiProvider === 'openai-compatible') {
    readRequired(env.OPENAI_COMPATIBLE_API_KEY, 'OPENAI_COMPATIBLE_API_KEY', issues);
    readOptionalUrl(
      env.OPENAI_COMPATIBLE_BASE_URL,
      'OPENAI_COMPATIBLE_BASE_URL',
      issues,
      'http://127.0.0.1:4001/v1',
    );
  }

  const openaiCompatibleTimeoutMs = readOptionalPositiveInteger(
    env.OPENAI_COMPATIBLE_TIMEOUT_MS,
    'OPENAI_COMPATIBLE_TIMEOUT_MS',
    issues,
    60_000,
  );
  const openaiCompatibleMaxRetries = readOptionalNonNegativeInteger(
    env.OPENAI_COMPATIBLE_MAX_RETRIES,
    'OPENAI_COMPATIBLE_MAX_RETRIES',
    issues,
    2,
  );
  const openaiCompatibleRetryBackoffMs = readOptionalNonNegativeInteger(
    env.OPENAI_COMPATIBLE_RETRY_BACKOFF_MS,
    'OPENAI_COMPATIBLE_RETRY_BACKOFF_MS',
    issues,
    250,
  );

  if (env.DATABASE_URL) {
    readOptionalUrl(env.DATABASE_URL, 'DATABASE_URL', issues);
  }

  if (issues.length > 0) {
    throw new RuntimeConfigError(issues);
  }

  return {
    mode,
    port,
    databaseUrl: trimToUndefined(env.DATABASE_URL),
    authMode,
    workflow: {
      driver: workflowDriver,
      temporalAddress:
        workflowDriver === 'temporal'
          ? trimToUndefined(env.TEMPORAL_ADDRESS)
          : trimToUndefined(env.TEMPORAL_ADDRESS) ?? '127.0.0.1:7233',
      temporalNamespace: trimToUndefined(env.TEMPORAL_NAMESPACE) ?? 'default',
      temporalTaskQueue: trimToUndefined(env.TEMPORAL_TASK_QUEUE) ?? 'template-analysis',
    },
    aiProvider: {
      provider: aiProvider,
      openaiModel: trimToUndefined(env.OPENAI_MODEL) ?? 'gpt-5.4-mini',
      openaiCompatibleBaseUrl:
        trimToUndefined(env.OPENAI_COMPATIBLE_BASE_URL) ?? 'http://127.0.0.1:4001/v1',
      openaiCompatibleModel: trimToUndefined(env.OPENAI_COMPATIBLE_MODEL) ?? 'local-model',
      openaiCompatibleProviderName: trimToUndefined(env.OPENAI_COMPATIBLE_PROVIDER_NAME),
      openaiCompatibleTimeoutMs,
      openaiCompatibleMaxRetries,
      openaiCompatibleRetryBackoffMs,
    },
    readinessTimeoutMs,
  };
}

function readRequired(value: string | undefined, name: string, issues: string[]) {
  if (!trimToUndefined(value)) {
    issues.push(`${name} is required.`);
  }
}

function readEnum<T extends string>(
  value: string | undefined,
  name: string,
  allowedValues: readonly T[],
  issues: string[],
  defaultValue: T,
): T {
  const trimmed = trimToUndefined(value);

  if (!trimmed) {
    return defaultValue;
  }

  if ((allowedValues as readonly string[]).includes(trimmed)) {
    return trimmed as T;
  }

  issues.push(`${name} must be one of: ${allowedValues.join(', ')}.`);
  return defaultValue;
}

function readOptionalPositiveInteger(
  value: string | undefined,
  name: string,
  issues: string[],
  defaultValue: number,
) {
  const parsed = readOptionalInteger(value, name, issues, defaultValue);

  if (parsed <= 0) {
    issues.push(`${name} must be a positive integer.`);
    return defaultValue;
  }

  return parsed;
}

function readOptionalNonNegativeInteger(
  value: string | undefined,
  name: string,
  issues: string[],
  defaultValue: number,
) {
  const parsed = readOptionalInteger(value, name, issues, defaultValue);

  if (parsed < 0) {
    issues.push(`${name} must be a non-negative integer.`);
    return defaultValue;
  }

  return parsed;
}

function readOptionalInteger(
  value: string | undefined,
  name: string,
  issues: string[],
  defaultValue: number,
) {
  const trimmed = trimToUndefined(value);

  if (!trimmed) {
    return defaultValue;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed)) {
    issues.push(`${name} must be an integer.`);
    return defaultValue;
  }

  return parsed;
}

function readOptionalUrl(
  value: string | undefined,
  name: string,
  issues: string[],
  defaultValue?: string,
) {
  const trimmed = trimToUndefined(value) ?? defaultValue;

  if (!trimmed) {
    return;
  }

  try {
    new URL(trimmed);
  } catch {
    issues.push(`${name} must be a valid URL.`);
  }
}

function trimToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
