# Administration

## 目标

集中承载低频、全局和技术治理能力。Administration 不应成为普通业务用户的日常工作区。

## 导航结构

1. Users & Access
2. Reference Data
3. Matching & Classification
4. Workflow & SLA
5. Analysis Runs
6. Audit Trail
7. Data Processing

## Users & Access

- 用户、角色、Market/LoB Scope
- Active / Suspended
- 最后登录和权限更新时间
- Business、Governance、Viewer、Admin 分配

权限变更需要记录审计。Admin 身份不自动获得 Governance Approval 权限。

## Reference Data

MVP 以只读或受控配置为主：Platform、Channel、Market、LoB、Classification、Tenant/Workspace。

涉及正式枚举变化时显示影响范围，不允许删除仍被引用的值。

## Matching & Classification

- 查看当前 Ruleset Version
- Deterministic Rule 优先级和说明
- Confidence Band 阈值
- Classification 建议配置
- 规则生效时间和历史版本

MVP 不要求完整可视化规则编辑器。可以展示配置与版本，并使用受控更新流程。

## Workflow & SLA

- Task Type 对应 SLA
- Priority 计算规则
- Assignment / Claim 策略
- Evidence 必填策略
- Maker–Checker 开关不可绕过

## Analysis Runs

面向技术和 Governance 的全局查询：Run ID、Object、Trigger、Model/Ruleset、Status、Duration、Confidence、Warnings、Time。

支持进入统一 Analysis Run Detail，但不能在此直接改变治理结果。Re-analysis 需生成新 Run。

## Audit Trail

统一搜索 Object、Actor、Action、Approval、Time、Scope。记录不可编辑，支持授权范围内导出。

Audit Trail 与 Analysis Runs 分开：前者回答“人和系统做了什么”，后者回答“分析如何执行并得出结论”。

## Data Processing

- Source / Platform
- Last Ingestion
- Processing Status
- Accepted / Rejected Records
- Data Freshness
- Parsing Errors

MVP 提供可见性和排查入口，不提供完整数据管道运维控制台。

## 验收要点

- 普通业务用户看不到无权限的 Administration 区域。
- Admin 与 Governance 权限明确分离。
- 配置和审计记录有版本与时间。
- Analysis Run 不可覆盖，Audit Record 不可编辑。

