# Group Messaging Inventory 产品需求文档

## 1. 文档目的

本文档定义 Group Messaging Inventory 前端产品的正式需求与 MVP 范围，并覆盖此前的需求版本。内容反映已对齐的产品模型、信息架构、治理审批流程与 AI 可解释性要求。

## 2. 产品愿景

Group Messaging Inventory 是一个用于发现、组织、审核和持续维护外发消息 Use Case 及其底层 Template 的治理系统。

产品需要帮助业务、技术和治理用户回答：

- 当前有哪些消息 Use Case，它们为什么存在？
- 每个 Use Case 由哪些 Template 实现？
- 涉及哪些 Platform、Channel、Market、Tenant 和 Sender Identity？
- 哪些生产流量已匹配、未匹配、新出现、已变化或处于 retired-but-live 状态？
- AI 判断了什么、为什么这样判断、置信度是多少？
- 谁修改或审批了正式治理数据，发生在什么时间？

AI Analysis 是贯穿产品的辅助能力，不是主要业务对象，也不是独立的一级产品模块。

## 3. 产品原则

- **Use Case 优先：** Use Case 是主要业务与治理对象。
- **Template 是实现资产：** Template 作为 Use Case 下级对象独立管理。
- **版本化而不覆盖：** 重要内容变化创建 Template Version，并保留历史。
- **人工负责：** AI 提供建议，授权用户作出最终治理决定。
- **Maker–Checker 控制：** 重要修改必须审批后才能生效。
- **默认可解释：** AI 结论需要提供业务可读解释和可展开的技术证据。
- **操作职责清晰：** Dashboard 用于汇总，List 用于管理，Review Queue 用于处理任务。
- **全程可审计：** 对象历史、AI 分析历史和审批历史需要相互区分并可追溯。

## 4. 用户与角色

### 4.1 Business Maker

Business Maker 可以：

- 查看授权范围内的 Use Case、Template、流量和分析结果。
- 补充和修改系统生成的 Candidate Use Case，并对已批准 Use Case 发起变更申请。
- 补充或修正 Owner、Classification、Evidence 和业务信息。
- 将未匹配 Template 或流量关联到 Use Case。
- 向 Governance Team 提交变更审批。
- 根据 Changes Requested 补充和修改申请。

Business Maker 不能审批自己提交的变更。

### 4.2 Governance Team

中央 Governance Team 拥有全局可见范围，可以：

- 补充和修改系统发现的 Use Case 与 Template，并遵循治理审批。
- 处理未匹配数据和 Candidate 对象。
- 批准、驳回或要求修改已提交的申请。
- 合并 Use Case、Retire 或 Reactivate 治理对象并管理 Evidence。
- 查看 AI 解释、对象历史和审批历史。

Governance 用户不能审批自己发起的变更。该变更必须由另一名 Governance 用户作为 Checker 审批。

### 4.3 Viewer

Viewer 可以：

- 搜索、筛选和查看授权范围内的 Inventory 数据。
- 查看 AI 解释和已批准的治理记录。
- 导出授权范围内的数据。

### 4.4 Administrator

Administrator 负责：

- 用户、角色和数据访问范围。
- 匹配和 Classification 配置。
- 工作流和审批配置。
- 系统设置与技术运营配置。

## 5. 领域对象模型

```text
Use Case
  └── Template
        └── Template Version
              ├── Analysis Run
              └── Production Events

Review Task / Change Request 可以关联任意治理对象。
```

### 5.1 Use Case

Use Case 表示发送一类消息的业务目的，例如“信用卡还款提醒”。MVP 中 Use Case 必须来自系统发现，不能从空白表单手工创建。

支持和需要维护的属性包括：

- 稳定的内部 Use Case ID。
- 名称和描述。
- Market 和 Line of Business。
- Classification：Regulatory、Servicing 或 Marketing。
- Message Owner。
- Integrating System Owner。
- 联系方式。
- 生命周期状态。
- 审批状态。
- Evidence 引用和完整度。
- 关联 Templates。
- 汇总流量和 Delivery Outcomes。
- 创建、验证和最后更新时间。

一个 Use Case 可以包含多个 Templates，也可以覆盖多个 Platform、Channel、Market、语言或技术实现。

### 5.2 Template

Template 表示实现某个 Use Case 的技术消息资产。MVP 中 Template 必须来自生产数据发现，不能手工创建。

Template 的业务唯一标识为：

```text
Platform + Tenant/Workspace + Template ID
```

Template ID 本身不是全局唯一。系统还必须生成稳定的内部 Template UUID，避免外部元数据修正后破坏历史引用。

Template 支持的属性包括：

- 内部 Template UUID。
- 外部 Template ID。
- Platform。
- Tenant 或 Workspace。
- Parent Use Case。
- Channel。
- Market。
- Sender Identity。
- Template Format。
- 当前 Template Version。
- Mapping Status。
- Lifecycle Status。
- Approval Status。
- 月发送量和 Delivery Outcomes。
- First Seen 和 Last Seen。
- Match Confidence。

Template 可以暂时没有 Parent Use Case。Unassigned Template 必须能在 Template List 和 Review Queue 中被发现和处理。

第一阶段中，一个 Template 同一时间只能归属于一个 Active Parent Use Case。将其重新分配到其他 Use Case 属于需要审批的治理变更。

### 5.3 Template Version

同一 Template 业务标识下，如果内容或其他重要治理配置发生变化，系统创建新的 Template Version，而不是创建新的 Template。

Template Version 包含：

- Version ID 和 Version Number。
- Parent Template UUID。
- 脱敏后的模板内容。
- Content Fingerprint。
- 提取出的变量和 Placeholders。
- 重要配置快照。
- First Seen、Last Seen 和生效时间。
- 变化摘要以及与上一版本的差异。
- Version Status。
- Approval Status。
- 关联的 Analysis Runs。

系统检测到的新版本不能覆盖旧版本。新版本首先处于 Candidate Version 状态，经过确认和审批后才能成为 Current approved version。

### 5.4 Production Event

Production Event 表示从平台日志中发现的真实外发消息活动。事件或汇总记录需要保留足够的 Source Lineage，以支持匹配、流量统计、交付统计和调查，同时尽量减少消息内容和 PII 的存储。

相关字段包括：

- Platform、Tenant 和 Workspace。
- Template ID 和检测到的 Template Version。
- Channel 和 Market。
- Sender Identity。
- Timestamp 和 Source Lineage。
- 可获得的 Message ID 和 Correlation ID。
- Delivery Outcome。
- 汇总 Volume。
- Match Status 和 Confidence。

### 5.5 Analysis Run

Analysis Run 记录规则、提取逻辑、Clustering 或 AI 针对 Template Version 或 Review Item 的一次执行。

包含：

- Run ID 和执行时间。
- Trigger 和 Source Input。
- 脱敏输入摘要。
- Extraction Flow 各步骤及结果。
- 标准化字段。
- Template Pattern 和提取变量。
- Candidate Use Case Matches。
- Classification 建议。
- 字段级和整体 Confidence。
- Rules Hit、Cluster ID 和 Content Fingerprint。
- 适用的 Model、Prompt、Extraction 和 Ruleset Version。
- 耗时、Warnings、Errors 和 Retries。
- 该分析用于审核时的最终人工决定。

Analysis Run 是不可变的历史证据，后续 Run 不能覆盖之前的结果。

### 5.6 Review Task 与 Change Request

Review Task 表示需要人工调查或决策的工作项。Change Request 表示对已批准数据的拟议变更。

任务可以关联：

- 未匹配生产流量。
- Unassigned Templates。
- Candidate Use Cases 或 Template Versions。
- 低置信度匹配。
- Drift 和生命周期异常。
- 对象修改、合并、Retire 或 Reactivate 申请。

## 6. 状态模型

Lifecycle、Approval、Mapping 和 Analysis 状态必须相互独立。

### 6.1 Use Case Lifecycle

- Candidate
- Active
- Retired

### 6.2 Template Lifecycle

- Active
- No Traffic
- Retired

### 6.3 Template Version Status

- Candidate
- Current
- Superseded

### 6.4 Mapping Status

- Assigned
- Unassigned
- Suggested
- Mapping Change Pending

### 6.5 Approval Status

- Draft
- Pending Approval
- Changes Requested
- Approved
- Rejected
- Withdrawn

## 7. 信息架构

一级导航包含：

1. Dashboard
2. Use Cases
3. Templates
4. Review Queue
5. Administration

Evidence、Analytics、AI Analysis 和 Audit Trail 不再作为独立一级导航，而是出现在对应对象详情、Dashboard、Review Queue 或 Administration 中。

## 8. 功能需求

### 8.1 Dashboard

Dashboard 用于提供可操作的 Inventory 和治理健康度汇总。

应展示：

- Use Case、Template 和 Template Version 总数。
- 各 Lifecycle 和 Approval Status 数量。
- 已匹配到 Inventory 的生产流量比例。
- 未匹配流量数量及趋势。
- Unassigned Template 数量。
- Candidate 和低置信度任务数量。
- 待审批和逾期审批数量。
- Owner 和 Evidence 完整率。
- 平均审批时长和 Ageing。
- 按 Platform、Channel、Market、Classification 的分布和趋势。
- 高优先级 Drift 和 Exception 摘要。

Dashboard 卡片和图表应支持下钻到带筛选条件的列表或队列。

### 8.2 Use Case List

Use Case List 是主要业务 Inventory 视图。

必须支持：

- 关键词搜索。
- 按 Platform、Channel、Market、Classification、Owner、Lifecycle、Approval 和 Evidence Status 筛选。
- 排序和分页。
- 在可行范围内保存筛选视图。
- CSV 导出。
- 展示 Template 数量、流量和最近活动。
- 进入 Use Case Detail。

### 8.3 Use Case Detail

Use Case Detail 替代当前 AI Template Analysis 页面，成为主要治理对象详情页。

包含：

#### Overview

- 核心业务信息。
- Classification 和 Lifecycle。
- Owner 和联系人。
- 当前生效版本和待审批变更。
- Evidence 完整度和最近活动。

#### Templates and Traffic

- 关联 Templates 和 Versions。
- Platform、Channel、Market、Tenant 和 Sender 覆盖。
- 流量趋势和 Delivery Outcomes。
- 需要审批的关联、重新分配和解绑操作。

#### AI Analysis

- 当前 AI 结论和 Confidence。
- Extraction Flow。
- Candidate Matches 和匹配解释。
- 字段级 Confidence。
- Analysis Run 历史和结果差异。

#### Governance

- Evidence 引用。
- 当前生效值和拟议值。
- 字段级变更对比。
- 提交原因和审批意见。

#### Activity

- 对象变更。
- 审批决定。
- Analysis 活动。
- Template 关联和生命周期事件。

### 8.4 Template List

Template List 是独立的运营和技术 Inventory 视图。

必须展示并支持按以下字段筛选：

- Template ID。
- Platform。
- Tenant 或 Workspace。
- Parent Use Case。
- Current Version。
- Channel、Market 和 Sender Identity。
- Mapping、Lifecycle 和 Approval Status。
- Monthly Volume 和 Last Seen。
- Match Confidence。

必须支持：

- Assigned 和 Unassigned 视图。
- 使用完整组合标识进行搜索。
- 进入 Template Detail。
- 关联已有 Use Case。
- 保持 Unassigned、请求 Re-analysis 或关联已有 Use Case；系统后续可以生成 Candidate Use Case。
- 提交 Reassignment、Retirement 或 Reactivation 变更。
- CSV 导出。

### 8.5 Template Detail

Template Detail 包含：

- 组合业务标识和内部 UUID。
- Parent Use Case。
- Platform、Tenant、Channel、Market 和 Sender 信息。
- 当前和历史 Template Versions。
- 脱敏内容、变量和版本差异。
- Traffic 和 Delivery Outcomes。
- AI Analysis 和 Extraction Flow。
- 相似 Templates 和 Candidate Matches。
- Governance Status 和 Activity History。

### 8.6 AI Analysis 与 Extraction Flow

AI Analysis 通过渐进式信息披露同时服务业务和技术用户。

默认 Summary 视图展示：

- 系统判断了什么。
- 推荐的 Use Case 和 Classification。
- Confidence 和重要不确定项。
- 业务可读的关键原因。
- 建议的人工操作。

Technical Details 展开每个 Extraction Flow 步骤：

```text
Ingestion
→ Normalization
→ Template Detection
→ Variable Extraction
→ Use Case Matching
→ Classification
```

技术详情包括脱敏输入、标准化输出、提取字段、确定性规则、候选分数、Clustering 信息、Fingerprint、Model 和 Ruleset Version、耗时、Warnings、Errors 和 Retries。

AI Analysis 可从 Use Case Detail、Template Detail、Review Task Detail 和 Administration 下的 Analysis Runs 页面进入。

### 8.7 Review Queue

Review Queue 包含两个工作区。

#### Discovery Review

包括：

- 未匹配流量。
- Unassigned Templates。
- Candidate Use Cases。
- Candidate Template Versions。
- 低置信度匹配。
- 新 Template 或 Sender Identity。
- Retired-but-live 和其他 Drift Exceptions。

审核人员可以：

- 关联已有 Use Case。
- 在系统生成 Candidate Use Case 后补充信息；不支持手工创建。
- 确认或修正 Template Version。
- 在填写原因后排除 Noise 或标记为不需要治理。
- 查看 AI Analysis。
- 将处理结果提交审批。

#### Governance Approval

包括以下拟议变更：

- Use Case 创建和修改。
- Template 关联或重新分配。
- Template Version 确认。
- Classification、Owner 和 Evidence 修改。
- Use Case 合并。
- Candidate Use Case 拆分；MVP 不支持拆分 Active Use Case。
- Retire 和 Reactivate。

Governance 用户可以批准、驳回或要求修改。队列必须支持筛选、分配或领取、Ageing、SLA 标识和审批历史。低风险批量处理可以在 MVP 后考虑。

### 8.8 Maker–Checker 工作流

重要变更遵循：

```text
Draft
→ Pending Approval
→ Approved

Pending Approval
→ Changes Requested
→ Draft

Pending Approval
→ Rejected

Draft 或 Pending Approval
→ Withdrawn
```

规则：

- 新 Change Request 获批前，原有 Approved Data 继续生效。
- 待审批值必须与当前生效值清晰区分。
- Dashboard、Report 和 Export 默认使用已批准的当前生效数据。
- Checker 可以批准、驳回或要求修改，但不应静默重写已提交申请。
- Rejection 和 Changes Requested 必须填写意见。
- 用户不能审批自己发起的变更。
- 每次审批保存 Submitter、Checker、时间、意见、字段差异和版本快照。
- 不影响治理数据的评论和内部备注可以即时保存。

### 8.9 自动发现与匹配

系统处理流程为：

```text
Production Events
→ 标准化 Metadata
→ 解析 Template 组合标识
→ 检测 Template Version
→ 匹配或推荐 Use Case
→ 计算 Confidence
→ 必要时进入人工审核
```

预期分流规则：

- 已知 Template 和已知 Version：更新流量和 Last Seen。
- 已知 Template 但内容发生重要变化：创建 Candidate Version。
- 未知 Template 组合标识：创建 Unassigned Template Candidate。
- 已知且高置信度 Mapping：应用已批准映射并保留解释。
- 低置信度或未匹配：创建 Discovery Review Task。
- Retired 对象仍有 Live Traffic：创建 Drift Task。

### 8.10 Audit 与 History

产品必须分别保留：

- **Object History：** Use Case、Template 和 Template Version 如何变化。
- **Analysis History：** 当时规则或 AI 做出了什么判断。
- **Approval History：** 谁提交、审核、批准、驳回或要求修改。

重要修改需要保留字段级差异和不可变快照。

### 8.11 Administration

Administration 包含：

- 用户、角色和访问范围管理。
- 匹配和 Classification 配置。
- 审批工作流设置。
- 面向技术和治理调查的 Analysis Runs 查询。
- Audit Trail 查询。
- 相关系统配置和处理状态。

## 9. 报表与导出

MVP 必须支持已批准 Inventory 和 Review Data 的 CSV 导出。

根据导出类型应包含：

- Use Cases 和 Classifications。
- Templates 和组合标识。
- 当前 Template Versions。
- Platform、Channel、Market、Tenant 和 Sender 信息。
- Ownership 和 Evidence Status。
- Volume 和 Delivery Outcomes。
- Mapping 和 Approval Status。
- Exception 和 Ageing 信息。

Regulator Response Pack 和高级报表构建器属于后续 Roadmap。

## 10. 安全、隐私与治理要求

- 实施 Role-Based Access 和授权数据范围。
- 限制敏感内容访问，默认展示脱敏内容。
- 尽量减少消息内容和 PII 的存储。
- 保留 Source Lineage 和 Explainability。
- 最终系统架构需要支持传输中和静态数据加密。
- 对 Production Events 应用配置的 Retention，同时保留必要治理证据。
- 根据 Policy 记录访问和变更活动。
- 防止治理变更的 Self-Approval。

## 11. MVP 范围

前端 MVP 包含：

- 展示核心 Inventory 和治理指标的 Dashboard。
- Use Case List 和 Use Case Detail。
- Template List 和 Template Detail。
- Template Version 历史和 Candidate Version 处理。
- 多维搜索和筛选。
- 未匹配、Candidate 和 Drift Review 流程。
- AI Extraction Flow 的 Business Summary 和 Technical Details。
- Maker–Checker Change Request 和 Governance Approval。
- Object、Analysis 和 Approval History。
- CSV 导出。
- 按未来 API Response 结构设计的 Mock Data。

## 12. 后续 Roadmap

MVP 后可考虑：

- 高级自定义报表和 Regulator Response Pack 生成。
- 可视化 Matching Rule 和 Policy Rule 编辑器。
- Model Operations 和质量监控控制台。
- 在明确 Policy 下自动批准低风险变更。
- 高级 Queue Assignment 和 SLA 编排。
- 扩展更多 Platform 和 Upstream System 数据接入。
- 端到端 Request 与 Message Traceability。
- 企业级 Attestation Workflow 和外部系统集成。

## 13. MVP 成功指标

- 至少 80% 的范围内生产消息量映射到 Candidate 或 Approved Use Case。
- Pilot Markets 中至少 70% 的已映射 Use Cases 拥有已确认 Owner。
- 新增未匹配流量和 Unassigned Templates 在数据接入后 24 小时内进入 Review Queue。
- 每一项已批准治理变更都具有明确的 Maker、Checker、时间和前后快照。
- 每一项 AI 辅助的审核决定都保留业务解释和可访问的技术证据。

## 14. 已确认决策

- Use Case 是 Template 的上级对象。
- 一个 Use Case 可以包含多个 Templates。
- Use Case、Template 和 Template Version 不能手工创建，必须来自生产数据发现。
- 用户可以拆分系统生成的 Candidate Use Case，但 MVP 不允许拆分 Active Use Case。
- Template 拥有独立的 List 和 Detail 页面。
- Template 业务唯一标识为 `Platform + Tenant/Workspace + Template ID`。
- Template 同时拥有稳定的内部 UUID。
- 同一 Template 标识下的重要内容变化创建新的 Template Version。
- Regulatory、Servicing 和 Marketing 是 Classification，而不是主要 Inventory 维度。
- Business 和 Governance 用户都可以修改治理对象。
- 由中央 Governance Team 统一审批。
- 任何用户都不能审批自己发起的变更。
- AI Extraction Flow 保留在对象和审核上下文中，并提供 Summary 和 Technical Details 两层视图。
