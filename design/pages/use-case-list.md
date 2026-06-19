# Use Case List

## 目标

作为正式业务 Inventory，帮助用户查找、筛选和进入系统生成的 Candidate 或 Approved Use Case。它不是任务队列，也不提供手工创建入口。

## 顶部区域

- 标题和结果数量
- Search
- Filters / Clear All
- Saved Views（MVP 可简化）
- Export

禁止显示 `Create Use Case`。

## 默认列

- Use Case ID、Name、Classification
- Markets
- Platforms / Channels
- Template Count
- Message Owner
- Lifecycle、Approval Status
- Monthly Volume、Last Activity
- Governance Issues

多值维度显示前几个值和 `+N`。

## Filters

Platform、Channel、Market、Classification、Message Owner、Lifecycle、Approval、Evidence、Template Change、Last Activity、Volume Range。

## 预设视图

All、Active、Candidates、Governance Gaps、Recently Changed、Retired。

## 行为

- 点击行进入 Use Case Detail。
- Row Menu：Edit/Propose Changes、View Templates、View Activity、Export、Retire/Reactivate。
- Approved 行存在 Draft 时，主值仍显示 Approved，并标记 Pending Changes。

## 验收要点

- 不存在手工创建 Use Case 的入口。
- Candidate 与 Active 可清楚区分。
- Draft 值不混入 Approved 列表字段。
- 所有筛选结果和导出遵循用户 Scope。

