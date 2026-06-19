# Agent 实施指南

## 目标

将设计文档转换为前端实现时，保持对象模型、状态、权限和页面行为一致。

## 推荐实施顺序

1. 按 `field-dictionary.md` 扩展 `src/domain/`：UseCase、Template、TemplateVersion、AnalysisRun、ReviewTask、ChangeRequest、EvidenceReference。
2. 重构 Mock Data，使对象通过 ID 关联而不是在页面中重复嵌套。
3. 建立导航与路由状态：Dashboard、Use Cases、Templates、Review Queue、Administration。
4. 先实现只读 List / Detail，再实现 Draft 和 Approval 状态。
5. 最后接入 Dashboard 聚合和 AI Analysis 展开层。

## 页面与设计文档映射

| Route intention | Spec |
| --- | --- |
| `/dashboard` | `pages/dashboard.md` |
| `/use-cases` | `pages/use-case-list.md` |
| `/use-cases/:id` | `pages/use-case-detail.md` |
| `/templates` | `pages/template-list.md` |
| `/templates/:id` | `pages/template-detail.md` |
| `/review` | `pages/review-queue.md` |
| `/admin/*` | `pages/administration.md` |

当前项目不一定使用 URL Router；以上是目标信息结构，不强制立即引入依赖。

## 数据建模约束

- 不用 Template ID 单独作为 React Key 或业务主键。
- Template 使用内部 UUID；组合键用于显示、搜索和去重。
- Approved Snapshot 与 Draft Change Request 分开存储。
- 不把 Lifecycle、Approval、Mapping 合并成一个 `status`。
- Version、Analysis Run 和 Audit Record 采用不可变记录。
- 使用 `unknown`、`not_available`、`restricted`、`not_applicable` 区分缺失语义。
- Derived 字段不在编辑表单中直接维护。

## UI 约束

- 沿用根目录 `DESIGN.md` 和 `src/styles/tokens.css`。
- 列表展示 Approved 值，并单独提示 Pending Changes。
- AI Summary 默认可读，Technical Details 渐进展开。
- 所有治理按钮根据 Role、Scope、Object State 联合判断。
- 不为 MVP 增加手工 Create Use Case / Template / Version。
- 不为 Active Use Case 增加 Split。

## 每页必须覆盖的状态

- Loading
- Empty
- Filtered Empty
- Error
- Partial / Stale Data
- Restricted Fields
- Approved with Pending Changes
- Role without action permission

## 验证清单

- TypeScript typecheck 与 production build 通过。
- 一级导航与设计索引一致。
- List → Detail → Review 的主流程可走通。
- Maker 不能 Self-Approve。
- Candidate Split 不能产生空组。
- Approved 数据在 Pending 期间保持不变。
- Template composite identity 不发生冲突。
- Candidate Version 不覆盖 Current。
- Dashboard 下钻保留筛选条件。
- 中英文 UI 文案同步。
