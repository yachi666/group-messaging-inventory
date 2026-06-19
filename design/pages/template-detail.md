# Template Detail

## 目标

展示 Template Identity、Parent Use Case、版本历史、生产流量、AI 分析与治理状态。

## Header

Template ID、Platform + Tenant、Parent Use Case、Current Version、Mapping、Lifecycle、Volume、Last Seen、Approval。

Actions：Review Mapping、Propose Reassignment、Review Candidate Version、Request Re-analysis、Propose Retirement/Reactivate。

## Tabs

### Overview

- Internal UUID、Composite Identity
- Channel、Market、Sender、Format
- Parent Use Case、Classification、Mapping Confidence、Reason、Effective Date
- First/Last Seen、Volume、Delivery Rate、Anomalies

Unassigned 状态可以选择 Existing Use Case、保持 Unassigned 并填写原因，或 Request Re-analysis；不能创建 Use Case。

### Versions & Content

- Version Timeline
- Candidate / Current / Superseded
- Masked Content、Variables、Fingerprint
- 与上一版本 Diff
- Confirm New Version、False Positive、Re-analysis、Submit Approval

### Traffic

Volume Trend、Delivery Outcomes、Sender Changes、维度分布、Version 切换点、Source Lineage。

### AI Analysis

复用统一 Analysis Run，并重点展示 Pattern、Variable Extraction、Version Detection、Parent Use Case Matching 和 Similar Templates。

### Governance

Approved Mapping、Current Version、Pending Mapping/Version/Lifecycle Change、Evidence、Diff、Submitter、Checker。

### Activity

Discovery、Version、Mapping、Analysis、Lifecycle、Approval 和 Notes。

## 验收要点

- Identity 与 Version 清楚分离。
- Candidate Version 不覆盖 Current。
- 同一 Template 同时只允许一个 Pending Mapping Change。
- 历史 Version 和 Run 不可覆盖。

