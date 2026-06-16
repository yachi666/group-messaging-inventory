# Product Design Audit: Home Tone And Coverage Chart

Date: 2026-06-15
Target: http://127.0.0.1:5175/

## Evidence

- Viewport screenshot: `01-dashboard-viewport.png`
- Full-page screenshot: `02-dashboard-fullpage.png`

## Scope

Single-screen visual and UX audit for the dashboard home page, focused on:

- Overall color tone
- Primary coverage bar chart
- First-screen hierarchy

## Current Health

The dashboard structure is sound: sidebar, filter strip, KPI cards, primary chart, right-side insights, and inventory table match the documented dashboard-first direction.

The visual problem is concentrated in the first viewport. The canvas, sidebar, active nav, primary CTA, filter active pill, table header, chart background, and chart bars all use nearby purple tones. This makes the page feel washed together instead of premium and data-dense.

## Findings

1. Purple is over-applied.
   `tokens.css` defines purple as both the canvas and the accent family, and `global.css` applies it heavily to the sidebar active state, primary button, filters, chips, chart frame, and chart bars. The result is low visual separation between product chrome and data.

2. The coverage chart reads as decoration before data.
   The current stacked bars are large rounded pills with a saturated purple gradient and no visible y-axis, gridlines, value labels, or legend inside the card. The unknown segment is present, but it appears as a small orange cap rather than a risk signal.

3. The chart geometry weakens comparison.
   Each bar sits inside a fully rounded vertical capsule. This makes the top and bottom curves visually dominate, especially in January and February, and it becomes harder to compare monthly differences.

4. The first screen has too many accent surfaces competing.
   Active nav, primary CTA, active filter, KPI trend chips, chart badge, and chart fill all claim attention. The user's eye has no calm path from title to KPI to chart insight.

5. The palette does not yet match the product's governance mood.
   The product is about audit readiness, unknown traffic, owner confirmation, and evidence. The current soft purple direction feels friendly but not grounded enough for operational governance.

## Recommendations

1. Move from purple canvas to neutral graphite or blue-tinted canvas.
   Keep purple only as a small accent, or switch the accent to blue/teal. Recommended token direction:
   - canvas: `#f5f7fb` or `#eef5ff`
   - sidebar: `#f8fafc`
   - surface-tint: `#f3f6fb`
   - accent: `#3478f6` or `#14a39a`

2. Reduce accent dominance.
   Use the accent for active nav, primary CTA, and selected filter only. Use neutral surfaces for cards, chart frames, table headers, and inactive chips.

3. Redesign the coverage chart as an analytical chart.
   Replace the oversized pill bars with slimmer stacked columns, around 42-56px wide on desktop. Add faint horizontal gridlines, a y-axis scale, a legend for Matched and Unknown, and either total labels or hover/focus labels.

4. Change the chart color semantics.
   Matched should use a calm productive color, such as blue or teal. Unknown should use amber. Avoid purple for matched if the whole app already uses purple as chrome.

5. Make unknown traffic visibly accountable.
   Add a small percentage label or count label for the unknown segment when it is large enough. This turns the chart from pretty volume bars into an audit triage tool.

6. Tune hierarchy in the first viewport.
   Make the filter strip flatter, reduce active filter saturation, keep KPI cards white, and let the primary chart title/legend carry the data story.

## Likely Code Touchpoints

- `src/styles/tokens.css`: palette and chart token changes.
- `src/styles/global.css`: sidebar active state, buttons, filters, chips, chart styling.
- `src/features/dashboard/DashboardPage.tsx`: chart legend, value labels, and potentially axis markup.

## Evidence Limits

This audit is based on static screenshots and DOM inspection. It does not verify color contrast numerically, keyboard focus order, or screen reader behavior beyond visible structure and ARIA labels.
