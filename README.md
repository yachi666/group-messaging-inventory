# Group Messaging Inventory

> Dashboard-first React MVP for discovering, matching, validating, and exporting a governed inventory of outbound group messaging use cases.

[中文说明](./README.zh.md) · [MIT License](./LICENSE)

## ✨ Overview

Group Messaging Inventory helps teams answer a simple governance question: what outbound messages are live, who owns them, how are they sent, and can the control evidence be exported when needed?

This repository contains a Vite + React + TypeScript MVP shell for the product experience. It models a messaging inventory dashboard with pilot-market coverage, use case matching, triage, evidence readiness, analytics, audit trail, and governance settings.

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
- CSS design tokens
- Mock data shaped like future API responses

## 📁 Project Structure

```text
src/
  app/                  App composition
  components/           Reusable presentational UI
  data/                 Mock inventory and governance data
  domain/               Product domain types and contracts
  features/dashboard/   Dashboard-first MVP screen
  features/workspace/   Inventory, triage, evidence, analytics, audit, settings views
  i18n/                 English and Chinese messages plus language provider
  layout/               Application shell and navigation
  lib/                  Small framework-agnostic helpers
  styles/               Design tokens and global CSS
```

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run type checks:

```bash
npm run typecheck
```

Build the production bundle:

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
npm run typecheck
npm run build
```

The repository also includes a Playwright-based UI verification script:

```bash
npm run test:ui
```

## 🎨 Design Direction

The visual language is documented in [DESIGN.md](./DESIGN.md). The interface uses a friendly, data-dense governance dashboard style: pale navigation, compact tables, rounded metric cards, calm status chips, and audit-ready language.

## 🗺️ Roadmap

The product roadmap is documented in [requirements.md](./requirements.md) and [requirements.zh.md](./requirements.zh.md). Planned phases include:

- MVP pilot ingestion, extraction, deterministic matching, clustering, triage, and export
- Expanded platform coverage and classification suggestions
- End-to-end traceability using upstream identifiers where available
- Broader enterprise onboarding through telemetry feeds
- BAU hardening for access, retention, resilience, and automated governance reporting

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
