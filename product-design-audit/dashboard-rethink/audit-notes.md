# Dashboard business-meaning audit

## Scope

Dashboard only. Target user: business colleagues who need to understand messaging traffic, where it comes from, which templates are active, and what changed.

## Steps and findings

1. **Current governance dashboard — poor health**
   - Evidence: `01-current-dashboard.png`.
   - “Coverage & discovery”, “Discovery funnel”, “Exceptions & drift”, “Governance health”, and “My work queue” serve different roles and decision types.
   - Most figures lack a plain business denominator or an obvious next question. The page asks business users to understand internal matching and governance mechanics before it explains traffic.
   - The code also contained two separate Dashboard implementations; the current navigation was connected to the governance version, not the previously revised traffic page.

2. **Reframed business dashboard — good health**
   - Evidence: `02-business-dashboard.png`.
   - The hierarchy now answers four questions in order: how much traffic, how it changed, where it came from, and which templates produced it.
   - Monthly/yearly controls and region/platform/channel filters update KPI values, trend, composition, and template ranking together.
   - Active templates and active use cases are derived from the same production-template data used by the composition and ranking, avoiding unrelated headline numbers.

3. **Yearly + Hong Kong filtered state — good health**
   - Evidence: `03-yearly-hong-kong-filter.png`.
   - The selected scope remains visible and all summary values update to Hong Kong.
   - The traffic mix correctly collapses to Hong Kong at 100%, while the annual chart retains comparison context.
   - A template name opens its template-detail view, preserving a clear analysis-to-detail path.

## Removed from the business landing page

- Discovery funnel
- Exceptions & drift
- Governance health matrix
- Personal work queue
- Matching/completeness KPIs

These belong in review, administration, or dedicated governance analytics surfaces rather than the business traffic landing page.

## Accessibility and evidence limits

- Native buttons and selects provide keyboard-operable controls and visible names.
- DOM checks confirmed headings, regions, filter names, and template drill-down controls.
- Screenshots cannot confirm full keyboard order, screen-reader announcements, contrast ratios, or zoom behavior; those require dedicated runtime testing.
