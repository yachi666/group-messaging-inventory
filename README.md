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
  runtime-config/       Shared startup configuration validation
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
- `GET /metrics` exposes Prometheus-style API request counters, duration sums, and low-cardinality domain counters for analysis submissions, confirmations, and release evidence records. Labels intentionally avoid template ids, run ids, release ids, and change request ids.
- Every API response includes `x-request-id`. Send `x-request-id` on inbound requests to preserve a caller trace id; standard error responses also include `error.requestId`.
- API access logs are emitted as single-line JSON with `event=http_request`, `requestId`, `actorId`, `roleCount`, method, path, status code, and duration.
- API and worker startup use shared runtime configuration validation through `@gmi/runtime-config`, so invalid provider, Temporal, port, timeout, or database URL settings fail early with actionable errors.
- The implemented API surface is tracked in `docs/api/template-analysis-api.json` and checked by `npm run test:api-surface`.

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
OPENAI_COMPATIBLE_RETRY_BACKOFF_MS=250
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
OPENAI_COMPATIBLE_RETRY_BACKOFF_MS=250
npm run dev:worker
```

The standalone curl example lives at `scripts/examples/deepseek-chat-completions.curl`.
The OpenAI-compatible adapter retries transient provider failures such as HTTP 408, 429, 5xx, and network errors with configurable exponential backoff, while non-retryable 4xx errors fail fast with a stable `provider_error:*` message. Startup configuration rejects invalid provider names and requires `OPENAI_COMPATIBLE_EXTRA_BODY_JSON` to be a JSON object, so provider metadata stays low-cardinality and bad provider-specific options fail before the first workflow task. `npm run test:ai-adapter` verifies retry, backoff, provider-specific request fields, output schema parsing, and deterministic-only no-provider behavior locally.

The business harness still owns workflow state, policy routing, persistence, and review gates. Provider SDKs and OpenAI-compatible APIs are used only behind `@gmi/ai-adapters` for model orchestration, structured output, guardrails, and tracing.
Worker analysis activities emit single-line JSON events with `event=ai_analysis_activity`, run/template/version ids, provider, model, prompt version, status, and duration. These activity logs deliberately omit raw template content, masked prompts, and model output.

For local governance API authorization, use the lightweight header mode until SSO or an API gateway is attached:

```bash
API_AUTH_MODE=header
curl -H 'x-actor-id: analyst-local' \
  -H 'x-gmi-roles: analysis_runner,change_maker,change_checker,auditor' \
  http://127.0.0.1:4000/ready
```

Protected analysis and governance routes require both `x-actor-id` and one of these roles: `analysis_runner`, `analysis_reader`, `change_maker`, `change_checker`, or `auditor`. Health and readiness remain public. Set `API_AUTH_MODE=disabled` only for isolated local debugging.

For an API gateway, SSO proxy, or service mesh that injects already-authenticated identity headers, use gateway mode:

```bash
API_AUTH_MODE=gateway
API_GATEWAY_ACTOR_HEADER=x-gmi-authenticated-actor
API_GATEWAY_ROLES_HEADER=x-gmi-authenticated-roles
```

Gateway mode ignores local client `x-actor-id` / `x-gmi-roles` as the source of truth, normalizes the trusted gateway actor into the internal command context, and keeps controller-level `@RequiresRoles(...)` checks unchanged.

The web client centralizes its local actor context in `apps/web/src/lib/governanceActor.ts`. Override `VITE_GOVERNANCE_ACTOR_ID`, `VITE_GOVERNANCE_ACTOR_DISPLAY_NAME`, and `VITE_GOVERNANCE_ROLES` to align API auth headers, My Tasks reviewer filtering, and audit actor IDs during local testing.
For protected command routes, the API uses the authenticated `x-actor-id` header as the command actor and ignores spoofed actor IDs in request bodies; body actor fields remain only for backwards-compatible local clients.

The immutable governance ledger is exposed through:

```bash
curl -H 'x-actor-id: auditor-local' \
  -H 'x-gmi-roles: auditor' \
  'http://127.0.0.1:4000/audit-events?changeRequestId=CR-...'
```

`/audit-events` supports filtering by `objectType`, `objectId`, `sourceRunId`, `changeRequestId`, and `limit`.
`/review-tasks` exposes analysis review tasks with `status`, `objectType`, `objectId`, `sourceRunId`, `assignedTo`, and `limit` filters so review-required analysis results can be traced from the workbench into a reviewer queue.
`GET /analysis-runs/{runId}/evidence-package` exports a single-run evidence package with the public run response and related audit events. Successful and failed provider runs use the same contract; failed packages expose public error summaries without raw provider details.
`POST /review-tasks/{taskId}/transition` lets reviewers claim, start, escalate, resolve, or dismiss review tasks with actor attribution and audit events.
The Review Queue Discovery, My Tasks, and Completed tabs load status-filtered template review tasks from this API. API-backed tasks can be claimed, started, and resolved from the queue, with local fallback data when the API is unavailable.

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

To seed a richer Postgres-backed verification dataset for manual API/UI checks, run:

```bash
npm run seed:verification:pg
```

The seed command writes a timestamped dataset with nine reusable verification cases: auto-recorded, review-required, blocked, enhanced-review, candidate-version-drift, approved, pending, changes-requested, and rejected governance paths. It then verifies analysis result projections, review task queues, pending approvals, evidence packages, audit events, and latest release evidence. Override `SEED_DATASET_ID` when you need a stable dataset label for demos.

To generate a fresh dataset and verify that the NestJS API can read it through real HTTP endpoints, run this after `npm run infra:up`:

```bash
npm run test:seed-verification-api:pg
```

This API-level gate starts the API against local Postgres, checks the nine seeded analysis results, the in-review task, the pending approval, the approved change request evidence package, and the persisted latest release evaluation.

To validate the seed dataset shape without Postgres, run:

```bash
npm run test:verification-seed-cases:local
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

This runs type checks, secret scan, backend smoke, readiness and metrics smoke, PII masking gate, golden replay evals, verification seed-case validation, provider-adapter evals without external model calls, release evidence and release-readiness gates, CI workflow verification, and build. The same no-infrastructure gate set is wired into `.github/workflows/ci.yml` for pull requests and pushes to `main` or `codex/**` branches.

The repository also includes a Playwright-based UI verification script:

```bash
npm run test:ui
```

For local backend contract verification without Postgres or Temporal, run:

```bash
npm run test:backend
```

This smoke test covers API validation, analysis run submission, repository domain errors, Change Request creation, maker-checker submission/decision, self-approval blocking, pending approval queue projection, Analysis Run and Change Request evidence packages, and the local latest-evaluation query surface. Key success and error responses are parsed through the shared Zod response contracts in `packages/contracts`.

The AI Template Analysis frontend uses the same contracts for result projections and can submit a manual re-analysis through `POST /template-versions/{versionId}/analysis-runs`, then poll `GET /analysis-runs/{runId}` with the returned run id. Analysis result projections include both `templateUuid` and `versionId` so UI commands use stable governance identities instead of display labels. They also carry routing metadata (`policyDecision`, `reviewTaskId`, and `changeRequestId`) so the workbench can show why a result is auto-recorded, review-required, or blocked.

For the golden dataset evaluation gate, run:

```bash
npm run test:evals
```

The gate currently requires at least six golden cases and checks schema validity, classification accuracy, policy routing accuracy, and placeholder recall. The replay suite covers servicing, marketing, regulatory, candidate drift, low-confidence review, PII masking block, and classification-conflict review paths.

For local PII masking trap verification before provider calls, run:

```bash
npm run test:pii:local
```

This deterministic smoke test reads `packages/policy/fixtures/pii-masking-fixtures.json` and checks that common raw email, phone, account, name, HK/CN/SG/India phone, grouped card-number, HKID, Singapore NRIC/FIN, India PAN, and IBAN patterns are converted into placeholder tokens before worker analysis reaches an AI adapter. It also protects known false positives such as OTPs, dates, template IDs, batch IDs, campaign IDs, regional-looking SKUs, rules, tickets, and experiment IDs.

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

To verify deployment-style readiness checks for the latest release evidence, run:

```bash
npm run test:release-readiness:local
```

The readiness check requires a passing evaluation, `ReadyForPromotion`, `promotionAllowed=true`, a stable `sha256:` evidence hash, no failed cases, metrics above thresholds, and optionally exact pipeline/prompt/provider/model/ruleset/dataset versions. The local smoke proves passing evidence is accepted while failed, unpersisted, and version-mismatched evidence is blocked.

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

To verify the full Postgres-backed evaluation plus release evidence readback path, run:

```bash
npm run infra:up
npm run test:evals:release-persistence:pg
```

To verify the API-owned release evidence ingestion path, including hash rejection and latest-evaluation readback, run:

```bash
npm run infra:up
npm run test:evals:release-api:pg
```

To run the same readiness check against a live API before deployment or promotion, use:

```bash
npm run check:release-readiness
```

By default this calls `http://127.0.0.1:4000/analysis-evaluations/latest` and requires persisted release evidence. Configure `RELEASE_READINESS_URL`, `RELEASE_READINESS_PIPELINE_VERSION`, `RELEASE_READINESS_PROMPT_VERSION`, `RELEASE_READINESS_MODEL_PROVIDER`, `RELEASE_READINESS_MODEL_NAME`, `RELEASE_READINESS_RULESET_VERSION`, `RELEASE_READINESS_DATASET_VERSION`, and `RELEASE_READINESS_MIN_CASE_COUNT` to bind the check to a specific candidate.

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

This smoke uses the local header authorization mode, starts the API and worker on an isolated Temporal task queue, submits an analysis run, waits for worker completion, and verifies persisted `analysis_outputs`, `review_tasks`, and `audit_events`.

To verify provider failure persistence through the same API -> Temporal -> worker -> Postgres loop, run:

```bash
npm run infra:up
npm run test:harness:temporal:provider-failure
```

This smoke points the OpenAI-compatible adapter at an unavailable local provider endpoint, then verifies the API exposes a `Failed` run with a public `errors` summary, `/audit-events` exposes the `analysis_run_failed` ledger entry, and Postgres contains structured `errors_json`. The AI Template Analysis workbench consumes that summary when a re-analysis run fails, so reviewers see the failure class without raw provider payloads or direct database access; detailed provider evidence remains in Postgres for audit/debug workflows.

In Postgres-backed mode, analysis runs remain `Queued`, `Running`, `Failed`, or `Succeeded` according to the stored run state. API responses include `output` and policy routing only after the worker records `analysis_outputs`. If provider analysis ultimately fails, the worker records a failed run with structured error metadata and an audit event before preserving Temporal retry/failure semantics.

`GET /analysis-evaluations/latest` reads persisted `analysis_evaluations` and `pipeline_releases` when `DATABASE_URL` is set, and falls back to the local replay gate when no database is configured. The response includes `source.kind`, `source.persisted`, and `source.generatedAt` so release dashboards can distinguish Postgres-backed evidence from local replay fallback data.

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
