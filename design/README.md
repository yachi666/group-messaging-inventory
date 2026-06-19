# Group Messaging Inventory Design Index

本目录是产品设计与实施约束的唯一入口。它回答“页面和流程应该怎样工作”；产品范围与必须交付的能力以根目录的 [English PRD](../requirements.md) 和 [中文 PRD](../requirements.zh.md) 为准，视觉语言以 [DESIGN.md](../DESIGN.md) 为准。

## 已选视觉目标

- [Governance Investigation Workbench](./visuals/governance-investigation-workbench.png)：MVP Review Queue 的已确认实现方向。

## Agent 必读顺序

1. [领域模型](./domain-model.md)
2. [角色、权限与治理](./roles-and-governance.md)
3. [核心工作流](./workflows.md)
4. [端到端用户旅程](./end-to-end-journeys.md)
5. [Canonical Field Dictionary](./field-dictionary.md)
6. 当前要实现的 [页面规格](#页面规格)
7. [指标口径](./metrics.md)（涉及 Dashboard 或统计时）
8. [实施指南](./implementation-guide.md)

不要只读取单个页面文件后直接实现。页面动作受领域状态、审批规则和角色权限共同约束。

## 已确认的核心决策

- `Use Case → Template → Template Version` 是正式层级。
- Template 业务唯一键为 `Platform + Tenant/Workspace + Template ID`，另有稳定内部 UUID。
- 同一 Template 的重要内容变化创建新 Version，不创建新 Template。
- Use Case 和 Template 都不能人工凭空创建，必须来自生产数据发现。
- 系统生成 Candidate Use Case；用户可以补充、合并和拆分 Candidate。
- MVP 只允许拆分 Candidate Use Case，不允许拆分 Active Use Case。
- 重要变更采用 Maker–Checker；任何人不得审批自己的变更。
- Governance Team 可以修改对象，但其修改必须由另一名 Governance 用户审批。
- AI Analysis 是对象和审核流程中的辅助能力，不是一级导航。
- Approved 数据与 Draft/Pending 数据必须始终分开显示和统计。

## 共享设计文件

- [领域模型](./domain-model.md)：对象、关系、唯一键和状态。
- [角色、权限与治理](./roles-and-governance.md)：Business、Governance、Viewer、Admin 的能力边界。
- [核心工作流](./workflows.md)：自动发现、Candidate、版本、审批、合并和拆分流程。
- [端到端用户旅程](./end-to-end-journeys.md)：角色如何跨页面完成发现、审核和审批。
- [Canonical Field Dictionary](./field-dictionary.md)：字段名称、类型、来源、编辑权限和敏感级别。
- [指标口径](./metrics.md)：Dashboard 与列表统计的统一定义。
- [实施指南](./implementation-guide.md)：路由、数据契约、状态处理和验收顺序。

## 页面规格

- [Dashboard](./pages/dashboard.md)
- [Use Case List](./pages/use-case-list.md)
- [Use Case Detail](./pages/use-case-detail.md)
- [Template List](./pages/template-list.md)
- [Template Detail](./pages/template-detail.md)
- [Review Queue](./pages/review-queue.md)
- [Administration](./pages/administration.md)

## 一级导航

1. Dashboard
2. Use Cases
3. Templates
4. Review Queue
5. Administration

Evidence、Analytics、AI Analysis 和 Audit Trail 不作为独立一级导航。它们分别进入对象详情、Dashboard、Review Queue 或 Administration。

## 文档维护规则

- 新的跨页面业务决策先更新共享设计文件，再更新受影响页面。
- 页面特有行为只写在对应页面规格中。
- 领域字段只在 `field-dictionary.md` 定义，页面文件只选择展示与操作。
- 指标含义只在 `metrics.md` 定义，其他文件引用其名称。
- 需求变化同时检查中英文 PRD 是否需要更新。
- 若代码行为与本文档冲突，不要静默选择；在实施说明中指出冲突并请求产品确认。
