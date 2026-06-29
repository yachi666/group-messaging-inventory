import { readinessResponseSchema } from '@gmi/contracts';
import { HealthService } from '../apps/api/dist/modules/health.service.js';

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
