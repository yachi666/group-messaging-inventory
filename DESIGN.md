---
version: alpha
name: Group Messaging Inventory Design System
description: A friendly, data-dense dashboard language for Group Messaging Inventory. The style is inspired by polished Apple-like finance dashboards: direct navigation and content on a soft presentation canvas, pale navigation, rounded metric cards, clean chart panels, and calm status colors. The accent color is intentionally themeable; purple is the reference direction, but blue, teal, or graphite can be used without changing the layout system.
---

# Design Principles

- **Dashboard first**: open directly on usable inventory, coverage, triage, evidence, and audit data. Avoid marketing-page structure.
- **Friendly governance**: make audit and compliance data feel approachable without becoming playful or decorative.
- **No backing shell**: render navigation and content directly on the page canvas; do not place the whole app on a large white or empty background panel.
- **Cards for data modules only**: use cards for KPIs, charts, tables, inspectors, and queues. Do not nest cards.
- **Readable density**: keep enough information on screen for governance work, but use whitespace, row separators, and chips to preserve scanning.
- **Themeable accent**: purple is allowed, but the system should work with blue, teal, green, or neutral graphite accents.
- **Evidence over decoration**: charts and status chips should communicate coverage, unknown traffic, confidence, drift, ownership, evidence, and audit readiness.

# Visual Language

The main product view should feel like a premium SaaS dashboard arranged directly on a soft canvas.

Use:

- direct app layout without a large backing panel behind the whole interface
- pale sidebar navigation
- rounded metric cards
- fine gray borders
- subtle shadows
- pill filters and segmented controls
- soft chart palettes derived from the selected accent
- compact tables with tinted headers and status chips

Avoid:

- dark cyber/security dashboard styling
- generic purple gradient blobs
- heavy shadows
- nested cards
- oversized hero typography
- page sections that look like marketing content
- dense enterprise gray tables with no visual hierarchy

# Color Tokens

```yaml
colors:
  canvas: "#f3f0ff"
  canvas-deep: "#4b4864"
  app-shell: "transparent"
  sidebar: "#f6f4fb"
  surface: "#ffffff"
  surface-soft: "#fbfaff"
  surface-tint: "#f2efff"
  table-header: "#f7f4ff"
  hairline: "#e8e5ef"
  hairline-strong: "#d9d5e5"

  ink: "#17151f"
  body: "#3d3948"
  muted: "#777286"
  muted-soft: "#a29dad"
  inverse: "#ffffff"

  accent: "#7b61ff"
  accent-active: "#654ee8"
  accent-soft: "#ece7ff"
  accent-subtle: "#f6f2ff"

  success: "#1f9d62"
  success-soft: "#e8f7ef"
  warning: "#d98c17"
  warning-soft: "#fff3dd"
  danger: "#d84b4b"
  danger-soft: "#fdecec"
  info: "#3578e5"
  info-soft: "#e9f1ff"
  neutral-chip: "#f1eff6"

  chart-accent-1: "#7b61ff"
  chart-accent-2: "#a99aff"
  chart-accent-3: "#d5ccff"
  chart-success: "#38b779"
  chart-warning: "#f2aa3f"
  chart-danger: "#e65d5d"
```

## Accent Themes

Purple is the reference accent, but it is not mandatory. To change the product mood, keep all layout, radius, and density rules the same and swap only the accent family.

```yaml
accentThemes:
  purple:
    accent: "#7b61ff"
    accent-active: "#654ee8"
    accent-soft: "#ece7ff"
    canvas: "#f3f0ff"
  blue:
    accent: "#3478f6"
    accent-active: "#1f5fd6"
    accent-soft: "#e8f0ff"
    canvas: "#eef5ff"
  teal:
    accent: "#14a39a"
    accent-active: "#0b827b"
    accent-soft: "#e4f7f5"
    canvas: "#effaf8"
  graphite:
    accent: "#4f5668"
    accent-active: "#353b49"
    accent-soft: "#eceef3"
    canvas: "#f2f3f6"
```

# Typography

Use system fonts to keep the Apple-like product feel.

```yaml
typography:
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', Inter, Segoe UI, sans-serif"

  page-title:
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0
  section-title:
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 0
  card-title:
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0
  metric:
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: 0
  metric-small:
    fontSize: 22px
    fontWeight: 800
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
  lg: 20px
  xl: 28px
  shell: 32px
  pill: 999px

shadows:
  shell: "0 32px 80px rgba(61, 54, 96, 0.22)"
  card: "0 10px 30px rgba(47, 43, 67, 0.06)"
  floating-control: "0 8px 18px rgba(47, 43, 67, 0.08)"

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  shell-padding: 24px
```

# Layout

```yaml
desktopShell:
  canvas:
    background: "{colors.canvas}"
    minHeight: "100vh"
    padding: "0"
  appShell:
    background: "transparent"
    borderRadius: "0"
    boxShadow: "none"
    maxWidth: "none"
    minHeight: "100vh"
    margin: "0"
    display: "grid"
    gridTemplateColumns: "220px 1fr"
    overflow: "visible"

sidebar:
  background: "{colors.sidebar}"
  padding: "24px 18px"
  navItemHeight: "42px"
  activeBackground: "{colors.accent}"
  activeText: "{colors.inverse}"
  inactiveText: "{colors.body}"
  radius: "{rounded.pill}"

main:
  padding: "26px 28px 28px"
  display: "grid"
  gap: "18px"
```

The default dashboard grid should use:

- a header row for title, filters, search, notifications, profile, and export action
- a four-card KPI strip
- a large primary chart area
- one right-side insight panel
- a bottom table plus one or two compact chart modules

# Components

## App Shell

```yaml
app-shell:
  background: "transparent"
  borderRadius: "0"
  boxShadow: "none"
  overflow: "visible"
```

Use the app shell only as a layout grid. Do not use it as a visible backing panel behind the whole application.

## Sidebar

```yaml
sidebar-logo:
  size: "36px"
  background: "{colors.ink}"
  textColor: "{colors.inverse}"
  radius: "{rounded.pill}"

sidebar-nav-item:
  height: "42px"
  padding: "0 14px"
  radius: "{rounded.pill}"
  typography: "{typography.button}"

sidebar-nav-item-active:
  background: "{colors.accent}"
  textColor: "{colors.inverse}"
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
  title: "{typography.page-title}"
  subtitle: "{typography.body}"
  controls:
    height: "40px"
    radius: "{rounded.pill}"
```

Common actions:

- Manage widgets
- Export CSV
- Export pack
- Build response pack
- Resolve selected

Primary actions use the accent color. Secondary actions are tinted neutral pills with gray border.

## KPI Cards

```yaml
kpi-card:
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card}"
  padding: "18px"
  minHeight: "122px"
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
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  boxShadow: "{shadows.card}"
  padding: "18px"
```

Charts should use rounded bars, soft gridlines, and clear legends. Prefer:

- grouped bar chart for matched vs unknown traffic
- donut for audit readiness or exception mix
- stacked bar for unknown ageing
- horizontal progress bars for confidence bands
- compact sparklines for volume anomaly

## Data Table

```yaml
data-table:
  background: "{colors.surface}"
  border: "1px solid {colors.hairline}"
  borderRadius: "{rounded.lg}"
  headerBackground: "{colors.table-header}"
  rowHeight: "46px"
  separator: "1px solid {colors.hairline}"
```

Tables should be compact, rounded, and friendly. Use chips instead of long status text when possible.

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

- Use accent tones for primary series.
- Use success for matched/confirmed/completed.
- Use warning for unknown/pending/ageing.
- Use danger only for high-risk drift or SLA breach.
- Keep legends small and close to charts.
- Show real units: percentage, monthly volume, item count, ageing days.
- Annotate the most important insight, not every data point.
- Prefer 5-7 visible bars or rows in compact modules.

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
- Primary action appears top right.
- Search is an icon field in the header.
- KPI cards can drill into filtered views.
- Table rows open a right-side inspector.
- Charts should support hover tooltips in prototypes when feasible.
- Export actions should show CSV and regulator response pack choices.
- Triage actions should include assign owner, mark reviewed, link evidence, and submit for checker.

# Accessibility

- Text contrast must pass WCAG AA on neutral and tinted surfaces.
- Do not rely on color alone for status; combine color with label text.
- Keep table text at 12px minimum and body text at 14px minimum.
- Interactive targets should be at least 36px high on desktop.
- Preserve focus states for pills, buttons, table rows, and navigation items.
