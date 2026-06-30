import { evaluateReleaseReadiness } from '@gmi/evals';

const url =
  process.env.RELEASE_READINESS_URL ??
  'http://127.0.0.1:4000/analysis-evaluations/latest';
const timeoutMs = Number(process.env.RELEASE_READINESS_TIMEOUT_MS ?? 15_000);
const headers = {
  'x-actor-id': process.env.RELEASE_READINESS_ACTOR_ID ?? 'release-readiness-check',
  'x-gmi-roles': process.env.RELEASE_READINESS_ROLES ?? 'analysis_reader,auditor',
};

const latest = await getJson(url);
const readiness = evaluateReleaseReadiness(latest, {
  requirePersistedEvidence: envBoolean('RELEASE_READINESS_REQUIRE_PERSISTED', true),
  expectedPipelineVersion: process.env.RELEASE_READINESS_PIPELINE_VERSION,
  expectedPromptVersion: process.env.RELEASE_READINESS_PROMPT_VERSION,
  expectedModelProvider: process.env.RELEASE_READINESS_MODEL_PROVIDER,
  expectedModelName: process.env.RELEASE_READINESS_MODEL_NAME,
  expectedRulesetVersion: process.env.RELEASE_READINESS_RULESET_VERSION,
  expectedDatasetVersion: process.env.RELEASE_READINESS_DATASET_VERSION,
  minCaseCount: envNumber('RELEASE_READINESS_MIN_CASE_COUNT'),
});

console.log(JSON.stringify(readiness, null, 2));

if (!readiness.ready) {
  process.exitCode = 1;
}

async function getJson(targetUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GET ${targetUrl} returned ${response.status}: ${await response.text()}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function envBoolean(name, defaultValue) {
  const raw = process.env[name];

  if (raw === undefined) {
    return defaultValue;
  }

  return raw === 'true';
}

function envNumber(name) {
  const raw = process.env[name];

  if (raw === undefined || raw === '') {
    return undefined;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number, got ${raw}`);
  }

  return parsed;
}
