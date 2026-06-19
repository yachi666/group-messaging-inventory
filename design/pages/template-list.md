# Template List

## 目标

独立管理由生产数据发现的技术消息资产，支持从 Template ID、Platform、Tenant、Sender 和 Mapping 状态出发调查。

## 顶部区域

- Search composite identity
- Assigned / Unassigned
- Filters
- Export

禁止显示 `Create Template`。

## 默认列

Template ID、Platform、Tenant/Workspace、Parent Use Case、Current Version、Channel、Market、Sender Identity、Mapping、Lifecycle、Monthly Volume、Last Seen、Confidence、Approval。

## Filters

Platform、Tenant、Channel、Market、Sender、Parent Use Case、Mapping、Lifecycle、Has Candidate Version、Approval、Confidence、Last Seen、Volume。

## 预设视图

All、Unassigned、New Templates、Candidate Versions、No Recent Traffic、Retired but Live、Pending Mapping Changes。

## 行为

- 点击行进入 Template Detail。
- Row Menu：View Parent Use Case、Review Mapping、Review Candidate Version、Request Re-analysis、Export。
- Reassign、Retire 和 Reactivate 从详情页发起 Change Request。

## 验收要点

- 相同 Template ID 在不同 Platform 或 Tenant 下显示为不同记录。
- 支持完整组合键和单字段搜索。
- Unassigned Template 始终可见。
- 不提供手工创建 Template 或 Use Case 的入口。

