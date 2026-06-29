# Repository Guidelines

## Project Structure & Module Organization

This is an npm workspaces monorepo for the Group Messaging Inventory MVP and the Templates Analysis Harness backend.

- `apps/web/` contains the Vite + React + TypeScript frontend. Its source lives in `apps/web/src/`.
- `apps/api/` contains the NestJS API skeleton for analysis runs and governance commands.
- `apps/worker/` contains the Temporal TypeScript worker skeleton for durable analysis workflows.
- `packages/domain/` defines shared product types and status models.
- `packages/contracts/` defines Zod API and provider schemas.
- `packages/db/` defines Kysely database table types.
- `packages/policy/` contains governance and routing rules.
- `packages/ai-adapters/` contains replaceable AI provider adapters, including local test adapters and the OpenAI Agents SDK adapter.

Within `apps/web/src/`:

- `app/` composes the application root.
- `features/dashboard/` contains the dashboard screen and feature-specific UI.
- `components/` holds reusable presentational components.
- `domain/` contains frontend-local product types still awaiting shared-package migration.
- `data/` contains mock inventory data shaped like future API responses.
- `i18n/` contains locale messages and the language provider.
- `lib/` contains small framework-agnostic helpers.
- `layout/` contains the app shell and navigation.
- `styles/` contains design tokens and global CSS.

Generated frontend production output is written to `apps/web/dist/`. API and worker builds are written to their respective `dist/` folders. Product and visual direction are documented in `README.md`, `DESIGN.md`, and `requirements*.md`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite frontend development server from `apps/web`.
- `npm run dev:api` starts the NestJS API from `apps/api`.
- `npm run dev:worker` starts the Temporal worker from `apps/worker`.
- `npm run infra:up` starts local Postgres and Temporal through Docker Compose.
- `npm run db:migrate` applies database migrations to the local Postgres instance.
- `npm run db:smoke` runs a Postgres repository smoke test using the local Postgres instance.
- `npm run test:no-infra` runs the full no-infrastructure PR/CI gate set.
- `npm run test:backend` runs a local backend smoke test without Postgres or Temporal.
- `npm run test:evals` runs the golden dataset evaluation gate for template analysis outputs and routing decisions.
- `npm run test:secrets` runs a local secret scan for `sk-*` style API keys while allowing documented environment-variable placeholders.
- `npm run test:evals:release-persistence:local` verifies that release evidence maps into the persisted `pipeline_releases` record shape.
- `npm run test:evals:latest-api-mapping:local` verifies that persisted evaluation/release rows map into the API latest-evaluation response contract.
- `npm run test:ci-workflow` verifies the GitHub Actions CI workflow includes the required no-infrastructure harness gates.
- `npm run test:evals:pg` runs the same evaluation gate and records the report into Postgres `analysis_evaluations` when local infrastructure is running.
- `npm run test:harness:temporal` runs the full API, Temporal worker, and Postgres evidence-loop smoke test when local infrastructure is running.
- `npm run typecheck` runs TypeScript checks for the frontend, shared packages, API, and worker.
- `npm run build` runs type checks and builds shared packages, API, worker, and frontend.
- `npm run preview` serves the frontend production build locally for verification.

Install dependencies with `npm install` and keep `package-lock.json` committed when dependencies change.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and named exports, matching the existing code. Use 2-space indentation and single quotes in `.ts` and `.tsx` files. Component files use PascalCase, for example `MetricCard.tsx`; helpers and data modules use camelCase, for example `format.ts` and `mockInventory.ts`.

Keep domain unions and records explicit with `satisfies` where it improves type safety. Prefer design tokens from `apps/web/src/styles/tokens.css` over hard-coded colors, spacing, and radii.

## Testing Guidelines

No unit test framework is currently configured. Before opening a PR, run `npm run test:no-infra`. For visible frontend changes, also run `npm run test:ui` against a running frontend dev server. If tests are added later, place feature tests near the feature they cover or under a clear `apps/*/src/**/__tests__/` or `packages/*/src/**/__tests__/` pattern, and document the new test command in `package.json` and this file.

## Commit & Pull Request Guidelines

This repository has no existing commit history, so use clear, imperative commit messages such as `Add dashboard status chips` or `Refine inventory mock data`. Keep changes scoped and avoid mixing formatting-only edits with behavior changes.

Pull requests should include a short summary, verification steps, and screenshots for visible UI changes. Link related issues or requirements when available, and call out any changes to mock data, i18n keys, or design-token usage.

## Agent skills

### Issue tracker

Issues are tracked in [GitHub Issues](https://github.com/yachi666/group-messaging-inventory/issues) via the `gh` CLI. External PRs are **not** treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` at the repo root plus `docs/adr/`. See `docs/agents/domain.md`.
