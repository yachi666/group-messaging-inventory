# Use Case Detail

## 目标

Use Case 的统一对象工作台。Candidate、Active、Retired 和 Pending Approval 共用页面结构，但操作随状态和角色变化。

## Header

显示 Use Case ID、Name、Lifecycle、Classification、Approval、AI Confidence、Volume、Last Seen、Message Owner，以及 Effective / Pending Changes 提示。

### Candidate Actions

Edit Candidate、Split Candidate、Merge、Request Re-analysis、Mark as Noise、Submit for Approval。

### Active Actions

Propose Changes、Manage Templates、Merge、Retire。MVP 不显示 Split。

### Pending Approval

- Maker：View Changes、Edit/Withdraw。
- Checker：Approve、Request Changes、Reject。

## Tabs

### Overview

- Business Definition
- Ownership
- Governance Summary
- Operational Summary

AI 推断字段必须标记 `AI suggested`。

### Templates & Traffic

- Template 列表、Current Version、Platform、Tenant、Channel、Market、Sender、Volume、Confidence、Lifecycle
- Volume Trend、Delivery Outcomes、维度分布、Drift
- Candidate 可拆分或重组 Templates；Active 只能发起受治理的 Mapping Change

### AI Analysis

- Business Summary
- Extraction Flow
- Candidate Matches、Field-level Confidence
- Technical Details
- Analysis Run History 和 Run Diff

### Governance

- Effective Record
- Proposed Changes 的字段级 Diff
- Evidence、Reason、Submitter、Checker、Comments
- Candidate Split 作为整体 Approval Package

### Activity

Object Changes、Template Association、Analysis Runs、Approval Decisions、Comments、Lifecycle Events。

## Candidate Submit Validation

至少包含一个 Template，并具备 Name、Description、Classification、Market、Message Owner、Integrating System Owner、Reason 和必要 Evidence。

## 验收要点

- Candidate 可以 Split；Active 不可以。
- Approved 与 Proposed 同时存在时不混淆。
- Re-analysis 不覆盖人工决定。
- Retired 默认只读，但 Governance 可发起 Reactivate。

