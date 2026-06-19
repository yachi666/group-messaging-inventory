# 端到端用户旅程

本文件定义跨页面行为与状态转换。单页实现不得破坏这些旅程。

## 旅程 1：Unassigned Template 关联已有 Use Case

**角色：** Business Maker 或 Governance User

1. 用户从 Dashboard 的 `Unassigned Templates` 下钻。
2. Template List 打开 `Unassigned` 预设视图，并保留 Dashboard Filters。
3. 用户进入 Template Detail，查看 Identity、Traffic、AI Analysis 和 Suggested Use Cases。
4. 用户选择一个 Existing Use Case，填写 Mapping Reason。
5. 系统创建 Draft Change Request；Template 仍保持 Unassigned Effective State。
6. Maker 提交后，任务出现在 Governance Approval。
7. 非发起人的 Governance Checker 查看 Before/After、AI Evidence 和影响范围。
8. Approve 后 Template Mapping 变为 Assigned，Use Case Template Count、Dashboard 和 Activity 更新。

**失败与回流：**

- 没有合适 Use Case：保持 Unassigned，填写原因或 Request Re-analysis。
- Changes Requested：回到 Maker 的 My Tasks，原 Approved/Unassigned 状态不变。
- Reject：关闭 Change Request，保留 Review 与 Analysis History。

## 旅程 2：系统生成 Candidate Use Case 并激活

**角色：** Business Maker → Governance Checker

1. 系统聚类 Templates 和 Production Events，创建 Candidate Use Case 与 Discovery Task。
2. Maker 从 Review Queue 打开 Candidate Use Case Detail。
3. Maker 查看来源 Templates、AI Summary、Extraction Flow 和 Confidence。
4. Maker 补充 Name、Description、Classification、Markets、Owners、Reason 和 Evidence。
5. 系统执行 Submit Validation。
6. Maker 提交 Candidate Activation Approval Package。
7. Governance Checker 审核 Candidate、Templates、Evidence 和 AI/Human Difference。
8. Approve 后 Candidate 变为 Active Approved Use Case，关联 Templates 的 Mapping 同时生效。

**原子性：** Use Case Activation 与该包内 Template Mappings 整体成功或整体失败。

## 旅程 3：拆分 Candidate Use Case

**角色：** Business Maker 或 Governance Maker → Governance Checker

1. Candidate 至少包含两个 Templates 时显示 `Split Candidate`。
2. 用户在 Split Workspace 将 Templates 分配到两个或多个 Groups。
3. 每组获得新的 Candidate ID，并补齐必填字段。
4. 原 Candidate 保留只读快照并标记 `Split Pending`。
5. 全部新 Candidates 作为一个 Approval Package 提交。
6. Checker 只能整体 Approve、Request Changes 或 Reject。
7. Approve 后原 Candidate 的 `candidateResolution` 标记为 `Split` 并从活动 Candidate 列表移除；新 Candidates 进入 Active。

**限制：** Active Use Case 在 MVP 中不能 Split。

## 旅程 4：确认 Candidate Template Version

**角色：** Technical/Business Reviewer → Governance Checker

1. 系统检测同一 Template Composite Identity 下的重要内容变化。
2. 创建 Candidate Version 和 Discovery Task，Current Version 保持生效。
3. Reviewer 从 Candidate Versions 进入 Template Detail。
4. Reviewer比较 Masked Content、Variables、Fingerprint 和 Material Config Diff。
5. Reviewer选择 Confirm、False Positive 或 Request Re-analysis。
6. Confirm 创建 Change Request 并提交 Governance Approval。
7. Approve 后 Candidate Version 成为 Current，原 Current 成为 Superseded。

**流量归属：** Effective Time 之前的 Events 继续关联旧 Version，之后的 Events 关联新 Version。

## 旅程 5：修改 Active Use Case

**角色：** Business Maker 或 Governance Maker → Governance Checker

1. 用户从 Use Case Detail 选择 `Propose Changes`。
2. 系统从当前 Approved Revision 创建 Draft，不直接编辑 Effective Record。
3. 用户修改允许字段并填写 Change Reason。
4. Detail 同时显示 Effective 与 Proposed Diff。
5. 提交后进入 Governance Approval。
6. Approve 生成新的 Approved Revision；Reject 或 Changes Requested 不改变 Effective Record。

**并发规则：** 同一 Use Case 同一时刻只能有一个 Open Change Request。若 Approved Revision 已变化，旧 Draft 必须 Rebase 或 Withdraw 后才能提交。

## 旅程 6：Retired but Live

**角色：** Governance User

1. 系统发现 Retired Use Case 或 Template 仍产生生产流量。
2. Dashboard Exceptions 和 Discovery Review 同时出现同一 Drift Task。
3. Reviewer查看 Source Lineage、Volume、Last Seen、Mapping 和历史 Retirement Decision。
4. Reviewer可以 Propose Reactivation、Reassign Template/Traffic 或 Confirm Retirement and Escalate。
5. 涉及 Lifecycle 或 Mapping 的决定进入 Governance Approval。
6. Resolve 后 Drift Task 关闭，但 Production Evidence 与处理记录保留。

## 旅程 7：Request Re-analysis

1. 用户从对象或 Review Task 发起 Request Re-analysis，并填写原因。
2. 原对象和人工决定不改变，Task 标记 `Awaiting Re-analysis`。
3. 系统创建新的 Analysis Run。
4. 新旧 Run 以 Diff 展示。
5. 若结论不变，Task 回到 In Review；若产生新候选或重要差异，系统更新建议但不自动覆盖人工或 Approved 数据。

## 旅程 8：Dashboard 下钻

1. 用户设置 Time、Platform、Channel、Market 等 Global Filters。
2. 点击 KPI、Chart Segment 或 Exception。
3. 目标页面使用等价 Filter Query 打开，并显示来源 Breadcrumb。
4. 用户返回 Dashboard 时，原筛选条件和滚动上下文保留。

## 通用导航契约

- List → Detail：保留 List Filters 和当前位置。
- Detail → Review Task：保留 Target Object Link。
- Review Task → Analysis Run：返回时保留 Review Draft。
- Approval → Target Object：默认打开 Governance Tab 和对应 Revision。
- Activity 中所有 Object、Run、Request ID 可在权限范围内跳转。
