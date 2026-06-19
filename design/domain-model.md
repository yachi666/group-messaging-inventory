# 领域模型

## 对象关系

```text
Use Case
  └── Template
        └── Template Version
              ├── Analysis Run
              └── Production Events

Review Task / Change Request 可以引用任意治理对象。
```

## Use Case

Use Case 表示发送一类消息的业务目的，是 Inventory 的主要业务对象。

关键字段：

- Internal Use Case ID
- Name、Description
- Markets、Lines of Business
- Classification：Regulatory / Servicing / Marketing
- Message Owner、Integrating System Owner、Contact Point
- Lifecycle、Approval Status
- Evidence 和完整度
- 关联 Templates
- 汇总 Volume、Delivery Outcomes、First Seen、Last Seen

Use Case 不能人工凭空创建。系统从生产数据、Templates 和分析结果生成 Candidate Use Case。

## Template

Template 是实现 Use Case 的技术资产。

业务唯一键：

```text
Platform + Tenant/Workspace + Template ID
```

系统同时生成稳定的内部 Template UUID。外部字段修正不能改变 UUID，也不能破坏历史关系。

规则：

- Template 必须由生产数据发现，不能人工创建。
- Template 可以暂时 Unassigned。
- 一个 Template 同一时间只能属于一个 Active Use Case。
- 重新关联 Parent Use Case 属于治理变更。

## Template Version

同一 Template 业务唯一键下，重要内容或治理配置变化创建新 Template Version。

关键字段：

- Version ID、Version Number
- Parent Template UUID
- Masked Content、Content Fingerprint
- Variables、Placeholder Types
- Material Configuration Snapshot
- First Seen、Last Seen、Effective Date
- Change Summary、Previous Version Diff
- Version Status、Approval Status

规则：

- Version 不能人工凭空创建。
- 检测到的新版本先成为 Candidate Version。
- 审批通过后 Candidate 成为 Current，原 Current 成为 Superseded。
- 历史 Production Events 继续关联当时的 Version。

## Analysis Run

Analysis Run 是规则、提取、Clustering 或 AI 的一次不可变执行记录。

它保存：

- Trigger、Source、Masked Input
- Extraction Flow 各步骤
- Normalized Fields、Extracted Pattern、Variables
- Candidate Matches、Classification Suggestion
- Overall 与 Field-level Confidence
- Rules Hit、Cluster ID、Fingerprint
- Model、Prompt、Ruleset Version
- Duration、Warning、Error、Retry
- 最终人工决定（如果该 Run 用于审核）

后续 Run 不能覆盖历史 Run。

## Production Event

Production Event 表示实际外发活动。MVP 前端可以使用聚合数据，但数据结构应保留 Platform、Tenant、Template、Version、Channel、Market、Sender、时间、Delivery Outcome、Volume、Match 和 Source Lineage。

## Review Task 与 Change Request

- Review Task：需要调查、补充或人工判断的工作项。
- Change Request：对 Approved 数据提出的版本化变更。

二者不能直接覆盖正式对象。批准后由系统生成新的 Effective Snapshot。

## 状态模型

不同状态维度不得合并成一个通用 Status。

| 维度 | 状态 |
| --- | --- |
| Use Case Lifecycle | Candidate / Active / Retired |
| Candidate Resolution | Open / Activated / Merged / Split / Dismissed |
| Template Lifecycle | Active / No Traffic / Retired |
| Template Version | Candidate / Current / Superseded |
| Mapping | Assigned / Unassigned / Suggested / Mapping Change Pending |
| Approval | Draft / Pending Approval / Changes Requested / Approved / Rejected / Withdrawn |
| Review Task | Open / Assigned / In Review / Pending Approval / Resolved / Dismissed |

## 不变量

- Approved Snapshot 在新 Change Request 获批前继续生效。
- Draft 值不能混入 Approved 列表、Dashboard 或默认导出。
- Candidate Use Case 至少包含一个 Template。
- Candidate Split 后每组至少包含一个 Template。
- Active Use Case 在 MVP 中不能 Split。
- 任何人不得审批自己发起的 Change Request。
- Classification 属于 Use Case，Template 继承该值，不单独维护。
- Use Case 的 Platform 和 Channel 从关联 Templates 聚合，不直接编辑。
- 同一治理对象同一时刻只允许一个 Open Change Request；提交时必须校验 Base Revision。
