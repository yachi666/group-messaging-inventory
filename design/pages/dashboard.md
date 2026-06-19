# Dashboard

## 目标

回答 Inventory 覆盖、当前行动和风险变化。Dashboard 不承担编辑和审批。

## Global Filters

Time Range、Platform、Channel、Market、Classification、Tenant/Workspace，并显示 Last Updated 和 Data Freshness。

## KPI

- Matched Traffic
- Active Use Cases
- Unassigned Templates
- Open Review Tasks
- Pending Approvals
- Governance Completeness

指标定义见 [metrics.md](../metrics.md)。

## Modules

### Coverage & Discovery

Matched、Unmatched、Unassigned Volume 和 Candidate Coverage 趋势；Candidate 不能计入 Matched。

### Discovery Funnel

Production Traffic → Detected Templates → Assigned Templates → Approved Use Cases。

### Inventory Composition

在 Platform、Channel、Market、Classification 间切换；指标切换 Use Case Count、Template Count、Volume。

### Exceptions & Drift

Retired but Live、New Template、New Sender、Candidate Version、Volume Anomaly、Low-confidence Match。

### Governance Health

Owner/Evidence/Classification Completeness、Pending、Approval Time、Changes Requested、Overdue，并按 Market 对比。

### Template Changes

New Templates、Candidate Versions、Version Approval、No Recent Traffic、Top Changed Templates。

### Work Queue

My Tasks、Approaching SLA、Overdue、Changes Requested、Awaiting Approval，只提供下钻。

## Role Defaults

- Business：My Use Cases、Governance Gaps、Changes Requested。
- Governance：Pending、Overdue、Completeness、High-risk Drift。
- Technical：Unassigned、Candidate Versions、Platform Coverage、Freshness。

## 验收要点

- 所有 KPI 和图表可下钻到已应用同等筛选条件的页面。
- Approved、Candidate 和 Pending 数据不混合。
- Unavailable / Partial / Zero 明确区分。
- 不在 Dashboard 内执行治理动作。

