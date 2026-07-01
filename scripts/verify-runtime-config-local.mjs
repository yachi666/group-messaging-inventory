import { loadRuntimeConfig, RuntimeConfigError } from '@gmi/runtime-config';

const defaultApi = loadRuntimeConfig('api', {});
assertEqual(defaultApi.mode, 'api', 'default API mode');
assertEqual(defaultApi.port, 4000, 'default API port');
assertEqual(defaultApi.authMode, 'header', 'default auth mode');
assertEqual(defaultApi.workflow.driver, 'none', 'default workflow driver');
assertEqual(defaultApi.workflow.temporalAddress, '127.0.0.1:7233', 'default temporal address');
assertEqual(defaultApi.aiProvider.provider, 'noop', 'default AI provider');
assertEqual(defaultApi.aiProvider.readinessMode, 'config', 'default AI provider readiness mode');
assertEqual(
  defaultApi.aiProvider.openaiCompatibleRetryBackoffMs,
  250,
  'default OpenAI-compatible retry backoff',
);
assertEqual(defaultApi.readinessTimeoutMs, 1000, 'default readiness timeout');

const gatewayApi = loadRuntimeConfig('api', {
  API_AUTH_MODE: 'gateway',
});
assertEqual(gatewayApi.authMode, 'gateway', 'gateway auth mode');

const worker = loadRuntimeConfig('worker', {
  TEMPORAL_ADDRESS: 'temporal:7233',
  TEMPORAL_NAMESPACE: 'prod',
  TEMPORAL_TASK_QUEUE: 'template-analysis-prod',
});
assertEqual(worker.mode, 'worker', 'worker mode');
assertEqual(worker.workflow.temporalAddress, 'temporal:7233', 'worker temporal address');
assertEqual(worker.workflow.temporalNamespace, 'prod', 'worker temporal namespace');
assertEqual(worker.workflow.temporalTaskQueue, 'template-analysis-prod', 'worker task queue');

const compatibleWorker = loadRuntimeConfig('worker', {
  AI_PROVIDER: 'openai-compatible',
  OPENAI_COMPATIBLE_API_KEY: 'test-key',
  OPENAI_COMPATIBLE_BASE_URL: 'https://api.deepseek.com',
  OPENAI_COMPATIBLE_MODEL: 'deepseek-v4-flash',
  OPENAI_COMPATIBLE_PROVIDER_NAME: 'deepseek',
  OPENAI_COMPATIBLE_EXTRA_BODY_JSON: '{"thinking":{"type":"enabled"},"reasoning_effort":"high"}',
  AI_PROVIDER_READINESS_MODE: 'connectivity',
});
assertEqual(
  compatibleWorker.aiProvider.readinessMode,
  'connectivity',
  'OpenAI-compatible readiness mode',
);
assertEqual(
  compatibleWorker.aiProvider.openaiCompatibleProviderName,
  'deepseek',
  'OpenAI-compatible provider name',
);
assertEqual(
  compatibleWorker.aiProvider.openaiCompatibleExtraBody?.reasoning_effort,
  'high',
  'OpenAI-compatible extra body object',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('api', {
      ANALYSIS_WORKFLOW_DRIVER: 'temporal',
    }),
  ['TEMPORAL_ADDRESS is required.'],
  'temporal driver missing address',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('worker', {
      AI_PROVIDER: 'openai',
    }),
  ['OPENAI_API_KEY is required.'],
  'openai missing key',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('worker', {
      AI_PROVIDER: 'openai-compatible',
      OPENAI_COMPATIBLE_API_KEY: 'test-key',
      OPENAI_COMPATIBLE_BASE_URL: 'not a url',
    }),
  ['OPENAI_COMPATIBLE_BASE_URL must be a valid URL.'],
  'openai-compatible invalid base url',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('worker', {
      AI_PROVIDER: 'openai-compatible',
      OPENAI_COMPATIBLE_API_KEY: 'test-key',
      OPENAI_COMPATIBLE_PROVIDER_NAME: 'deepseek:prod',
    }),
  ['OPENAI_COMPATIBLE_PROVIDER_NAME must use only letters, numbers, dots, underscores, or hyphens.'],
  'openai-compatible invalid provider name',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('worker', {
      AI_PROVIDER: 'openai-compatible',
      OPENAI_COMPATIBLE_API_KEY: 'test-key',
      OPENAI_COMPATIBLE_EXTRA_BODY_JSON: '{"thinking":',
    }),
  ['OPENAI_COMPATIBLE_EXTRA_BODY_JSON must be valid JSON.'],
  'openai-compatible invalid extra body json',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('worker', {
      AI_PROVIDER: 'openai-compatible',
      OPENAI_COMPATIBLE_API_KEY: 'test-key',
      OPENAI_COMPATIBLE_EXTRA_BODY_JSON: '["thinking"]',
    }),
  ['OPENAI_COMPATIBLE_EXTRA_BODY_JSON must be a JSON object.'],
  'openai-compatible non-object extra body json',
);

assertConfigIssues(
  () =>
    loadRuntimeConfig('api', {
      PORT: '0',
      READINESS_TIMEOUT_MS: '-1',
      AI_PROVIDER_READINESS_MODE: 'probe',
      API_AUTH_MODE: 'cookie',
      DATABASE_URL: 'not a url',
      OPENAI_COMPATIBLE_MAX_RETRIES: '-2',
      OPENAI_COMPATIBLE_RETRY_BACKOFF_MS: '-1',
    }),
  [
    'PORT must be a positive integer.',
    'READINESS_TIMEOUT_MS must be a positive integer.',
    'AI_PROVIDER_READINESS_MODE must be one of: config, connectivity.',
    'API_AUTH_MODE must be one of: header, gateway, disabled.',
    'OPENAI_COMPATIBLE_MAX_RETRIES must be a non-negative integer.',
    'OPENAI_COMPATIBLE_RETRY_BACKOFF_MS must be a non-negative integer.',
    'DATABASE_URL must be a valid URL.',
  ],
  'invalid numeric and enum values',
);

console.log('Runtime config local smoke passed.');

function assertConfigIssues(fn, expectedIssues, label) {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof RuntimeConfigError)) {
      throw new Error(`${label}: expected RuntimeConfigError, got ${error}`);
    }

    for (const issue of expectedIssues) {
      if (!error.issues.includes(issue)) {
        throw new Error(
          `${label}: expected issue ${JSON.stringify(issue)}, got ${JSON.stringify(error.issues)}`,
        );
      }
    }

    return;
  }

  throw new Error(`${label}: expected runtime config validation to fail`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
