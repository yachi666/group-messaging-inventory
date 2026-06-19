# 核心工作流

## 自动发现

```text
Production Events
→ Normalize Metadata
→ Resolve Template Composite Identity
→ Detect Template Version
→ Match or Suggest Use Case
→ Calculate Confidence
→ Route to Inventory or Review Queue
```

分流规则：

- 已知 Template + 已知 Version：更新 Volume 和 Last Seen。
- 已知 Template + 重要内容变化：创建 Candidate Version。
- 未知 Template 组合键：创建 Unassigned Template。
- 高置信度且已有 Approved Mapping：沿用 Mapping，并保留解释。
- 低置信度或无法匹配：创建 Discovery Review Task。
- Retired 对象出现 Live Traffic：创建 Drift Task。

## Candidate Use Case

Use Case 只能由系统生成 Candidate，不允许用户从空白表单创建。

```text
System-generated Candidate
→ Business Enrichment
→ Optional Split / Merge
→ Submit Approval Package
→ Governance Decision
→ Active Use Case
```

提交前至少需要：Name、Description、Classification、Market、Message Owner、Integrating System Owner、Reason、至少一个 Template，以及配置要求的 Evidence。

## Candidate Split

- 仅 Candidate Use Case 可 Split。
- Candidate 至少有两个 Templates 时显示操作。
- 用户将 Templates 分配到两个或多个 Candidate Groups。
- 每组至少一个 Template，并补齐必填字段。
- Source Lineage、Production Events 和 Analysis Runs 随 Template 保留。
- 全部结果作为一个 Approval Package 整体审批。
- MVP 不允许拆分 Active Use Case。
- 批准后原 Candidate 的 `candidateResolution` 标记为 `Split` 并保留只读历史，新 Candidate 获得独立 ID。

## Merge

- Candidate 可以合并到另一个 Candidate 或 Existing Active Use Case。
- Active Use Case 可以发起 Merge，但必须审批。
- Merge 页面必须展示保留对象、被合并对象、字段冲突和 Template 归属结果。
- 不删除历史对象；被合并 Candidate 使用 `candidateResolution=Merged`，Active Source Object 保留 Redirect 与审计关系。

## Template Mapping

```text
Unassigned / Suggested Template
→ Reviewer selects Existing Use Case
→ Change Request
→ Governance Approval
→ Assigned Mapping
```

MVP 不允许从 Template 页面创建 Use Case。没有合适的 Existing Use Case 时，保持 Unassigned、填写原因或请求 Re-analysis，等待系统生成 Candidate。

## Candidate Template Version

```text
Detected Content Change
→ Candidate Version
→ Compare with Current
→ Confirm / False Positive / Re-analysis
→ Governance Approval
→ Current Version
```

批准后原 Current 变为 Superseded。False Positive 必须记录原因。

## Active Object Change

```text
Approved Snapshot
→ Propose Changes
→ Draft Change Request
→ Pending Approval
→ New Approved Snapshot
```

页面必须同时展示 Effective 与 Proposed，不能让 Draft 伪装成已生效数据。

同一对象同一时刻只允许一个 Open Change Request。提交时若 `baseRevision` 已落后于当前 Approved Revision，申请必须 Rebase 或 Withdraw，不能静默覆盖。

## Re-analysis

- Re-analysis 创建新的 Analysis Run。
- 不覆盖历史 Run。
- 不自动覆盖人工决定或 Approved Mapping。
- 结果变化通过 Diff 展示，并在需要时生成新的 Review Task。
