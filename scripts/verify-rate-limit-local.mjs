import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { standardErrorSchema, validateModelConfigurationResponseSchema } from '@gmi/contracts';

const fixture = JSON.parse(readFileSync('scripts/fixtures/rate-limit.json', 'utf8'));
const port = Number(process.env.API_RATE_LIMIT_SMOKE_PORT ?? 4134);
const baseUrl = `http://127.0.0.1:${port}`;
const timeoutMs = 25_000;
let apiOutput = '';

const api = spawn('npm', ['run', 'dev:api'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    API_AUTH_MODE: 'header',
    ANALYSIS_WORKFLOW_DRIVER: 'none',
    AI_PROVIDER: 'noop',
    API_RATE_LIMIT_ENABLED: 'true',
    API_RATE_LIMIT_WINDOW_MS: String(fixture.windowMs),
    API_RATE_LIMIT_MAX_REQUESTS: String(fixture.maxRequests),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

api.stdout.on('data', (chunk) => {
  apiOutput += chunk.toString();
});
api.stderr.on('data', (chunk) => {
  apiOutput += chunk.toString();
});

try {
  await waitForHealth();

  const first = await validateCandidate();
  validateModelConfigurationResponseSchema.parse(first.body);
  assertEqual(first.status, 200, 'first candidate validation status');
  assertEqual(first.headers.get('x-rate-limit-limit'), String(fixture.maxRequests), 'limit header');
  assertEqual(first.headers.get('x-rate-limit-remaining'), '1', 'first remaining header');

  const second = await validateCandidate();
  validateModelConfigurationResponseSchema.parse(second.body);
  assertEqual(second.status, 200, 'second candidate validation status');
  assertEqual(second.headers.get('x-rate-limit-remaining'), '0', 'second remaining header');

  const limited = await validateCandidate();
  standardErrorSchema.parse(limited.body);
  assertEqual(limited.status, 429, 'rate-limited status');
  assertEqual(limited.body.error.code, 'rate_limited', 'rate-limited error code');
  assertEqual(limited.body.error.details.routeGroup, fixture.routeGroup, 'rate-limited route group');
  assertEqual(limited.body.error.details.limit, fixture.maxRequests, 'rate-limited detail limit');
  assertEqual(limited.headers.get('x-rate-limit-remaining'), '0', 'limited remaining header');
  if (!limited.headers.get('retry-after')) {
    throw new Error('Rate-limited response must include retry-after.');
  }

  const otherActor = await validateCandidate({
    'x-actor-id': `${fixture.actorId}-other`,
  });
  validateModelConfigurationResponseSchema.parse(otherActor.body);
  assertEqual(otherActor.status, 200, 'other actor independent rate limit');

  for (let index = 0; index < fixture.maxRequests + 2; index += 1) {
    const health = await fetch(`${baseUrl}/health`);
    assertEqual(health.status, 200, `health is not rate limited ${index}`);
    if (health.headers.get('x-rate-limit-limit')) {
      throw new Error('Operational health endpoint must not include rate-limit headers.');
    }
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        routeGroup: fixture.routeGroup,
        maxRequests: fixture.maxRequests,
        windowMs: fixture.windowMs,
      },
      null,
      2,
    ),
  );
} finally {
  api.kill('SIGINT');
}

async function validateCandidate(headers = {}) {
  const response = await fetch(`${baseUrl}/model-configuration/validate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-actor-id': fixture.actorId,
      'x-gmi-roles': 'auditor',
      ...headers,
    },
    body: JSON.stringify({
      provider: 'noop',
      model: 'noop-local',
    }),
  });

  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw new Error(
    `API did not become healthy within ${timeoutMs}ms.\nLast error: ${String(
      lastError,
    )}\nOutput:\n${apiOutput}`,
  );
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
