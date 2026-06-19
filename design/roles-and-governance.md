# 角色、权限与治理

## 角色

### Business Maker

- 查看授权范围内的 Inventory 和 Analysis。
- 补充或修改 Candidate Use Case。
- 对 Active Use Case 发起 Change Request。
- 处理授权范围内的 Discovery Review。
- 提交审批并响应 Changes Requested。
- 不能审批自己的申请。

### Governance Team

- 全局查看和处理 Discovery Review。
- 审批、驳回或要求修改 Change Request。
- 可以修改 Use Case、Template Mapping、Version、Evidence 和 Lifecycle。
- 修改后必须由另一名 Governance 用户审批。
- 可以处理 Merge、Retire 和 Reactivate。

### Viewer

- 查看、搜索、筛选和导出授权范围内的 Approved 数据。
- 可以查看允许范围内的 AI 解释和历史。
- 不能创建 Draft 或执行治理动作。

### Administrator

- 管理用户、角色和 Scope。
- 管理 Reference Data、工作流配置和系统设置。
- 查看 Processing、Analysis Runs 和 Audit Trail。
- Admin 权限不自动等同于 Governance Approval 权限。

## Maker–Checker

```text
Draft → Pending Approval → Approved
                       ├→ Changes Requested → Draft
                       └→ Rejected
Draft / Pending Approval → Withdrawn
```

规则：

- Submitter 与 Checker 必须是不同用户。
- Checker 不应静默修改申请；需要变化时使用 Changes Requested。
- Reject 和 Changes Requested 必须填写原因。
- 审批保存 Before/After、Reason、Submitter、Checker、时间和评论。
- Pending 期间 Approved Snapshot 继续用于业务读取和统计。

## Scope

- Business 用户通常受 Market / LoB Scope 限制。
- Governance Team 具有全局治理 Scope。
- Viewer 的 Export 遵循同一 Scope。
- 无权限字段显示 Restricted，不显示为缺失或空值。

## 需要审批的操作

- Candidate Use Case Activation
- Candidate Split / Merge
- Use Case 核心字段修改
- Template Mapping / Reassignment / Unlink
- Candidate Version Confirmation
- Classification、Owner、Evidence 修改
- Use Case Merge
- Retire / Reactivate

不需要审批：

- 内部评论
- 不改变治理结果的备注
- 保存个人筛选视图
- Claim / Assign Review Task

