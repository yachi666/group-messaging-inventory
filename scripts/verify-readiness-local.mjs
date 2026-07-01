import { readinessResponseSchema } from '@gmi/contracts';
import { readFileSync } from 'node:fs';
import { HealthService } from '../apps/api/dist/modules/health.service.js';

const aiProviderFixture = JSON.parse(
  readFileSync('scripts/fixtures/ai-provider-readiness.json', 'utf8'),
);

const readyService = new HealthService({
  env: {
    DATABASE_URL: 'postgres://gmi:gmi@127.0.0.1:55432/gmi',
    ANALYSIS_WORKFLOW_DRIVER: 'temporal',
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    AI_PROVIDER: 'noop',
    READINESS_TIMEOUT_MS: '50',
  },
  checkDatabase: async () => undefined,
  checkTemporal: async () => undefined,
});

const ready = await readyService.getReadiness();
readinessResponseSchema.parse(ready);
assertEqual(ready.status, 'ready', 'ready aggregate status');
assertComponent(ready, 'database', 'up', true);
assertComponent(ready, 'workflow', 'up', true);
assertComponent(ready, 'ai-provider', 'up', false);

const degradedService = new HealthService({
  env: {
    DATABASE_URL: 'postgres://gmi:gmi@127.0.0.1:55432/gmi',
    ANALYSIS_WORKFLOW_DRIVER: 'temporal',
    TEMPORAL_ADDRESS: '127.0.0.1:7233',
    AI_PROVIDER: 'openai-compatible',
    READINESS_TIMEOUT_MS: '50',
  },
  checkDatabase: async () => {
    throw new Error('database unavailable');
  },
  checkTemporal: async () => {
    throw new Error('temporal unavailable');
  },
});

const degraded = await degradedService.getReadiness();
readinessResponseSchema.parse(degraded);
assertEqual(degraded.status, 'degraded', 'degraded aggregate status');
assertComponent(degraded, 'database', 'degraded', true);
assertComponent(degraded, 'workflow', 'degraded', true);
assertComponent(degraded, 'ai-provider', 'degraded', true);
assertIncludes(
  getComponent(degraded, 'database').detail,
  'database unavailable',
  'database degraded detail',
);
assertIncludes(
  getComponent(degraded, 'workflow').detail,
  'temporal unavailable',
  'workflow degraded detail',
);

const localOnlyService = new HealthService({
  env: {
    ANALYSIS_WORKFLOW_DRIVER: 'none',
    AI_PROVIDER: 'noop',
  },
});

const localOnly = await localOnlyService.getReadiness();
readinessResponseSchema.parse(localOnly);
assertEqual(localOnly.status, 'ready', 'local-only aggregate status');
assertComponent(localOnly, 'database', 'skipped', false);
assertComponent(localOnly, 'workflow', 'up', false);

const configuredProviderService = new HealthService({
  env: {
    ...aiProviderFixture.configuredOpenAiCompatible,
  },
});

const configuredProvider = await configuredProviderService.getReadiness();
readinessResponseSchema.parse(configuredProvider);
assertEqual(configuredProvider.status, 'ready', 'configured provider aggregate status');
assertComponent(configuredProvider, 'ai-provider', 'up', true);
assertIncludes(
  getComponent(configuredProvider, 'ai-provider').detail,
  'connectivity check is disabled',
  'configured provider detail',
);

let observedProviderCheck;
const connectivityProviderService = new HealthService({
  env: {
    ...aiProviderFixture.connectivityOpenAiCompatible,
    READINESS_TIMEOUT_MS: '50',
  },
  checkAiProvider: async (input) => {
    observedProviderCheck = input;
  },
});

const connectedProvider = await connectivityProviderService.getReadiness();
readinessResponseSchema.parse(connectedProvider);
assertEqual(connectedProvider.status, 'ready', 'connected provider aggregate status');
assertComponent(connectedProvider, 'ai-provider', 'up', true);
assertEqual(observedProviderCheck.provider, 'openai-compatible', 'connectivity provider name');
assertEqual(observedProviderCheck.baseUrl, 'https://api.deepseek.com', 'connectivity base url');
assertEqual(observedProviderCheck.model, 'deepseek-v4-flash', 'connectivity model');
assertEqual(observedProviderCheck.apiKey, 'fixture-provider-key', 'connectivity api key handoff');
assertIncludes(
  getComponent(connectedProvider, 'ai-provider').detail,
  'connectivity check succeeded',
  'connectivity success detail',
);

const failedProviderService = new HealthService({
  env: {
    ...aiProviderFixture.connectivityOpenAiCompatible,
    READINESS_TIMEOUT_MS: '50',
  },
  checkAiProvider: async () => {
    throw new Error('provider models endpoint unavailable');
  },
});

const failedProvider = await failedProviderService.getReadiness();
readinessResponseSchema.parse(failedProvider);
assertEqual(failedProvider.status, 'degraded', 'failed provider aggregate status');
assertComponent(failedProvider, 'ai-provider', 'degraded', true);
assertIncludes(
  getComponent(failedProvider, 'ai-provider').detail,
  'provider models endpoint unavailable',
  'connectivity failure detail',
);

const missingCredentialProviderService = new HealthService({
  env: {
    ...aiProviderFixture.missingCredential,
  },
});

const missingCredentialProvider = await missingCredentialProviderService.getReadiness();
readinessResponseSchema.parse(missingCredentialProvider);
assertEqual(missingCredentialProvider.status, 'degraded', 'missing credential provider status');
assertComponent(missingCredentialProvider, 'ai-provider', 'degraded', true);
assertIncludes(
  getComponent(missingCredentialProvider, 'ai-provider').detail,
  'credentials are missing',
  'missing credential provider detail',
);

console.log('Readiness local smoke passed.');

function assertComponent(response, name, status, required) {
  const component = getComponent(response, name);
  assertEqual(component.status, status, `${name} status`);
  assertEqual(component.required, required, `${name} required`);
}

function getComponent(response, name) {
  const component = response.components.find((candidate) => candidate.name === name);

  if (!component) {
    throw new Error(`Missing readiness component: ${name}`);
  }

  return component;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expected, label) {
  if (!String(value).includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(value)} to include ${expected}`);
  }
}
