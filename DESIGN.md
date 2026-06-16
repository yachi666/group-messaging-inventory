---
version: alpha
name: Group Messaging Inventory Design System
description: A soft open-canvas dashboard language for the Group Messaging Inventory MVP. The visual style is extracted from the supplied reference screen: a pale mist canvas, pill-shaped top navigation, white glass cards, low-saturation cyan and periwinkle gradients, delicate shadows, compact operational data, and black used sparingly for the active route or primary circular controls.
---

# Reference Image Extraction

The reference interface reads as a friendly education dashboard, but the style can be translated to a governance product without copying the subject matter.

Key traits to preserve:

- **Open canvas layout**: the product sits directly on a pale mist canvas. Do not place the whole product inside a large white background vessel.
- **Pill navigation**: navigation appears as detached top pills. The active item is a black pill with white text and a small leading icon.
- **Soft glass modules**: cards are white or barely tinted, with very light borders, inner highlights, and shadows so subtle they feel like raised porcelain.
- **Pastel data surfaces**: key modules use misty cyan, aqua, blue, and lavender gradients rather than saturated brand blocks.
- **Rounded controls and modules**: cards, inputs, chart bars, avatars, and icon buttons use large radii or full pills.
- **Compact friendliness**: the layout is dense enough for dashboard work, but labels, icons, avatars, and chips keep it approachable.
- **Black as a control accent**: black is reserved for selected navigation, one high-priority floating control, and chart markers. It should not become a dark theme.
- **Low-contrast depth**: shadows are wide and diffused; borders are hairline and cool-toned.
- **Avatar-like ownership cues**: use small owner initials, avatars, or identity dots where the product needs human accountability.

# Design Principles

- **Dashboard first**: open directly on usable inventory, coverage, triage, evidence, and audit data. Avoid marketing-page structure.
- **Friendly governance**: make audit and compliance data feel approachable without becoming childish or decorative.
- **Open command surface**: use a centered max-width layout on the pale canvas without a visible app-shell background.
- **Top navigation by default**: prefer horizontal pill navigation over a sidebar for the MVP dashboard.
- **Cards for data modules only**: use cards for KPIs, charts, tables, inspectors, queues, and schedules. Do not nest cards.
- **Readable density**: keep enough information on screen for governance work, but use whitespace, row separators, compact pills, and soft section rhythm to preserve scanning.
- **Pastel operational accent**: use aqua and periwinkle as the core data palette. Purple may appear as a supporting lavender, not as a generic gradient theme.
- **Evidence over decoration**: charts and status chips should communicate coverage, unknown traffic, confidence, drift, ownership, evidence, and audit readiness.

# Visual Language

The main product view should feel like a premium, friendly operations dashboard arranged directly on a calm mist canvas.

Use:

- a pale gray-blue page canvas with a centered max-width product layout
- no full-page white vessel, app-shell panel, or large blank white background behind all content
- detached pill navigation, search fields, filters, and icon buttons
- white glass cards with large radius, faint borders, and diffused shadows
- pastel cyan, aqua, blue, and lavender gradients for highlighted modules
- black selected states used with restraint
- soft chart shapes: rounded bars, pill markers, thin dashed reference lines, and light gridlines
- compact status chips and owner/accountability markers
- avatar, initials, or small person chips for ownership and maker-checker state

Avoid:

- dark cyber/security dashboard styling
- heavy enterprise sidebars unless a later product screen truly needs one
- generic purple gradient blobs
- beige, brown, or orange-heavy themes
- harsh gray borders or dark shadows
- full-page white shells that create empty background behind the dashboard
- nested cards
- oversized hero typography
- page sections that look like marketing content
- dense enterprise gray tables with no visual hierarchy

# Color Tokens

```yaml
colors:
  canvas: "#eef1f7"
  canvas-wash: "#f7f9fd"
  canvas-cool-shadow: "#c9d1df"

  app-shell: "transparent"
  app-shell-solid: "transparent"
  shell-border: "transparent"

  surface: "#ffffff"
  surface-glass: "rgba(255, 255, 255, 0.78)"
  surface-soft: "#f8faff"
  surface-tint: "#f1f5ff"
  surface-raised: "#ffffff"
  table-header: "#f5f8ff"

  hairline: "#e8edf5"
  hairline-strong: "#d9e1ee"
  inner-highlight: "rgba(255, 255, 255, 0.86)"

  ink: "#141418"
  body: "#373a44"
  muted: "#777e8b"
  muted-soft: "#a4abba"
  inverse: "#ffffff"

  active: "#141418"
  active-soft: "#23242a"

  accent: "#76d8dc"
  accent-active: "#26aab1"
  accent-soft: "#dcfbfb"
  accent-subtle: "#f0fdfd"

  periwinkle: "#9fb5ff"
  periwinkle-active: "#6f86e8"
  periwinkle-soft: "#eef2ff"

  lavender: "#c8d0ff"
  lavender-soft: "#f2f4ff"

  success: "#1d9d67"
  success-soft: "#e6f7ef"
  warning: "#c98a1d"
  warning-soft: "#fff4dc"
  danger: "#d84b4b"
  danger-soft: "#fdecec"
  info: "#3478f6"
  info-soft: "#e9f1ff"
  neutral-chip: "#f2f5fa"

  chart-cyan: "#76d8dc"
  chart-aqua: "#a6edf0"
  chart-periwinkle: "#9fb5ff"
  chart-lavender: "#c8d0ff"
  chart-ink: "#141418"
  chart-muted: "#e7ecf5"
```

## Gradient Recipes

```yaml
gradients:
  aqua-card: "linear-gradient(135deg, #a7eef0 0%, #dffbfb 52%, #c8f3f4 100%)"
  blue-card: "linear-gradient(135deg, #dce8ff 0%, #b8c9ff 48%, #e6edff 100%)"
  lavender-card: "linear-gradient(135deg, #edf0ff 0%, #c9d4ff 52%, #f5f7ff 100%)"
  shell-sheen: "none"
  chart-fill: "linear-gradient(180deg, rgba(118,216,220,0.16) 0%, rgba(159,181,255,0.08) 100%)"
```

# Typography

Use system fonts to keep the Apple-like product feel. Letter spacing stays at `0`; the reference relies on clean weight contrast rather than tracking.

```yaml
typography:
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, Segoe UI, sans-serif"

  page-title:
    fontSize: 30px
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: 0
  eyebrow:
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  section-title:
    fontSize: 19px
    fontWeight: 720
    lineHeight: 1.25
    letterSpacing: 0
  card-title:
    fontSize: 15px
    fontWeight: 720
    lineHeight: 1.3
    letterSpacing: 0
  metric:
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: 0
  metric-small:
    fontSize: 22px
    fontWeight: 780
    lineHeight: 1.1
    letterSpacing: 0
  body:
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  body-strong:
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: 0
  caption:
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0
  table:
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0
  button:
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0
```

# Radius, Shadows, Spacing

```yaml
rounded:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 22px
  xl: 28px
  shell: 34px
  pill: 999px

shadows:
  shell: "none"
  shell-inner: "none"
  card: "0 12px 28px rgba(88, 99, 124, 0.07)"
  card-soft: "0 8px 22px rgba(88, 99, 124, 0.05)"
  floating-control: "0 10px 22px rgba(28, 30, 38, 0.12)"
  active-pill: "0 10px 20px rgba(20, 20, 24, 0.20)"

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  shell-padding: 0
```

# Layout

```yaml
desktopShell:
  canvas:
    background: "radial-gradient(circle at 50% 0%, #f8fbff 0%, {colors.canvas} 70%)"
    minHeight: "100vh"
    padding: "56px 72px"
  appShell:
    background: "{colors.app-shell}"
    border: "0"
    borderRadius: "0"
    boxShadow: "none"
    maxWidth: "1180px"
    margin: "0 auto"
    padding: "0"
    display: "grid"
    gridTemplateRows: "auto auto 1fr"
    overflow: "visible"

topNav:
  height: "40px"
  display: "flex"
  alignItems: "center"
  justifyContent: "space-between"
  gap: "10px"
  navItemHeight: "38px"
  navItemPadding: "0 16px"
  activeBackground: "{colors.active}"
  activeText: "{colors.inverse}"
  inactiveBackground: "rgba(255,255,255,0.82)"
  inactiveText: "{colors.body}"
  radius: "{rounded.pill}"

main:
  padding: "18px 0 0"
  display: "grid"
  gap: "16px"
```

The default dashboard grid should use:

- a top pill navigation row with logo, product areas, notification/theme/profile controls
- a welcome/header row with title, membership or status chip, search, and a circular settings/filter action
- a two-column upper dashboard row: highlighted module cards on the left and a primary chart on the right
- a lower row of compact operational modules such as messages/triage, calendar/timeline, and schedule/queue
- responsive single-column stacking below tablet width while preserving card radius and pill controls

# Components

## App Shell

```yaml
app-shell:
  background: "{colors.app-shell}"
  border: "0"
  borderRadius: "0"
  boxShadow: "none"
  overflow: "visible"
```

The shell is a layout constraint only. It should not render as a visible white object or create empty white background behind the dashboard.

## Top Navigation

```yaml
top-nav-logo:
  size: "34px"
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  textColor: "{colors.ink}"
  radius: "{rounded.pill}"
  boxShadow: "{shadows.card-soft}"

top-nav-item:
  height: "38px"
  padding: "0 15px"
  radius: "{rounded.pill}"
  typography: "{typography.button}"
  background: "rgba(255, 255, 255, 0.82)"
  border: "1px solid rgba(232, 237, 245, 0.88)"

top-nav-item-active:
  background: "{colors.active}"
  textColor: "{colors.inverse}"
  boxShadow: "{shadows.active-pill}"

top-nav-icon-button:
  size: "38px"
  radius: "{rounded.pill}"
  background: "rgba(255,255,255,0.84)"
  activeBackground: "{colors.active}"
```

Navigation labels for this product:

- Dashboard
- Inventory
- Triage
- Evidence
- Analytics
- Audit Trail
- Settings

## Header

```yaml
page-header:
  eyebrow: "{typography.eyebrow}"
  title: "{typography.page-title}"
  subtitle: "{typography.body}"
  controls:
    height: "42px"
    radius: "{rounded.pill}"
```

Common actions:

- Manage widgets
- Export CSV
- Export pack
- Build response pack
- Resolve selected

Primary actions can use the black circular control pattern when they represent global filtering or command settings. Text actions use pastel tinted pills unless they are destructive.

## Highlight Cards

```yaml
highlight-card:
  background: "{gradients.aqua-card}"
  border: "1px solid rgba(255,255,255,0.58)"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card}"
  padding: "18px"
  minHeight: "218px"
```

Use highlight cards for two or three dashboard modules that deserve emotional weight, such as audit readiness, owner coverage, or evidence completion. Each card should contain:

- a leading icon badge
- concise title
- 2-3 tiny category labels or chips
- a bottom progress bar
- one top-right overflow action

## KPI Cards

```yaml
kpi-card:
  background: "{colors.surface-glass}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card-soft}"
  padding: "16px"
  minHeight: "116px"
```

KPI cards should contain:

- short label
- large metric
- trend chip
- small comparison text
- optional top-right icon button

Recommended KPIs:

- Traffic matched
- Unknown traffic
- Drift exceptions
- Owner confirmed
- Evidence linked
- Pending checker
- Low confidence
- Parser errors

## Chart Cards

```yaml
chart-card:
  background: "{colors.surface-glass}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card-soft}"
  padding: "18px"
```

Charts should use rounded bars, thin dashed target lines, soft gridlines, and close legends. Prefer:

- grouped bar chart for matched vs unknown traffic
- donut for audit readiness or exception mix
- stacked bar for unknown ageing
- horizontal progress bars for confidence bands
- compact sparklines for volume anomaly
- schedule-style lanes for maker-checker queues or evidence deadlines

## Data Table

```yaml
data-table:
  background: "{colors.surface-glass}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  headerBackground: "{colors.table-header}"
  rowHeight: "46px"
  separator: "1px solid {colors.hairline}"
```

Tables should be compact, rounded, and friendly. Use chips instead of long status text when possible. In this style, large tables can appear as a glass card with a tinted header, but avoid making the table visually heavier than the dashboard cards.

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

## Status Chips

```yaml
chip:
  height: "24px"
  padding: "0 10px"
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
chip-accent:
  background: "{colors.accent-soft}"
  textColor: "{colors.accent-active}"
chip-periwinkle:
  background: "{colors.periwinkle-soft}"
  textColor: "{colors.periwinkle-active}"
```

Common chip labels:

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

The dashboard is the first screen. It should show the live traffic baseline and audit readiness.

Required modules:

- KPI strip: matched traffic, unknown traffic, drift exceptions, owner confirmed
- Coverage flow: monthly matched vs unknown volume
- Audit readiness donut
- Recent triage items
- Confidence bands
- Top sender IDs or top templates

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
- exception mix donut
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

- Use aqua and periwinkle tones for primary series.
- Use success for matched/confirmed/completed.
- Use warning for unknown/pending/ageing.
- Use danger only for high-risk drift or SLA breach.
- Use black sparingly for selected chart markers, threshold callouts, or the current timeline point.
- Keep legends small and close to charts.
- Show real units: percentage, monthly volume, item count, ageing days.
- Annotate the most important insight, not every data point.
- Prefer 5-7 visible bars or rows in compact modules.
- Use rounded chart geometry wherever feasible: bars, progress tracks, timeline lanes, and selected-state markers.

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
- "Coverage flow"
- "Build response pack"

Avoid vague marketing language:

- "Transform your governance"
- "Unlock insights"
- "Powerful platform"
- "Next-generation compliance"

# Interaction Guidelines

- Filters are pill controls.
- Primary global control can be a black circular icon button.
- Search is a soft pill field in the header.
- KPI cards can drill into filtered views.
- Table rows open a right-side inspector.
- Charts should support hover tooltips in prototypes when feasible.
- Export actions should show CSV and regulator response pack choices.
- Triage actions should include assign owner, mark reviewed, link evidence, and submit for checker.
- Hover and active states should feel physical: slight lift, gentle scale, and no harsh color jumps.

# Accessibility

- Text contrast must pass WCAG AA on neutral and tinted surfaces.
- Do not rely on color alone for status; combine color with label text.
- Keep table text at 12px minimum and body text at 14px minimum.
- Interactive targets should be at least 36px high on desktop.
- Preserve focus states for pills, buttons, table rows, and navigation items.
- Pastel gradient cards need solid text overlays or scrims if contrast falls below AA.
