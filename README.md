# Group Messaging Inventory

> Dashboard-first React MVP for discovering, matching, validating, and exporting a governed inventory of outbound group messaging use cases.

[中文说明](./README.zh.md) · [MIT License](./LICENSE)

## ✨ Overview

Group Messaging Inventory helps teams answer a simple governance question: what outbound messages are live, who owns them, how are they sent, and can the control evidence be exported when needed?

This repository contains a workspaces-based TypeScript monorepo. The existing Vite + React frontend models the product experience, while new API, worker, and shared-package scaffolding begins the Templates Analysis Harness backend.

## 🎯 MVP Scope

The MVP focuses on Messaging-owned platforms:

- MDP
- SFMC
- ICCM
- IRIS

The product direction is dashboard-first rather than marketing-first. The initial experience opens directly into operational inventory coverage, unknown traffic, drift exceptions, owner confirmation, and evidence readiness.

## 🧭 Product Capabilities

- Production-log inventory baseline for outbound messages
- Candidate use case matching with confidence scoring
- Drift detection for retired-but-live traffic, new sender identities, new templates, unknown traffic, and volume anomalies
- Ownership workflow for Message Owner and Integrating System Owner confirmation
- Classification support for Regulatory, Servicing, and Marketing messages
- Evidence tracking, maker-checker status, and export-oriented audit trail
- CSV and regulator response pack direction for future implementation
- English and Simplified Chinese UI copy through the built-in language provider

## 🧱 Tech Stack

- React 19
- TypeScript
- Vite
- NestJS API scaffold
- Temporal TypeScript worker scaffold
- npm workspaces
- Zod contracts
- Kysely database types
- OpenAI Agents SDK behind a replaceable AI adapter
- CSS design tokens
- Mock data shaped like future API responses

## 📁 Project Structure

```text
apps/
  web/                  Vite + React frontend
  api/                  NestJS API scaffold
  worker/               Temporal worker scaffold
packages/
  domain/               Shared product types and status models
  contracts/            Zod API and provider schemas
  db/                   Kysely database table types
  policy/               Governance and routing rules
  ai-adapters/          Replaceable AI provider adapters: OpenAI Agents SDK, OpenAI-compatible, noop, replay
```

The frontend source lives in `apps/web/src/`.

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Start backend processes:

```bash
npm run dev:api
npm run dev:worker
```

Operational endpoints:

- `GET /health` is the API liveness check.
- `GET /ready` returns component readiness for the API, Postgres, Temporal workflow driver, and AI provider configuration. When `DATABASE_URL` or `ANALYSIS_WORKFLOW_DRIVER=temporal` is enabled, readiness performs lightweight dependency probes instead of only checking environment variables.
- Every API response includes `x-request-id`. Send `x-request-id` on inbound requests to preserve a caller trace id; standard error responses also include `error.requestId`.
- API access logs are emitted as single-line JSON with `event=http_request`, `requestId`, method, path, status code, and duration.

By default the worker uses `AI_PROVIDER=noop`, which keeps local development deterministic and does not call a model provider. To run the analysis activity through OpenAI Agents SDK, set:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TRACE_INCLUDE_SENSITIVE_DATA=false
npm run dev:worker
```

To run through an OpenAI-compatible chat-completions gateway such as LiteLLM, vLLM, OpenRouter, or an internal model gateway, set:

```bash
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:4001/v1
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=provider-model-name
OPENAI_COMPATIBLE_PROVIDER_NAME=internal-gateway
OPENAI_COMPATIBLE_EXTRA_BODY_JSON=
OPENAI_COMPATIBLE_TIMEOUT_MS=60000
OPENAI_COMPATIBLE_MAX_RETRIES=2
npm run dev:worker
```

For a future DeepSeek integration, keep the API key in the environment and configure the same adapter:

```bash
export DEEPSEEK_API_KEY=...
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com
OPENAI_COMPATIBLE_API_KEY=$DEEPSEEK_API_KEY
OPENAI_COMPATIBLE_MODEL=deepseek-v4-flash
OPENAI_COMPATIBLE_PROVIDER_NAME=deepseek
OPENAI_COMPATIBLE_EXTRA_BODY_JSON='{"thinking":{"type":"enabled"},"reasoning_effort":"high"}'
OPENAI_COMPATIBLE_TIMEOUT_MS=60000
OPENAI_COMPATIBLE_MAX_RETRIES=2
npm run dev:worker
```

The standalone curl example lives at `scripts/examples/deepseek-chat-completions.curl`.
The OpenAI-compatible adapter retries transient provider failures such as HTTP 408, 429, 5xx, and network errors, while non-retryable 4xx errors fail fast with a stable `provider_error:*` message.

The business harness still owns workflow state, policy routing, persistence, and review gates. Provider SDKs and OpenAI-compatible APIs are used only behind `@gmi/ai-adapters` for model orchestration, structured output, guardrails, and tracing.

For local governance API authorization, use the lightweight header mode until SSO or an API gateway is attached:

```bash
API_AUTH_MODE=header
curl -H 'x-actor-id: analyst-local' \
  -H 'x-gmi-roles: analysis_runner,change_maker,change_checker,auditor' \
  http://127.0.0.1:4000/ready
```

Protected analysis and governance routes require one of these roles: `analysis_runner`, `analysis_reader`, `change_maker`, `change_checker`, or `auditor`. Health and readiness remain public. Set `API_AUTH_MODE=disabled` only for isolated local debugging.

The immutable governance ledger is exposed through:

```bash
curl -H 'x-gmi-roles: auditor' \
  'http://127.0.0.1:4000/audit-events?changeRequestId=CR-...'
```

`/audit-events` supports filtering by `objectType`, `objectId`, `sourceRunId`, `changeRequestId`, and `limit`.

API submission can either enqueue only or start the Temporal workflow. For the full local harness path, run Temporal and set:

```bash
ANALYSIS_WORKFLOW_DRIVER=temporal
TEMPORAL_ADDRESS=127.0.0.1:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=template-analysis
npm run dev:api
```

Start local infrastructure for the backend:

```bash
npm run infra:up
npm run db:migrate
npm run db:smoke
```

The local Postgres connection string is:

```text
postgres://gmi:gmi@127.0.0.1:55432/gmi
```

Temporal runs on `127.0.0.1:7233`, with the Temporal UI on `http://127.0.0.1:8233`.

Run the local deploy profile with API, worker, and web containers:

```bash
docker compose --profile app up --build gmi-api gmi-worker gmi-web
```

The containerized API is available on `http://127.0.0.1:4000`, and the web app is served on `http://127.0.0.1:5080`. The app profile uses `AI_PROVIDER=noop`, header-based local authorization, Postgres, and Temporal by default. A one-shot `gmi-db-migrate` service applies database migrations before the API starts. API and worker processes handle shutdown signals so Postgres and Temporal connections are released during container stop or deploy replacement.

Run type checks:

```bash
npm run typecheck
```

Build all packages, backend apps, and the frontend production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## ✅ Verification

Before opening a pull request or publishing a release, run:

```bash
npm run test:no-infra
```

This runs type checks, secret scan, backend smoke, PII masking gate, golden evals, release evidence gates, CI workflow verification, and build. The same no-infrastructure gate set is wired into `.github/workflows/ci.yml` for pull requests and pushes to `main` or `codex/**` branches.

The repository also includes a Playwright-based UI verification script:

```bash
npm run test:ui
```

For local backend contract verification without Postgres or Temporal, run:

```bash
npm run test:backend
```

This smoke test covers API validation, analysis run submission, repository domain errors, Change Request creation, maker-checker submission/decision, self-approval blocking, pending approval queue projection, Change Request evidence packages, and the local latest-evaluation query surface. Key success and error responses are parsed through the shared Zod response contracts in `packages/contracts`.

For the golden dataset evaluation gate, run:

```bash
npm run test:evals
```

The gate currently requires at least six golden cases and checks schema validity, classification accuracy, policy routing accuracy, and placeholder recall. The replay suite covers servicing, marketing, regulatory, candidate drift, low-confidence review, PII masking block, and classification-conflict review paths.

For local PII masking trap verification before provider calls, run:

```bash
npm run test:pii:local
```

This deterministic smoke test reads `packages/policy/fixtures/pii-masking-fixtures.json` and checks that common raw email, phone, account, name, HK/CN/SG phone, grouped card-number, HKID, and IBAN patterns are converted into placeholder tokens before worker analysis reaches an AI adapter. It also protects known false positives such as OTPs, dates, template IDs, batch IDs, and campaign IDs.

For local secret scanning, run:

```bash
npm run test:secrets
```

This check fails on checked-in `sk-*` style API keys while allowing documented environment-variable placeholders.

To verify that the same golden cases can run through an injected provider adapter without calling an external model, run:

```bash
npm run test:evals:provider:local
```

To verify the local release gate evidence object that blocks failed evaluations and marks passing evaluations as promotion-ready, run:

```bash
npm run test:evals:release:local
```

The eval CLI can also emit release evidence with:

```bash
EVAL_CREATE_RELEASE_EVIDENCE=true npm run test:gate -w @gmi/evals
```

To write that release evidence as a JSON artifact for CI/CD or human approval handoff, set `EVAL_RELEASE_EVIDENCE_PATH`:

```bash
EVAL_CREATE_RELEASE_EVIDENCE=true \
EVAL_RELEASE_EVIDENCE_PATH=artifacts/release-evidence.json \
npm run test:gate -w @gmi/evals
```

The local artifact smoke can be run with:

```bash
npm run test:evals:release-artifact:local
```

Release evidence includes a stable `sha256:` `evidenceHash`; local smoke tests verify that the artifact can be recomputed and checked after it is written.

To verify the release evidence can be mapped into the Postgres `pipeline_releases` record shape, run:

```bash
npm run test:evals:release-persistence:local
```

To verify the Postgres latest-evaluation rows can be mapped into the API response contract, run:

```bash
npm run test:evals:latest-api-mapping:local
```

To run the golden gate through a configured provider adapter, set `EVAL_MODE=provider` along with the provider environment variables, for example:

```bash
EVAL_MODE=provider \
AI_PROVIDER=openai-compatible \
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:4001/v1 \
OPENAI_COMPATIBLE_MODEL=provider-model-name \
npm run test:gate -w @gmi/evals
```

To persist a passing evaluation report into Postgres evidence, run:

```bash
npm run infra:up
npm run test:evals:pg
```

To also persist release evidence into `pipeline_releases`, create release evidence and enable the release write switch:

```bash
npm run infra:up
EVAL_CREATE_RELEASE_EVIDENCE=true \
EVAL_WRITE_RELEASE_DATABASE=true \
DATABASE_URL=postgres://gmi:gmi@127.0.0.1:55432/gmi \
npm run test:gate -w @gmi/evals
```

For backend persistence verification, run:

```bash
npm run infra:up
npm run db:smoke
```

For the full API -> Temporal -> worker -> Postgres evidence loop, run:

```bash
npm run infra:up
npm run test:harness:temporal
```

In Postgres-backed mode, analysis runs remain `Queued`, `Running`, `Failed`, or `Succeeded` according to the stored run state. API responses include `output` and policy routing only after the worker records `analysis_outputs`. If provider analysis ultimately fails, the worker records a failed run with structured error metadata and an audit event before preserving Temporal retry/failure semantics.
`GET /analysis-evaluations/latest` reads persisted `analysis_evaluations` and `pipeline_releases` when `DATABASE_URL` is set, and falls back to the local replay gate when no database is configured.

## 🎨 Design Direction

The visual language is documented in [DESIGN.md](./DESIGN.md). The interface uses a friendly, data-dense governance dashboard style: pale navigation, compact tables, rounded metric cards, calm status chips, and audit-ready language.

Product behavior, domain rules, workflows, page specifications, and agent implementation guidance are indexed in [design/README.md](./design/README.md). Agents implementing product changes should begin there rather than inferring behavior from the current UI.

## 🗺️ Roadmap

The product roadmap is documented in [requirements.md](./requirements.md) and [requirements.zh.md](./requirements.zh.md). Planned phases include:

- MVP pilot ingestion, extraction, deterministic matching, clustering, triage, and export
- Expanded platform coverage and classification suggestions
- End-to-end traceability using upstream identifiers where available
- Broader enterprise onboarding through telemetry feeds
- BAU hardening for access, retention, resilience, and automated governance reporting

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
