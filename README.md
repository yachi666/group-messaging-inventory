# Group Messaging Inventory

> Dashboard-first TypeScript monorepo for governing outbound group messaging inventory and running the Templates Analysis Harness.

[中文说明](./README.zh.md) · [MIT License](./LICENSE)

## Overview

Group Messaging Inventory helps governance, messaging, and operations teams answer:

- What outbound message templates and use cases are live?
- Who owns them?
- Which platform, tenant, sender, and template identifiers are involved?
- Which changes require review or maker-checker approval?
- Can audit evidence be exported when a reviewer, regulator, or release gate asks for it?

The repository currently contains a Vite + React product UI, a NestJS API, a Temporal TypeScript worker, shared TypeScript packages, database migrations, deterministic evaluation gates, and Docker Compose profiles for local Postgres and Temporal.

## Current Scope

The MVP focuses on Messaging-owned platforms:

- MDP
- SFMC
- ICCM
- IRIS

The product is dashboard-first rather than marketing-first. The frontend opens into operational coverage, unknown traffic, drift exceptions, review queues, maker-checker governance, model configuration, and evidence readiness.

## Capabilities

- Product inventory projection for dashboards, use cases, templates, review queues, governance, settings, analytics, and upload status.
- Template analysis runs through either an enqueue-only local path or a Temporal-backed workflow.
- AI provider isolation through `@gmi/ai-adapters`, with deterministic `noop`, OpenAI Agents SDK, and OpenAI-compatible chat-completions adapters.
- Policy routing for auto-recorded, review-required, blocked, and maker-checker flows.
- PII masking checks before provider calls.
- Governance authorization through local headers or trusted gateway headers.
- Postgres-backed audit events, review tasks, change requests, analysis outputs, evaluations, and release evidence.
- Evidence-package exports for analysis runs and change requests.
- Golden dataset evaluation gates and release-readiness checks.

## Tech Stack

- Node.js 24 in CI
- npm workspaces
- TypeScript
- React 19 and Vite 8
- NestJS 11 API
- Temporal TypeScript SDK worker
- PostgreSQL 16, Kysely, and `pg`
- Zod contracts
- OpenAI Agents SDK behind replaceable adapters
- Playwright-based UI smoke checks
- Docker Compose for local infrastructure and app-profile verification

## Repository Layout

```text
apps/
  web/          Vite + React frontend
  api/          NestJS API
  worker/       Temporal TypeScript worker

packages/
  domain/       Shared product types and status models
  contracts/    Zod API and provider schemas
  db/           Kysely table types, migrations, and Postgres smoke test
  policy/       Governance, routing, and PII masking rules
  runtime-config/
                Shared API/worker runtime configuration validation
  ai-adapters/  Noop, OpenAI, and OpenAI-compatible provider adapters
  evals/        Golden dataset evaluation and release-readiness logic

docs/
  agents/       Agent-facing repository operating notes
  api/          API surface snapshot
  architecture/ Backend architecture notes

design/         Product design index, domain model, workflows, and page specs
scripts/        Local verification, seeding, release, and smoke-test scripts
```

Frontend source lives in `apps/web/src/`. Product and implementation direction is documented in [design/README.md](./design/README.md), [DESIGN.md](./DESIGN.md), [requirements.md](./requirements.md), and [requirements.zh.md](./requirements.zh.md).

## Prerequisites

- Node.js 24, matching `.github/workflows/ci.yml`.
- npm, using the checked-in `package-lock.json`.
- Docker Desktop or a compatible Docker Compose runtime for Postgres, Temporal, and containerized app-profile checks.

Install dependencies with:

```bash
npm install
```

CI uses `npm ci`; use that when you want a clean lockfile-exact install.

## Quick Start

Run the frontend only:

```bash
npm run dev
```

Run the API only:

```bash
npm run dev:api
```

Run the frontend against a local API at `http://127.0.0.1:4000`:

```bash
npm run dev:web:api
```

Run local infrastructure and migrations:

```bash
npm run infra:up
npm run db:migrate
npm run db:smoke
```

Run API, worker, and frontend together with the local app Docker profile:

```bash
docker compose --profile app up --build gmi-api gmi-worker gmi-web
```

Default local URLs:

- Frontend dev server: shown by Vite, usually `http://127.0.0.1:5173`
- Containerized web app: `http://127.0.0.1:5080`
- API: `http://127.0.0.1:4000`
- API health: `http://127.0.0.1:4000/health`
- API readiness: `http://127.0.0.1:4000/ready`
- API metrics: `http://127.0.0.1:4000/metrics`
- Postgres: `postgres://gmi:gmi@127.0.0.1:55432/gmi`
- Temporal: `127.0.0.1:7233`
- Temporal UI: `http://127.0.0.1:8233`

## Runtime Configuration

The API and worker validate runtime configuration through `@gmi/runtime-config` and fail fast on invalid values.

Common variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `4000` |
| `DATABASE_URL` | Enables Postgres-backed repositories | unset, in-memory/local fallback where supported |
| `API_AUTH_MODE` | `header`, `gateway`, or `disabled` | `header` |
| `ANALYSIS_WORKFLOW_DRIVER` | `none` or `temporal` | `none` |
| `TEMPORAL_ADDRESS` | Temporal service address | `127.0.0.1:7233` unless Temporal mode requires explicit config |
| `TEMPORAL_NAMESPACE` | Temporal namespace | `default` |
| `TEMPORAL_TASK_QUEUE` | Temporal task queue | `template-analysis` |
| `AI_PROVIDER` | `noop`, `openai`, or `openai-compatible` | `noop` |
| `AI_PROVIDER_READINESS_MODE` | `config`-style lightweight provider readiness by default; set `connectivity` to probe the provider models endpoint | unset |
| `READINESS_TIMEOUT_MS` | Dependency probe timeout | `1000` |

Use the deterministic local provider for normal development:

```bash
AI_PROVIDER=noop npm run dev:worker
```

Use OpenAI Agents SDK:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TRACE_INCLUDE_SENSITIVE_DATA=false
npm run dev:worker
```

Use an OpenAI-compatible gateway such as LiteLLM, vLLM, OpenRouter, DeepSeek, or an internal gateway:

```bash
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:4001/v1
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=provider-model-name
OPENAI_COMPATIBLE_PROVIDER_NAME=internal-gateway
OPENAI_COMPATIBLE_TIMEOUT_MS=60000
OPENAI_COMPATIBLE_MAX_RETRIES=2
OPENAI_COMPATIBLE_RETRY_BACKOFF_MS=250
npm run dev:worker
```

Provider-specific request metadata can be supplied with `OPENAI_COMPATIBLE_EXTRA_BODY_JSON`, which must be a JSON object. Secrets should stay in the environment; do not commit real API keys.

For a DeepSeek-style OpenAI-compatible provider, use the provider base URL without `/chat/completions`:

```bash
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=deepseek-v4-flash
OPENAI_COMPATIBLE_PROVIDER_NAME=deepseek
OPENAI_COMPATIBLE_EXTRA_BODY_JSON='{"thinking":{"type":"enabled"},"reasoning_effort":"high"}'
```

For production preflight, make `/ready` prove real provider connectivity instead of only checking configuration:

```bash
AI_PROVIDER_READINESS_MODE=connectivity npm run dev:api
curl http://127.0.0.1:4000/ready
```

Connectivity mode calls the configured provider's `/models` endpoint with a bounded timeout and never logs the API key.

## API and Authorization

Public operational endpoints:

- `GET /health`
- `GET /ready`
- `GET /metrics`

Main product and harness endpoints include:

- `POST /template-versions/{versionId}/analysis-runs`
- `GET /analysis-runs/{runId}`
- `GET /analysis-runs/{runId}/evidence-package`
- `POST /analysis-runs/{runId}/confirm`
- `GET /templates/analysis-results`
- `GET /review-tasks`
- `POST /review-tasks/{taskId}/transition`
- `GET /change-requests`
- `GET /audit-events`
- `GET /product-inventory`
- `GET /change-requests/{changeRequestId}/evidence-package`
- `POST /templates/{templateUuid}/mapping-change-requests`
- `POST /templates/{templateUuid}/lifecycle-change-requests`
- `POST /template-versions/{versionId}/current-version-change-requests`
- `POST /change-requests/{changeRequestId}/submit`
- `POST /change-requests/{changeRequestId}/decision`
- `GET /analysis-evaluations/latest`
- `POST /analysis-evaluations/release-evidence`

The implemented API surface is tracked in [docs/api/template-analysis-api.json](./docs/api/template-analysis-api.json) and checked by `npm run test:api-surface`.

For local protected routes, use header auth:

```bash
curl -H 'x-actor-id: analyst-local' \
  -H 'x-gmi-roles: analysis_runner,change_maker,change_checker,auditor' \
  -H 'x-gmi-scope-tenants: local' \
  http://127.0.0.1:4000/ready
```

Supported roles are `analysis_runner`, `analysis_reader`, `change_maker`, `change_checker`, and `auditor`. Gateway mode reads trusted identity headers configured by `API_GATEWAY_ACTOR_HEADER`, `API_GATEWAY_ROLES_HEADER`, and `API_GATEWAY_TENANT_SCOPE_HEADER`.

The web client can align local testing headers with:

```bash
VITE_GOVERNANCE_ACTOR_ID=analyst-local
VITE_GOVERNANCE_ACTOR_DISPLAY_NAME='Analyst Local'
VITE_GOVERNANCE_ROLES=analysis_runner,change_maker,change_checker,auditor
```

## Development Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite frontend. |
| `npm run dev:web:api` | Starts the frontend with `VITE_API_BASE_URL=http://127.0.0.1:4000`. |
| `npm run dev:api` | Starts the NestJS API. |
| `npm run dev:api:pg` | Starts the API with the local Postgres connection string. |
| `npm run dev:worker` | Starts the Temporal worker. |
| `npm run dev:worker:local` | Starts the worker against local Temporal. |
| `npm run infra:up` | Starts local Postgres and Temporal services. |
| `npm run infra:down` | Stops local infrastructure. |
| `npm run db:migrate` | Applies local Postgres migrations. |
| `npm run db:smoke` | Runs the Postgres repository smoke test. |
| `npm run typecheck` | Builds shared packages and runs TypeScript checks across workspaces. |
| `npm run build` | Type-checks and builds packages, API, worker, and frontend. |
| `npm run preview` | Serves the frontend production build. |

## Verification

Run the main no-infrastructure PR gate before opening a pull request:

```bash
npm run test:no-infra
```

This runs type checks, secret scan, backend smoke tests, readiness and metrics checks, runtime configuration checks, API-surface checks, AI-adapter checks, PII masking checks, golden replay evals, release evidence checks, live frontend data checks, CI workflow checks, deploy config checks, build checks, web bundle checks, and local UI smoke checks.

Other useful gates:

| Command | Use when |
| --- | --- |
| `npm run test:backend` | You need a local backend smoke test without Postgres or Temporal. |
| `npm run test:evals` | You changed golden fixtures, contracts, provider output shape, or policy routing. |
| `npm run test:ai-adapter` | You changed provider adapter behavior. |
| `npm run test:pii:local` | You changed masking rules or prompt/provider boundaries. |
| `npm run test:live-frontend-data` | You changed frontend data loading or inventory projections. |
| `npm run test:ui` | You changed visible frontend behavior and have a dev server running. |
| `npm run test:harness:temporal` | You need the full API -> Temporal -> worker -> Postgres evidence-loop smoke. |
| `npm run test:harness:temporal:provider-failure` | You need to verify failed provider-run persistence and public error summaries. |
| `npm run test:deploy:compose` | You changed Dockerfiles, compose config, migrations, API startup, worker startup, or web serving. |
| `npm run test:release-preflight:local` | You are preparing a release candidate and want the Docker-backed preflight suite. |

The GitHub CI workflow runs `npm run test:no-infra` on pull requests and pushes to `main` or `codex/**`. The release preflight workflow is available as a manual GitHub Actions dispatch.

## Evaluation and Release Evidence

Run deterministic golden dataset evaluation:

```bash
npm run test:evals
```

Run the same evaluation against an injected provider adapter:

```bash
EVAL_MODE=provider \
AI_PROVIDER=openai-compatible \
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:4001/v1 \
OPENAI_COMPATIBLE_API_KEY=... \
OPENAI_COMPATIBLE_MODEL=provider-model-name \
npm run test:gate -w @gmi/evals
```

Create a release evidence artifact:

```bash
EVAL_CREATE_RELEASE_EVIDENCE=true \
EVAL_RELEASE_EVIDENCE_PATH=artifacts/release-evidence.json \
npm run test:gate -w @gmi/evals
```

Persist evaluation results and release evidence to local Postgres:

```bash
npm run infra:up
npm run test:evals:pg
EVAL_CREATE_RELEASE_EVIDENCE=true \
EVAL_WRITE_RELEASE_DATABASE=true \
DATABASE_URL=postgres://gmi:gmi@127.0.0.1:55432/gmi \
npm run test:gate -w @gmi/evals
```

Check release readiness against the default local API endpoint:

```bash
npm run check:release-readiness
```

Set `RELEASE_READINESS_URL`, `RELEASE_READINESS_PIPELINE_VERSION`, `RELEASE_READINESS_PROMPT_VERSION`, `RELEASE_READINESS_MODEL_PROVIDER`, `RELEASE_READINESS_MODEL_NAME`, `RELEASE_READINESS_RULESET_VERSION`, `RELEASE_READINESS_DATASET_VERSION`, and `RELEASE_READINESS_MIN_CASE_COUNT` to bind readiness checks to a specific candidate.

## Seed Data

Seed a richer Postgres-backed verification dataset for manual API/UI checks:

```bash
npm run infra:up
npm run db:migrate
npm run seed:verification:pg
```

Verify the seed dataset through real API endpoints:

```bash
npm run test:seed-verification-api:pg
```

Verify the seed-case shape without Postgres:

```bash
npm run test:verification-seed-cases:local
```

The seed covers auto-recorded, review-required, blocked, enhanced-review, candidate-version-drift, approved, pending, changes-requested, and rejected governance paths. Override `SEED_DATASET_ID` when you need a stable demo dataset label.

## Design and Product Documentation

- [design/README.md](./design/README.md): product design and implementation entry point.
- [DESIGN.md](./DESIGN.md): visual language.
- [requirements.md](./requirements.md): English PRD and roadmap.
- [requirements.zh.md](./requirements.zh.md): Chinese PRD and roadmap.
- [docs/architecture/template-analysis-harness-architecture.md](./docs/architecture/template-analysis-harness-architecture.md): backend architecture.
- [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md): GitHub Issues workflow for agents.
- [docs/agents/triage-labels.md](./docs/agents/triage-labels.md): canonical issue labels.
- [docs/agents/domain.md](./docs/agents/domain.md): domain-documentation layout.

Agents implementing product changes should start with `design/README.md` rather than inferring behavior from the current UI.

## Contribution Notes

- Keep `package-lock.json` committed when dependencies change.
- Use TypeScript, React function components, named exports, 2-space indentation, and single quotes in `.ts` and `.tsx` files.
- Prefer design tokens from `apps/web/src/styles/tokens.css` over hard-coded visual values.
- Keep changes scoped; avoid mixing formatting-only edits with behavior changes.
- For visible UI changes, include screenshots in pull requests and run the UI smoke check.
- For backend, policy, provider, or evidence changes, include the relevant verification command in the pull request.

## License

This project is licensed under the [MIT License](./LICENSE).
