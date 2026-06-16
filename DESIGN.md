---
version: alpha
name: Group Messaging Inventory Design System
description: A clean, near-white SaaS dashboard language for the Group Messaging Inventory MVP. The visual style is extracted from the supplied reference screen: fixed light sidebar, thin global top bar, project header with tabs, white metric cards, broad map/chart modules, low-contrast dividers, compact tables, dark floating chart labels, and restrained blue-green operational accents.
---

# Reference Image Extraction

The reference interface is a polished campaign analytics dashboard. For this product, translate the visual language into a messaging inventory and governance workspace without copying the campaign subject matter.

Key traits to preserve:

- **Near-white SaaS canvas**: the whole app sits on a very pale gray-white background with white modules and almost invisible borders.
- **Fixed left sidebar**: navigation is quiet, narrow, and persistent. The selected route is a soft gray row, not a saturated brand block.
- **Thin global top bar**: search, notifications, and organization controls live in a slim header with a bottom hairline.
- **Project workspace header**: each main screen begins with a compact object header: back affordance, circular identity badge, title, subtitle, metadata, status, and overflow action.
- **Underlined tabs**: tabs are simple text labels with a thin dark underline for the active tab.
- **KPI tile grid**: small white square cards use faint icons, pale labels, and strong black numbers.
- **Primary analytic card**: the most important module is wider than the KPI tiles and combines summary copy with a map or chart.
- **Compact secondary cards**: tables and charts use dense, clean layouts with subtle row separators and little ornament.
- **Low-contrast depth**: card shadows are soft and diffuse; borders are hairline and cool gray.
- **Dark chart callouts**: maps and charts can use small charcoal floating tooltips with white text.
- **Sparse color**: blue, teal, green, and occasional red identity marks provide focus. The interface should otherwise stay white, gray, and black.

# Design Principles

- **Operational first**: open directly on inventory, coverage, triage, evidence, and audit data. Avoid landing-page or marketing composition.
- **Quiet governance**: make complex compliance and messaging inventory work feel calm, legible, and repeatable.
- **Sidebar as orientation**: use the left rail for product areas and settings. Keep it visually light so the dashboard content remains dominant.
- **Header as context**: the object header should clarify which market, workspace, or inventory baseline the user is viewing.
- **Dense but breathable**: show many useful data modules above the fold, but keep each card simple and separated by generous gutters.
- **Neutral surfaces first**: white cards, pale labels, hairlines, and subtle shadows carry the style. Accents are for state, charts, identity, and action.
- **Evidence over decoration**: charts and status indicators should communicate coverage, unknown traffic, confidence, drift, ownership, evidence, and audit readiness.
- **No nested-card clutter**: cards can sit in a grid, but avoid cards inside cards unless the inner element is a chart tooltip or small chip.

# Visual Language

The main product should feel like a premium analytics console: precise, quiet, bright, and easy to scan.

Use:

- a near-white app background
- a fixed white sidebar with grouped navigation
- a slim top bar with search and account controls
- a compact workspace header with metadata and status
- tab labels with a dark underline for active state
- white cards with 8-14px radii and soft shadows
- KPI cards in a 2x2 or horizontal strip layout
- wide map, flow, coverage, and chart modules
- light table row separators and small uppercase column labels
- charcoal floating tooltips on maps and charts
- blue and teal chart series with green success states
- red, blue, or green circular badges only for object identity or alert emphasis

Avoid:

- dark cyber/security dashboard styling
- large pill navigation as the primary app structure
- heavy saturated sidebars
- colorful full-card gradients
- decorative blobs, orbs, or atmospheric backgrounds
- beige, brown, orange, or one-note purple themes
- thick borders, heavy shadows, or high-contrast table grids
- oversized hero type
- marketing copy inside the dashboard
- rounded cards larger than 16px unless the existing implementation requires it

# Color Tokens

```yaml
colors:
  canvas: "#f8f9fb"
  canvas-subtle: "#fbfcfe"
  sidebar: "#ffffff"
  topbar: "#ffffff"

  surface: "#ffffff"
  surface-soft: "#f7f8fa"
  surface-muted: "#f3f5f8"
  surface-hover: "#f5f6f8"
  surface-selected: "#f1f3f6"
  table-header: "#fafbfc"

  hairline: "#edf0f4"
  hairline-strong: "#e3e7ee"
  divider: "#f0f2f5"

  ink: "#191c22"
  body: "#343945"
  muted: "#7f8794"
  muted-soft: "#a8b0bd"
  placeholder: "#bec4ce"
  inverse: "#ffffff"

  active: "#191c22"
  active-soft: "#303647"
  tooltip: "#303647"

  brand-red: "#e73545"
  brand-red-soft: "#fff0f2"
  brand-blue: "#2f66e8"
  brand-blue-soft: "#eef3ff"
  brand-green: "#21bd75"
  brand-green-soft: "#e9f8f1"
  teal: "#35c6a6"
  teal-soft: "#e8faf6"

  success: "#18a66a"
  success-soft: "#e8f7ef"
  warning: "#c98a1d"
  warning-soft: "#fff5df"
  danger: "#d94343"
  danger-soft: "#fdecec"
  info: "#2f66e8"
  info-soft: "#eef3ff"
  neutral-chip: "#f2f4f7"

  chart-blue: "#2563d8"
  chart-blue-soft: "#dbe6ff"
  chart-teal: "#35c6a6"
  chart-teal-soft: "#d9f6ee"
  chart-green: "#21bd75"
  chart-navy: "#303647"
  chart-red: "#e73545"
  chart-grid: "#edf1f6"
  map-land: "#e8ebf0"
  map-dot: "#485064"
```

## Gradients

Use gradients rarely. The reference screen is mostly flat white and gray.

```yaml
gradients:
  page-wash: "linear-gradient(180deg, #ffffff 0%, #f8f9fb 100%)"
  card-highlight: "linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)"
  chart-fill-blue: "linear-gradient(180deg, rgba(37, 99, 216, 0.16) 0%, rgba(37, 99, 216, 0.02) 100%)"
  chart-fill-teal: "linear-gradient(180deg, rgba(53, 198, 166, 0.18) 0%, rgba(53, 198, 166, 0.03) 100%)"
```

# Typography

Use system fonts to keep the crisp SaaS feel. Letter spacing stays at `0`; hierarchy comes from size, weight, and color.

```yaml
typography:
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', Inter, Segoe UI, sans-serif"

  workspace-title:
    fontSize: 18px
    fontWeight: 760
    lineHeight: 1.2
    letterSpacing: 0
  page-title:
    fontSize: 22px
    fontWeight: 760
    lineHeight: 1.18
    letterSpacing: 0
  section-title:
    fontSize: 13px
    fontWeight: 720
    lineHeight: 1.3
    letterSpacing: 0
  card-label:
    fontSize: 12px
    fontWeight: 560
    lineHeight: 1.35
    letterSpacing: 0
  metric:
    fontSize: 24px
    fontWeight: 760
    lineHeight: 1.08
    letterSpacing: 0
  metric-small:
    fontSize: 18px
    fontWeight: 740
    lineHeight: 1.12
    letterSpacing: 0
  body:
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  body-strong:
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: 0
  caption:
    fontSize: 11px
    fontWeight: 560
    lineHeight: 1.35
    letterSpacing: 0
  table:
    fontSize: 11px
    fontWeight: 560
    lineHeight: 1.35
    letterSpacing: 0
  button:
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0
```

# Radius, Shadows, Spacing

```yaml
rounded:
  xs: 6px
  sm: 8px
  md: 10px
  lg: 14px
  xl: 18px
  pill: 999px

shadows:
  card: "0 16px 34px rgba(32, 39, 55, 0.055)"
  card-soft: "0 10px 24px rgba(32, 39, 55, 0.045)"
  sidebar: "1px 0 0 rgba(237, 240, 244, 0.95)"
  topbar: "0 1px 0 rgba(237, 240, 244, 0.95)"
  tooltip: "0 10px 20px rgba(25, 28, 34, 0.18)"
  floating-control: "0 8px 18px rgba(25, 28, 34, 0.10)"

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
```

# Layout

```yaml
desktopShell:
  canvas:
    background: "{colors.canvas}"
    minHeight: "100vh"
  app:
    display: "grid"
    gridTemplateColumns: "188px minmax(0, 1fr)"
    gridTemplateRows: "48px minmax(0, 1fr)"
  sidebar:
    gridRow: "1 / -1"
    width: "188px"
    background: "{colors.sidebar}"
    borderRight: "1px solid {colors.hairline}"
    padding: "14px 10px"
  topbar:
    height: "48px"
    background: "{colors.topbar}"
    borderBottom: "1px solid {colors.hairline}"
    padding: "0 24px"
    display: "flex"
    alignItems: "center"
    justifyContent: "space-between"
  main:
    padding: "18px 28px 28px"
    display: "grid"
    gap: "16px"
    overflow: "auto"

workspaceHeader:
  minHeight: "82px"
  background: "{colors.surface}"
  borderBottom: "1px solid {colors.hairline}"
  display: "grid"
  gridTemplateRows: "1fr 36px"
  padding: "14px 28px 0"

dashboardGrid:
  display: "grid"
  gridTemplateColumns: "300px minmax(0, 1fr)"
  gap: "16px"
  kpiGrid:
    display: "grid"
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
    gap: "12px"
  lowerGrid:
    display: "grid"
    gridTemplateColumns: "300px minmax(0, 1fr) 300px"
    gap: "16px"
```

Responsive rules:

- Collapse the app to one column below tablet width.
- Convert the sidebar into a top or drawer navigation on small screens.
- Stack KPI tiles above the primary analytic card on narrow layouts.
- Preserve fixed heights for charts, maps, and metric tiles so content does not jump.

# Components

## Sidebar

```yaml
sidebar-profile:
  display: "grid"
  gridTemplateColumns: "32px 1fr auto"
  gap: "8px"
  minHeight: "40px"

sidebar-search:
  height: "32px"
  radius: "{rounded.sm}"
  background: "{colors.canvas-subtle}"
  border: "1px solid {colors.hairline}"
  placeholderColor: "{colors.placeholder}"

sidebar-item:
  height: "34px"
  padding: "0 10px"
  radius: "{rounded.xs}"
  textColor: "{colors.muted}"
  iconColor: "{colors.muted-soft}"

sidebar-item-active:
  background: "{colors.surface-selected}"
  textColor: "{colors.ink}"
  iconColor: "{colors.ink}"
```

Navigation labels for this product:

- Home
- Dashboard
- Inventory
- Triage
- Evidence
- Analytics
- Audit Trail
- Settings
- Connected Services
- Password & Security
- Team

## Top Bar

```yaml
topbar-search:
  width: "min(420px, 42vw)"
  height: "34px"
  background: "transparent"
  border: "0"
  iconColor: "{colors.placeholder}"
  placeholderColor: "{colors.placeholder}"

topbar-icon-button:
  size: "34px"
  radius: "{rounded.pill}"
  background: "transparent"
  hoverBackground: "{colors.surface-hover}"

org-switcher:
  height: "38px"
  display: "grid"
  gridTemplateColumns: "32px auto"
  gap: "8px"
```

The top bar should feel functional and almost invisible. Avoid heavy buttons here.

## Workspace Header

```yaml
object-badge:
  size: "36px"
  radius: "{rounded.pill}"
  background: "{colors.brand-red}"
  textColor: "{colors.inverse}"

workspace-meta:
  display: "flex"
  alignItems: "center"
  gap: "18px"
  typography: "{typography.caption}"
  textColor: "{colors.muted}"

workspace-tabs:
  height: "36px"
  gap: "28px"
  activeUnderline: "2px solid {colors.ink}"
```

For this product, the object header can represent a baseline, market, program, or inventory workspace.

Recommended tabs:

- Overview
- Markets
- Platforms
- Evidence
- Audit

## KPI Cards

```yaml
kpi-card:
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card-soft}"
  padding: "18px"
  minHeight: "118px"
```

KPI cards should contain:

- faint icon badge at top-left
- pale label
- strong black metric
- optional subtle trend or comparison caption

Recommended KPIs:

- Traffic matched
- Unknown traffic
- Drift exceptions
- Owner confirmed
- Evidence linked
- Pending checker
- Low confidence
- Parser errors

## Primary Map Or Coverage Card

```yaml
coverage-card:
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card-soft}"
  padding: "18px 20px"
  minHeight: "250px"
  display: "grid"
  gridTemplateColumns: "160px minmax(0, 1fr)"
  gap: "20px"

map-tooltip:
  background: "{colors.tooltip}"
  color: "{colors.inverse}"
  borderRadius: "{rounded.xs}"
  boxShadow: "{shadows.tooltip}"
  padding: "8px 10px"
```

Use this module for market coverage, region readiness, channel reach, or traffic baseline.

Suggested content:

- Market coverage count
- Messages classified
- Reporting period
- Last refreshed timestamp
- map with region dots
- 3-5 dark floating callouts for important markets

## Table Cards

```yaml
table-card:
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card-soft}"
  padding: "0"
  overflow: "hidden"

table-header:
  height: "42px"
  padding: "0 16px"
  borderBottom: "1px solid {colors.hairline}"

table-row:
  minHeight: "44px"
  padding: "0 16px"
  borderBottom: "1px solid {colors.divider}"
```

Tables should be compact, rounded, and friendly. Use avatars, initials, or small owner dots where accountability matters.

Core inventory columns:

- Use case
- Status
- Market
- Platform
- Channel
- Sender identity
- Template reference
- Monthly volume
- Classification
- Confidence
- Owner status
- Audit status

## Chart Cards

```yaml
chart-card:
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card-soft}"
  padding: "16px"
  minHeight: "190px"
```

Prefer:

- horizontal split bars for matched vs unknown traffic
- centered diverging bars for owner and checker status
- radar chart only for compact comparison summaries
- donut chart for audit readiness or exception mix
- stacked bar for unknown ageing
- sparklines for volume anomaly

## Status Chips

```yaml
chip:
  height: "22px"
  padding: "0 8px"
  radius: "{rounded.pill}"
  typography: "{typography.caption}"

chip-success:
  background: "{colors.success-soft}"
  textColor: "{colors.success}"
chip-warning:
  background: "{colors.warning-soft}"
  textColor: "{colors.warning}"
chip-danger:
  background: "{colors.danger-soft}"
  textColor: "{colors.danger}"
chip-info:
  background: "{colors.info-soft}"
  textColor: "{colors.info}"
chip-neutral:
  background: "{colors.neutral-chip}"
  textColor: "{colors.body}"
```

Common chip labels:

- Active
- Confirmed
- Candidate
- Retired
- Unknown
- Approved
- Pending checker
- Needs evidence
- High confidence
- Medium confidence
- Low confidence
- SLA at risk

# Product-Specific Screens

## Dashboard

The dashboard is the first screen. It should show the live traffic baseline and audit readiness in the same calm analytics structure as the reference screen.

Required modules:

- object header for the current inventory baseline
- tabs for overview, markets, platforms, evidence, and audit
- KPI grid for matched traffic, unknown traffic, drift exceptions, owner confirmed
- large market coverage card with map or region summary
- owner/accountability table
- confidence or maker-checker split chart
- audit readiness or evidence interest radar/donut equivalent

## Inventory

The inventory screen is table-first.

Required modules:

- inventory table
- filters for market, LoB, platform, channel, classification, status
- selected use case inspector
- match explanation
- evidence references
- maker-checker state
- audit trail preview

## Triage

The triage screen is queue-first.

Required modules:

- exception KPI strip
- unknown ageing chart
- exception mix chart
- grouped queue for retired but live, new sender identity, new template, unknown traffic, volume anomaly
- selected exception detail
- resolve selected action

## Evidence And Export

The evidence/export area should make regulator response pack readiness obvious.

Required modules:

- evidence completeness by market
- missing evidence list
- export preview
- latest validation status
- audit record completeness

# Data Visualization Rules

- Use blue as the primary quantitative series.
- Use teal or green for confirmed, reached, completed, or active states.
- Use warning for unknown, pending, or ageing states.
- Use danger only for high-risk drift or SLA breach.
- Use charcoal callouts for selected map or chart points.
- Keep legends small and close to charts.
- Show real units: percentage, monthly volume, item count, ageing days.
- Annotate the most important insight, not every data point.
- Prefer 4-7 visible bars or rows in compact modules.
- Use pale gridlines and rounded bar geometry wherever feasible.
- Do not use gradient-heavy chart backgrounds.

# Content Guidelines

Use concise operational language:

- "Messaging inventory baseline"
- "Pilot markets live traffic and evidence readiness"
- "Traffic matched"
- "Unknown traffic"
- "Drift exceptions"
- "Owner confirmed"
- "Audit readiness"
- "Recent triage items"
- "Coverage by market"
- "Build response pack"

Avoid vague marketing language:

- "Transform your governance"
- "Unlock insights"
- "Powerful platform"
- "Next-generation compliance"

# Interaction Guidelines

- Sidebar rows use soft gray hover and selected states.
- Search appears in the sidebar and top bar where useful.
- Header tabs use a thin underline, not filled pills.
- KPI cards can drill into filtered views.
- Table rows open a right-side inspector.
- Charts should support hover tooltips in prototypes when feasible.
- Export actions should show CSV and regulator response pack choices.
- Triage actions should include assign owner, mark reviewed, link evidence, and submit for checker.
- Hover states should be restrained: subtle background shift, slight lift on cards, and no harsh color jumps.

# Accessibility

- Text contrast must pass WCAG AA on neutral and tinted surfaces.
- Do not rely on color alone for status; combine color with label text.
- Keep table text at 11px minimum and body text at 13px minimum on desktop.
- Interactive targets should be at least 34px high on desktop and 44px on touch layouts.
- Preserve focus states for navigation items, tabs, buttons, table rows, and chart controls.
- Map and chart tooltips need text equivalents or persistent summaries for keyboard and screen reader access.
