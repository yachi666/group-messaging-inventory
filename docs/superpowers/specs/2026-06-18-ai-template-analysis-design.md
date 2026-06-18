# AI Template Analysis Module Design

## Goal

Add a standalone **AI Template Analysis** module to the existing Group Messaging Inventory frontend. The module presents AI-generated template analysis results for human review without changing the layout, behavior, or visual composition of existing screens.

The selected visual direction is **Option 1 — Split Inspector**:

- Reference image: `/Users/zhinan/.codex/generated_images/019ed8fa-0a44-72f0-959f-d7223c0e5380/exec-5a1c8d2d-89ce-4f4d-8894-0ebc1d3d1870.png`
- A dense result table occupies the main working area.
- A persistent detail inspector displays the selected analysis result.
- The interface follows the repository's existing near-white SaaS design system and spacing conventions.

## Scope

### Included

- Add `AI Template Analysis` as an independent item in the workspace section of the left navigation.
- Add a new screen without modifying the contents of existing screens.
- Provide realistic local mock analysis data.
- Support English and Simplified Chinese labels.
- Implement local interactions for search, filtering, result selection, classification confirmation, owner editing, candidate merge, and template demise.
- Add UI verification coverage for the new navigation entry and core interactions.

### Excluded

- Backend APIs, persistence, authentication, authorization, or audit storage.
- Real AI inference, embedding search, file processing, or asynchronous jobs.
- Changes to existing dashboard, inventory, triage, evidence, analytics, audit, or settings page composition.
- New dependencies unless the existing implementation cannot express a required interaction.

## Information Architecture

The module is a single route-like application view with three vertical regions:

1. **Header and controls**
   - Page title and concise description.
   - Search input.
   - Filters for AI message type, governance classification, confidence/review status, and owner.
   - Three summary metrics: analyzed templates, high-confidence results, and results needing review.

2. **Analysis results table**
   - Extracted template name and pattern preview.
   - AI message type.
   - Governance classification.
   - Confidence score.
   - Nearest-template similarity.
   - Review status and owner.
   - Selecting a row updates the inspector without navigation.

3. **Selected-result inspector**
   - Masked source message.
   - Extracted template pattern.
   - Confidence and quality score.
   - AI message type and governance classification shown as separate concepts.
   - Detected placeholders.
   - Nearest template match and similarity.
   - Anomaly result.
   - AI explanation steps.
   - Actions: confirm analysis, merge with template, edit owner, and demise.

## Interaction Design

- Search and filters operate against local mock data and keep the selected result valid.
- Clicking a table row selects it and visually marks the row.
- **Confirm analysis** changes the selected result to reviewed.
- **Edit owner** toggles an inline owner editor; saving updates the local result.
- **Merge with template** requires a nearest match and changes the local result to merged/reviewed.
- **Demise** changes the lifecycle state to demised and uses the existing danger styling.
- Each action presents a compact status banner so the user can see the outcome.
- Empty filter results show a clear empty state with a reset action.

## Frontend Structure

Keep the new feature isolated:

```text
src/features/ai-analysis/
  AiTemplateAnalysisPage.tsx
  analysisData.ts
  analysisTypes.ts
```

- `analysisTypes.ts` defines the frontend result contract.
- `analysisData.ts` holds realistic mock records shaped like a future API response.
- `AiTemplateAnalysisPage.tsx` owns screen-local filtering, selection, and demonstration actions.
- `App.tsx` dispatches the new `ai-template-analysis` view.
- `AppShell.tsx` adds the navigation item and a matching lightweight CSS icon.
- Existing shared `StatusChip` and global design tokens are reused.
- New styles are namespaced with `analysis-` classes and appended to `global.css` to avoid affecting existing pages.

## Display Contract

Each analysis result contains:

- stable result ID and template ID
- display name
- masked source message
- extracted template pattern
- placeholder list
- AI message type
- governance classification
- classification confidence
- quality score
- nearest-template ID, name, and similarity when available
- anomaly list
- owner
- review status
- lifecycle status
- AI explanation steps
- analyzed timestamp and channel

AI message type and governance classification remain separate fields because they describe different dimensions of the result.

## Responsive Behavior

- Desktop: table and inspector remain side by side.
- Medium widths: inspector narrows while the table scrolls horizontally inside its region.
- Small widths: table and inspector stack; the inspector follows the result list.
- Existing application shell breakpoints remain authoritative.

## Accessibility

- Navigation and table selection expose current/selected state.
- Filter controls have explicit labels.
- Actions use real buttons and inputs with keyboard access.
- Status is communicated with text as well as color.
- The action-result banner uses an appropriate live region.
- Focus styles continue to use the existing focus token.

## Error and Empty States

Because this is a frontend-only prototype, errors are limited to invalid local actions:

- Merge is disabled when no candidate match exists.
- Empty owner values cannot be saved.
- Empty filtered results provide a reset control.
- Demised records remain inspectable and visibly marked rather than disappearing unexpectedly.

## Verification

- TypeScript typecheck succeeds.
- Production build succeeds.
- Existing UI verification remains green.
- New UI checks cover:
  - opening the module from the sidebar
  - selecting a result
  - applying a filter
  - confirming an analysis
  - editing an owner
  - merging a matched candidate
  - demising a template
  - rendering Chinese labels after locale switching

## Acceptance Criteria

- Existing screens render and behave as before.
- The sidebar contains one new workspace item for AI Template Analysis.
- The selected Split Inspector screen closely follows the approved visual direction while using the repository's existing tokens and components.
- Every essential control on the new screen performs a visible local interaction.
- No backend assumptions leak into existing feature code.
- Typecheck, build, and UI verification pass.
