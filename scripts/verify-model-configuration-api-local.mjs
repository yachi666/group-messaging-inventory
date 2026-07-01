import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
  modelRuntimeConfigurationResponseSchema,
  standardErrorSchema,
  validateModelConfigurationResponseSchema,
} from '@gmi/contracts';

const apiPort = Number(process.env.MODEL_CONFIG_API_PORT ?? 4132);
const providerPort = Number(process.env.MODEL_CONFIG_PROVIDER_PORT ?? 4133);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const providerBaseUrl = `http://127.0.0.1:${providerPort}/v1`;
const timeoutMs = 25_000;
const runtimeSecret = 'runtime-model-config-secret';
const candidateSecret = 'candidate-model-config-secret';

const observedProviderAuth = [];
let apiOutput = '';
let api;

const providerServer = createServer((request, response) => {
  observedProviderAuth.push(request.headers.authorization ?? '');

  if (request.method === 'GET' && request.url === '/v1/models') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ data: [{ id: 'fixture-model' }] }));
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not found' }));
});

try {
  await listen(providerServer, providerPort);

  api = spawn('npm', ['run', 'dev:api'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(apiPort),
      API_AUTH_MODE: 'header',
      ANALYSIS_WORKFLOW_DRIVER: 'none',
      AI_PROVIDER: 'openai-compatible',
      AI_PROVIDER_READINESS_MODE: 'connectivity',
      READINESS_TIMEOUT_MS: '1500',
      OPENAI_COMPATIBLE_BASE_URL: providerBaseUrl,
      OPENAI_COMPATIBLE_API_KEY: runtimeSecret,
      OPENAI_COMPATIBLE_MODEL: 'runtime-model',
      OPENAI_COMPATIBLE_PROVIDER_NAME: 'fixture-provider',
      OPENAI_COMPATIBLE_TIMEOUT_MS: '1500',
      OPENAI_COMPATIBLE_MAX_RETRIES: '1',
      OPENAI_COMPATIBLE_RETRY_BACKOFF_MS: '10',
      OPENAI_COMPATIBLE_EXTRA_BODY_JSON: '{"thinking":{"type":"enabled"}}',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  api.stdout.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });
  api.stderr.on('data', (chunk) => {
    apiOutput += chunk.toString();
  });

  await waitForHealth();

  const runtimeResponse = modelRuntimeConfigurationResponseSchema.parse(
    await getJson(`${apiBaseUrl}/model-configuration/runtime`, {
      'x-actor-id': 'model-config-smoke',
      'x-gmi-roles': 'analysis_reader',
    }),
  );
  assertEqual(runtimeResponse.runtime.provider, 'openai-compatible', 'runtime provider');
  assertEqual(runtimeResponse.runtime.providerName, 'fixture-provider', 'runtime provider name');
  assertEqual(runtimeResponse.runtime.model, 'runtime-model', 'runtime model');
  assertEqual(runtimeResponse.runtime.credentials.configured, true, 'runtime credential flag');
  assertEqual(runtimeResponse.validation.status, 'up', 'runtime provider validation');
  assertDoesNotInclude(JSON.stringify(runtimeResponse), runtimeSecret, 'runtime response secret redaction');

  const validationResponse = validateModelConfigurationResponseSchema.parse(
    await postJson(
      `${apiBaseUrl}/model-configuration/validate`,
      {
        provider: 'openai-compatible',
        baseUrl: providerBaseUrl,
        apiKey: candidateSecret,
        model: 'candidate-model',
        providerName: 'deepseek',
        extraBody: {
          thinking: { type: 'enabled' },
          reasoning_effort: 'high',
        },
        timeoutMs: 1500,
        maxRetries: 0,
        retryBackoffMs: 0,
      },
      {
        'x-actor-id': 'model-config-smoke',
        'x-gmi-roles': 'change_checker',
      },
    ),
  );
  assertEqual(validationResponse.candidate.providerName, 'deepseek', 'candidate provider name');
  assertEqual(validationResponse.candidate.credentialsProvided, true, 'candidate credential flag');
  assertEqual(validationResponse.validation.status, 'up', 'candidate provider validation');
  assertDoesNotInclude(
    JSON.stringify(validationResponse),
    candidateSecret,
    'candidate response secret redaction',
  );

  if (!observedProviderAuth.includes(`Bearer ${runtimeSecret}`)) {
    throw new Error('Runtime connectivity check did not send the runtime API key.');
  }
  if (!observedProviderAuth.includes(`Bearer ${candidateSecret}`)) {
    throw new Error('Candidate validation did not send the candidate API key.');
  }

  const forbiddenResponse = await getJsonWithStatus(`${apiBaseUrl}/model-configuration/runtime`, {
    'x-actor-id': 'model-config-smoke',
    'x-gmi-roles': 'change_maker',
  });
  assertEqual(forbiddenResponse.status, 403, 'runtime endpoint forbidden status');
  standardErrorSchema.parse(forbiddenResponse.body);
  assertEqual(forbiddenResponse.body.error.code, 'access_denied', 'runtime forbidden error code');

  const missingCredentialResponse = validateModelConfigurationResponseSchema.parse(
    await postJson(
      `${apiBaseUrl}/model-configuration/validate`,
      {
        provider: 'openai-compatible',
        baseUrl: providerBaseUrl,
        model: 'candidate-model',
        providerName: 'deepseek',
      },
      {
        'x-actor-id': 'model-config-smoke',
        'x-gmi-roles': 'auditor',
      },
    ),
  );
  assertEqual(
    missingCredentialResponse.validation.status,
    'degraded',
    'missing credential validation status',
  );
  assertEqual(
    missingCredentialResponse.candidate.credentialsProvided,
    false,
    'missing credential flag',
  );

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        runtimeProvider: runtimeResponse.runtime.providerName,
        candidateProvider: validationResponse.candidate.providerName,
        providerCalls: observedProviderAuth.length,
      },
      null,
      2,
    ),
  );
} finally {
  api?.kill('SIGINT');
  providerServer.close();
}

async function waitForHealth() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
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

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function getJsonWithStatus(url, headers = {}) {
  const response = await fetch(url, { headers });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function postJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${url} returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function assertDoesNotInclude(value, expected, label) {
  if (value.includes(expected)) {
    throw new Error(`${label}: response leaked ${expected}`);
  }
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
