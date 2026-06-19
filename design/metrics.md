# 指标口径

所有页面使用本文件中的定义。Dashboard、列表统计和导出不得自行解释同名指标。

| 指标 | 定义 | 默认下钻 |
| --- | --- | --- |
| Matched Traffic | 关联到 Approved Active Use Case 的生产流量占比 | 匹配流量明细 |
| Candidate Traffic | 仅关联 Candidate Use Case 的流量 | Candidate Review |
| Unmatched Traffic | 无法关联任何已识别 Template 或 Use Case 的流量 | Discovery Review |
| Unassigned Template | 已识别 Template 但没有 Approved Parent Use Case | Template List / Unassigned |
| Active Use Case | Lifecycle 为 Active 且 Approved 的 Use Case | Use Case List / Active |
| Active Template | 选定时间内有流量且未 Retired 的 Template | Template List / Active |
| Governance Complete | Owner、Classification 和必要 Evidence 均 Approved 的 Active Use Case | Governance Gaps |
| Pending Approval | Approval Status 为 Pending Approval 的 Change Request | Governance Approval |
| Overdue | 超过配置 SLA 且未 Resolved 的 Task 或 Request | Review Queue / Overdue |
| Owner Completeness | 具有 Approved Message Owner 与 Integrating System Owner 的对象比例 | Owner Gaps |
| Evidence Completeness | 满足配置 Evidence 要求的对象比例 | Evidence Gaps |

## 统计规则

- 默认只统计 Approved Effective 数据。
- Candidate 和 Pending Change 以独立序列或辅助数字展示。
- `Unavailable`、`Partial` 与 `0` 必须区分。
- 每个指标显示 Time Range、Scope 和 Last Updated。
- 平台数据延迟时显示 Data Freshness 警告，不将缺失数据视为零。

