# Group Messaging Inventory 产品需求文档

## 1. 文档目的

本文档描述 Group Messaging Inventory 的产品需求、MVP 范围、功能能力、数据要求、安全合规要求与分阶段路线图。

该产品旨在通过自动化方式从生产消息日志中发现、归类并维护外发消息清单，帮助业务负责人和技术团队持续回答以下问题：

- 当前有哪些 outbound messages 正在生产环境发送？
- 每类消息对应哪个 use case？
- 谁是 Message Owner 和 Integrating System Owner？
- 消息通过哪个 platform、channel、sender identity 和 template 发送？
- 是否能够提供可审计、可解释、可导出的 evidence，证明消息发送处于受控状态？

## 2. 背景与问题陈述

当前 Group 范围内存在多个 Messaging-owned platforms，例如 MDP、SFMC、ICCM、IRIS。不同平台承载不同 channel、market、LoB 和 system integration，导致外发消息资产分散在多个系统、日志和人工维护清单中。

在缺少统一 inventory 的情况下，业务和技术团队难以及时确认：

- 哪些消息仍在 live production 中发送；
- 发送量、发送渠道和 delivery outcomes；
- 消息 owner、upstream system owner 和审批 evidence；
- inventory 中标记为 retired 的消息是否仍然出现在 logs 中；
- 是否出现新的 sender ID、domain、template 或未知 traffic。

因此需要建设 Group Messaging Inventory，通过 production logs 自动发现实际发送行为，并结合规则匹配、clustering、human validation、audit trail 和 reporting，形成可持续维护的消息治理能力。

## 3. 产品目标

Group Messaging Inventory 的目标是创建并维护集团级 messaging inventory，覆盖 in-scope platforms 的 outbound messages，并支持以下能力：

- 自动 ingest production logs；
- 从 logs 中 extract 和 normalise 关键 metadata；
- 将 message events 匹配或聚类为 candidate use cases；
- 为每个 match、classification 和 inferred attribute 提供 confidence score；
- 支持 markets / LoBs 通过 triage workflow 确认 use case、owner、classification 和 evidence；
- 提供 inventory export、dashboard、unknown traffic list 和 regulator response pack；
- 提供 role-based access、PII minimisation、retention、encryption 和 explainability；
- 支持分阶段扩展到更多 platforms 和 upstream system traceability。

## 4. 目标用户

### 4.1 业务负责人

业务负责人主要关注：

- 当前 market / LoB 范围内有哪些 live outbound messages；
- 每类消息的 owner、classification 和审批 evidence；
- unknown / unmatched traffic 的处理状态；
- 是否可以快速生成监管、审计或治理场景所需的 response pack。

### 4.2 技术团队

技术团队主要关注：

- 不同 platforms 的 log ingestion、data contracts 和 source lineage；
- extraction、normalisation、matching、clustering 和 drift detection 逻辑；
- upstream system attribution 的可行性和技术约束；
- 安全、权限、retention、encryption、audit trail 和可运维性。

## 5. 适用范围与边界

### 5.1 MVP 范围

MVP 初期覆盖 Messaging-owned platforms：

- MDP
- SFMC
- ICCM
- IRIS

MVP 需要在 pilot markets 中验证端到端能力。具体 pilot markets 保留占位，待项目启动阶段确认。

占位：

- Pilot Market 1: TBD
- Pilot Market 2: TBD
- Pilot Market 3: TBD

### 5.2 非 MVP 范围

以下能力不作为 MVP 必须交付项，但纳入后续 roadmap：

- DSP / CIB 等非 Messaging-owned platforms 的全面接入；
- 全量 upstream system attribution；
- 完整 policy-based non-compliance detection；
- 与 Workbench / EMI 作为 system of record 的深度集成；
- 全企业范围 automated attestation workflow。

### 5.3 关键边界说明

- 工具初期仅覆盖 Messaging-owned platforms。
- DSP、CIB 等其他 platforms 需要后续通过 onboarding feeds 接入。
- Upstream system attribution 只有在 logs 或 telemetry 中包含 upstream identifier 时才可靠。
- 如果缺少 upstream identifier，该字段应标记为 `unknown`，直到统一 metadata standard 被执行。
- 产品应优先存储 metadata 和 hashed content，避免不必要地保存 message content 或 PII。

## 6. 核心使用场景

### 6.1 发现 live outbound messages

系统自动 ingest production logs，并从 logs 中识别实际发送过的 messages，形成 live traffic baseline。

### 6.2 生成 candidate use cases

系统基于 deterministic rules 和 clustering，将 message events 归并为 candidate use cases，并给出 confidence score。

### 6.3 人工确认 ownership 与 classification

Market / LoB 用户通过 triage queue 确认或修正 use case 名称、Message Owner、Integrating System Owner、classification 和 evidence references。

### 6.4 识别 drift 与 exception

系统识别 inventory 与 logs 之间的不一致，例如：

- inventory 显示 use case 已 retired，但 logs 显示仍有 live traffic；
- 出现新的 sender ID；
- 出现新的 template；
- 出现未知或 unmatched traffic。

### 6.5 生成报表与监管响应材料

用户可以导出 inventory、exception list 和 regulator response pack，用于业务治理、审计、监管问询或管理层汇报。

## 7. 功能需求

### 7.1 Data Ingestion

系统必须支持从以下 platforms ingest production logs：

- MDP
- SFMC
- ICCM
- IRIS

MVP 阶段允许 batch ingestion 和 near real-time ingestion 两种方式。

系统应支持多种输入格式：

- CSV export
- API
- Log streams

系统必须维护 source lineage，包括：

- source platform；
- ingestion timestamp；
- source file / API / stream reference；
- data processing status；
- parsing errors 或 rejected records。

系统必须遵循 data minimisation 原则，仅存储实现 inventory、matching、audit 和 reporting 所需的数据。

### 7.2 Extraction 与 Normalisation

系统必须从 logs 中 extract 并 normalise 以下字段：

- Channel，例如 SMS、email、push、in-app；
- Platform，例如 MDP、SFMC、ICCM、IRIS；
- Tenant / workspace / sending profile；
- Timestamp；
- Message ID；
- Correlation ID；
- Sender identity，例如 SMS sender ID、short code、email From domain / address、reply-to；
- Template reference，例如 AEM / MDP template ID、SFMC asset ID、ICCM template ID；
- Delivery outcomes，例如 sent、delivered、bounced、failed；
- Volume metrics，例如 daily aggregates、monthly aggregates。

如果某些 source logs 缺少字段，系统应：

- 将字段标记为 `unknown` 或 `not available`；
- 保留缺失原因；
- 在 data quality report 中体现。

### 7.3 Use Case Matching 与 Clustering

系统必须将 message events 聚合为 candidate use cases。

匹配策略应优先使用 deterministic rules：

- template ID；
- sender identity；
- tenant / workspace；
- platform；
- channel；
- market / entity；
- sending profile。

在 deterministic rules 不足以识别 use case 时，系统应使用 clustering：

- content fingerprint；
- metadata similarity；
- sending pattern；
- sender / template / channel combination。

系统必须为以下对象提供 confidence score：

- use case match；
- inferred market / entity；
- inferred owner；
- inferred classification；
- cluster assignment。

系统必须保存 explainability 信息，说明 match 产生原因：

- 命中的 rules；
- 使用的 cluster ID；
- 关键 metadata；
- confidence score 的组成依据。

### 7.4 Drift Detection

系统必须检测 inventory 与 production logs 之间的 drift。

MVP 至少支持以下 drift 类型：

- `retired but live`: inventory 显示 retired，但 logs 中仍有 traffic；
- `new sender identity`: 出现新的 sender ID、short code、From domain 或 address；
- `new template`: 出现新的 template ID 或 asset ID；
- `unknown traffic`: 无法匹配到已有 use case；
- `volume anomaly`: 某 use case volume 与历史 baseline 存在显著差异。

Drift 结果应进入 triage queue，并支持 ageing 和处理状态跟踪。

### 7.5 Classification

MVP 阶段系统应支持 message type suggestion，后续阶段升级为必须能力。

系统应建议以下 classification：

- Regulatory
- Servicing
- Marketing

系统应为 classification suggestion 提供 confidence score。

系统应识别 content 或 template metadata 中是否包含：

- URLs；
- domains；
- contact numbers。

后续阶段系统应支持 policy-aligned flags，例如：

- public URL shorteners；
- 未批准 domain；
- 异常 contact number；
- 与 classification 不一致的 content pattern。

### 7.6 Ownership Workflow

系统必须提供 triage queue，支持 markets / LoBs 完成以下操作：

- confirm use case；
- rename use case；
- assign Message Owner；
- assign Integrating System Owner；
- confirm classification；
- link evidence，例如 approval reference、attestation reference；
- review unknown traffic；
- resolve drift exception。

系统必须支持 maker-checker 机制：

- maker 提交新增、修改或确认；
- checker 审核并批准；
- 所有状态变更写入 audit trail。

系统必须保留完整 audit trail：

- 操作人；
- 操作时间；
- 变更前后内容；
- 变更原因；
- evidence reference；
- approval status。

### 7.7 Reporting 与 Export

系统必须提供 inventory export，格式至少支持 CSV。

系统必须提供 dashboards，至少包括：

- `% traffic matched to inventory`，即 coverage；
- unknown / unmatched traffic list；
- unknown traffic ageing；
- volume by market / LoB / channel / platform；
- top sender IDs；
- top domains；
- top templates；
- drift exceptions；
- ownership confirmation status。

系统必须支持 Regulator Response Pack export，内容包括：

- market；
- channel；
- platform；
- use case；
- message classification；
- Message Owner；
- Integrating System Owner；
- sender identity；
- template reference；
- volume metrics；
- delivery outcomes；
- evidence references；
- latest validation status。

## 8. 数据需求

### 8.1 核心实体

系统至少应包含以下核心实体：

- Message Event
- Candidate Use Case
- Confirmed Use Case
- Sender Identity
- Template Reference
- Platform Source
- Owner
- Evidence Reference
- Drift Exception
- Audit Record

### 8.2 MVP Inventory 字段

MVP 生成的 use case-level inventory 至少包括：

- use case ID；
- use case name；
- status，例如 candidate、confirmed、retired；
- channel；
- market / entity；
- LoB；
- platform；
- tenant / workspace；
- sender identity；
- template reference；
- monthly volume；
- delivery outcomes；
- Message Owner；
- Integrating System Owner；
- classification；
- confidence score；
- evidence reference；
- latest validation date；
- audit status。

### 8.3 PII 与 Content 处理

系统应优先使用 metadata 和 hashed content。

对于 message content：

- 默认不存储完整 content；
- 如需存储 snippets，应限制访问权限；
- snippets 应脱敏；
- retention 应符合 records policy；
- 所有 content 访问应写入 audit trail。

## 9. 安全、隐私与合规需求

系统必须支持 role-based access control。

至少应区分以下角色：

- Viewer
- Market / LoB Maker
- Market / LoB Checker
- Platform Admin
- Compliance / Risk Viewer
- System Admin

系统必须限制敏感数据访问：

- content snippets；
- PII；
- sender-level sensitive metadata；
- evidence documents。

系统必须支持：

- encryption at rest；
- encryption in transit；
- data retention policy；
- access logging；
- audit trail；
- periodic access recertification；
- explainability for matching decisions。

## 10. MVP 定义

MVP 的目标是：在 Messaging-owned platforms 范围内，系统能够生成 use case-level inventory，并支持人工确认和导出。

MVP 必须包含：

- ingest MDP、SFMC、ICCM、IRIS logs 的能力，至少在 pilot scope 中覆盖 MDP 和一个 legacy platform；
- extraction 和 normalisation；
- deterministic matching；
- basic clustering；
- confidence scoring；
- triage workflow；
- Message Owner 和 Integrating System Owner 确认；
- classification confirmation；
- inventory CSV export；
- exception list export；
- coverage dashboard；
- unknown traffic list；
- basic audit trail。

MVP inventory 必须包含：

- channel；
- market / entity；
- platform；
- sender identity；
- template link / reference；
- monthly volume；
- delivery outcomes，如 source available；
- confidence score；
- owner confirmation status；
- classification confirmation status。

## 11. MVP 成功指标

MVP 的成功指标包括：

- 至少 80% 的 in-scope platform message volume 被映射到 candidate use cases；
- 至少 70% 的 mapped use cases 在 pilot markets 中拥有 confirmed owners；
- unknown traffic list 在 log ingestion 后 24 小时内自动生成；
- pilot users 能够通过 triage workflow 完成 use case confirmation；
- inventory 和 exception list 可被导出用于业务治理或审计准备。

## 12. 分阶段路线图

### Phase 0: Mobilise & Design, Weeks 0-4

目标：

- 确认 scope、data sources、privacy model 和 MVP schema；
- 定义 matching rules 和 confidence scoring approach；
- 定义 triage workflow、maker-checker 和 audit trail requirements；
- 确认 pilot markets。

交付物：

- signed requirements；
- data contracts；
- MVP schema；
- pilot market selection；
- implementation backlog。

### Phase 1: MVP Build + Pilot, Weeks 5-12

目标：

- ingest MDP logs；
- ingest one legacy platform logs，例如 SFMC；
- 覆盖 2-3 个 pilot markets；
- 实现 extraction、deterministic matching 和 basic clustering；
- 构建 triage queue、CSV export 和 coverage dashboard。

交付物：

- MVP tool live for pilots；
- first inventory baseline；
- unknown traffic report；
- pilot feedback。

Exit KPI：

- pilot scope 中至少 80% volume matched。

### Phase 2: Expand Coverage + Classification, Weeks 13-24

目标：

- 接入剩余 Messaging-owned platforms，例如 ICCM、IRIS；
- 增加 classification suggestions；
- 增加 URL / domain detection；
- 增加 drift detection；
- 增加 unknown traffic ageing SLA。

交付物：

- multi-platform inventory；
- exception management process；
- policy-aligned flags；
- enhanced dashboard。

Exit KPI：

- in-scope platforms 中至少 90% volume matched。

### Phase 3: End-to-End Traceability, Weeks 25-36

目标：

- 实现或消费 standard upstream identifiers；
- 建立 upstream request ID、messaging platform ID 和 vendor ID 之间的 correlation；
- 改进 retry / fallback visibility。

交付物：

- real-time traffic upstream attribution；
- traceability reporting；
- upstream identifier adoption guidance。

Exit KPI：

- pilot markets 中至少 90% real-time traffic 具备 upstream attribution。

### Phase 4: Scale Beyond Messaging-Owned Platforms, Weeks 25-52, Parallel

目标：

- onboarding DSP、CIB 等 platforms；
- 定义 minimum telemetry feeds，例如 daily export 或 API；
- 对尚未 onboarded platforms 执行 procedural registration；
- 通过 FIM 支持 quarterly attestation。

交付物：

- expanded enterprise coverage；
- non-Messaging-owned platform onboarding model；
- reduced unknown source risk；
- quarterly attestation process。

### Phase 5: BAU Hardening, Post-52 Weeks

目标：

- performance hardening；
- resilience improvement；
- access recertification；
- automated governance reporting；
- 与 Workbench / EMI 集成，作为 system of record 和 attestation workflow。

交付物：

- BAU operating model；
- production support model；
- automated governance reporting；
- access review process；
- Workbench / EMI integration。

## 13. 依赖与约束

### 13.1 数据依赖

产品依赖各 platforms 提供可用的 production logs。

关键依赖包括：

- log availability；
- field completeness；
- stable template identifiers；
- sender identity availability；
- delivery outcome availability；
- correlation ID availability；
- upstream identifier availability。

### 13.2 平台依赖

不同 platforms 的 data model、log format 和 API 能力可能不同，需要在 Phase 0 完成 data contracts。

### 13.3 组织依赖

产品需要 markets / LoBs 参与 triage、ownership confirmation 和 classification confirmation。

如果缺少业务 owner 参与，inventory 将只能停留在 candidate 状态。

### 13.4 政策依赖

Policy-aligned flags 依赖明确的 messaging policy、approved domains、approved sender identities 和 URL / contact number standards。

## 14. 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| Logs 缺少 upstream identifier | 无法可靠识别 upstream system | 标记为 unknown，并推动 metadata standard |
| Logs 格式不一致 | ingestion 和 normalisation 成本上升 | Phase 0 定义 data contracts 和 parser strategy |
| Owner 确认不及时 | inventory 长期停留在 candidate 状态 | 建立 triage SLA、ageing dashboard 和 escalation |
| PII 或 content 处理不当 | 隐私和合规风险 | 默认 metadata + hashed content，限制 snippets 访问 |
| Matching confidence 不足 | use case 归类不可靠 | deterministic rules 优先，clustering 结果进入人工确认 |
| 非 Messaging-owned platforms 未接入 | enterprise coverage 不完整 | Phase 4 通过 onboarding feeds 和 attestation 扩展 |

## 15. 待确认问题

以下事项需要在 Phase 0 或需求评审阶段确认：

- Pilot markets 具体名单；
- MVP 是否必须同时覆盖 MDP、SFMC、ICCM、IRIS，或是否允许按 pilot source 分批接入；
- Market / LoB 与 platform tenancy 的映射规则；
- Message Owner 和 Integrating System Owner 的权威来源；
- Classification 的内部标准定义；
- Evidence reference 应链接到哪些系统或文档库；
- Retention policy 的具体周期；
- Content snippets 是否允许存储，以及允许的脱敏规则；
- Maker-checker 的审批层级；
- Workbench / EMI 在 roadmap 中的集成边界。

