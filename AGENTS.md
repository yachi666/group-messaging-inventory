# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript app for the Group Messaging Inventory MVP. Source lives in `src/`:

- `src/app/` composes the application root.
- `src/features/dashboard/` contains the dashboard screen and feature-specific UI.
- `src/components/` holds reusable presentational components.
- `src/domain/` defines shared product types and contracts.
- `src/data/` contains mock inventory data shaped like future API responses.
- `src/i18n/` contains locale messages and the language provider.
- `src/lib/` contains small framework-agnostic helpers.
- `src/layout/` contains the app shell and navigation.
- `src/styles/` contains design tokens and global CSS.

Generated production output is written to `dist/`. Product and visual direction are documented in `README.md`, `DESIGN.md`, and `requirements*.md`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server.
- `npm run typecheck` runs TypeScript project checks with `tsc -b --pretty false`.
- `npm run build` runs type checks and creates a production build in `dist/`.
- `npm run preview` serves the production build locally for verification.

Install dependencies with `npm install` and keep `package-lock.json` committed when dependencies change.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and named exports, matching the existing code. Use 2-space indentation and single quotes in `.ts` and `.tsx` files. Component files use PascalCase, for example `MetricCard.tsx`; helpers and data modules use camelCase, for example `format.ts` and `mockInventory.ts`.

Keep domain unions and records explicit with `satisfies` where it improves type safety. Prefer design tokens from `src/styles/tokens.css` over hard-coded colors, spacing, and radii.

## Testing Guidelines

No test framework is currently configured. Before opening a PR, run `npm run typecheck` and `npm run build`. If tests are added later, place feature tests near the feature they cover or under a clear `src/**/__tests__/` pattern, and document the new test command in `package.json` and this file.

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
