# Review Queue

## 目标

统一承载人工调查和 Governance 审批。它是行动中心，不是 Inventory 的另一种展示。

## 一级视图

- Discovery Review
- Governance Approval
- My Tasks
- Completed

## Discovery Review

任务类型：Unmatched Traffic、Unassigned Template、Candidate Use Case、Candidate Version、Low-confidence Mapping、New Sender、Retired but Live、Volume Anomaly。

默认列：Task ID、Type、Object/Summary、Platform、Market、Channel、Confidence、Priority、Ageing、Assignee、Status、Updated。

### Task Detail

1. What was discovered：Source、Traffic、Template Identity、Version、Volume、Lineage。
2. What the system suggests：Matches、Classification、Confidence、Reasons、Extraction Flow。
3. What the reviewer decides：与任务类型匹配的治理动作。

不提供手工创建 Use Case。无 Existing Use Case 可关联时，保持 Unassigned、请求 Re-analysis 或等待系统生成 Candidate。

## Candidate Split Workspace

- 原 Candidate、Templates、Candidate Groups 三部分。
- 每组至少一个 Template。
- 每组补齐必填业务字段。
- 全部结果组成一个 Approval Package。
- 只能整体 Approve、Request Changes 或 Reject。

## Governance Approval

申请类型：Candidate Activation/Split/Merge、Use Case Change、Template Mapping、Candidate Version、Owner/Classification/Evidence、Retire/Reactivate。

详情顺序：Summary、Before/After、Related Objects、AI Recommendation、Evidence、Reason、History、Decision。

Checker 只能 Approve、Request Changes 或 Reject，不能静默改写申请，也不能 Self-Approve。

## Priority 与 SLA

- Critical：Retired but Live、高流量未知消息。
- High：高流量 Unassigned、即将超时。
- Medium：Candidate、低置信度 Mapping。
- Low：低流量异常和信息补充。

显示 Ageing、Due Date、Approaching SLA、Overdue。

## MVP 批量操作

允许批量 Assign、Priority、Export、Mark Viewed；不允许批量 Approve、Reject 或 Mapping。

## 验收要点

- Discovery 与 Approval 不混为一类任务。
- Changes Requested 回到原 Maker。
- Rejected 不删除 Candidate 或 Analysis Evidence。
- Approved 后对象状态、Dashboard 和 Inventory 一致更新。

