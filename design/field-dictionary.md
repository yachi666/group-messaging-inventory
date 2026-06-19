# Canonical Field Dictionary

本文件是前端字段命名、来源、可编辑性和敏感级别的统一契约。类型表示目标领域模型，不强制一次性接入真实 API。

## 字段来源

| Source | 含义 |
| --- | --- |
| System | 系统生成、计算或维护 |
| Production | 从日志或生产平台提取 |
| AI | AI/规则推断，必须带 Confidence 和 Explanation |
| Human | 用户补充或修正 |
| Derived | 从关联对象或聚合数据计算，不直接编辑 |

## 敏感级别

| Level | UI 规则 |
| --- | --- |
| Public Metadata | 授权用户正常展示 |
| Internal | 仅登录且在 Scope 内展示 |
| Restricted | 默认 Masked，需要额外权限 |
| Secret | 不进入前端数据模型，如 Token、Credential、Raw Prompt Secret |

## Null 与未知值

- `unknown`：来源存在，但无法推断该值。
- `not_available`：源系统不提供该字段。
- `restricted`：值存在，但当前用户无权限查看。
- `not_applicable`：该字段不适用于当前对象。
- `null`：尚未填写；仅用于允许为空的 Human 字段。

UI 不得将这些状态统一显示为 `-`。

## Use Case

| Field | Type | Source | Editable | Required for activation | Sensitivity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| id | string | System | No | Yes | Public Metadata | 稳定内部 ID |
| revision | number | System | No | Yes | Internal | Approved Snapshot 版本 |
| name | string | AI/Human | Draft only | Yes | Public Metadata | AI 初始建议需标记 |
| description | string | AI/Human | Draft only | Yes | Internal | 业务目的，不放原始消息内容 |
| classification | enum | AI/Human | Draft only | Yes | Public Metadata | Regulatory/Servicing/Marketing，Use Case 单选 |
| marketIds | string[] | AI/Human | Draft only | Yes | Public Metadata | 可多选；Template Market 提供建议 |
| lineOfBusinessIds | string[] | AI/Human | Draft only | No | Internal | 可多选 |
| messageOwnerId | string | Human | Draft only | Yes | Internal | 指向 Directory/User Entity |
| integratingSystemOwnerId | string | Human | Draft only | Yes | Internal | 指向 Directory/User Entity |
| contactPoint | string | Human | Draft only | No | Restricted | 默认按权限 Mask |
| lifecycleStatus | enum | System/Governed | Via Change Request | Yes | Public Metadata | Candidate/Active/Retired |
| candidateResolution | enum/null | System | No | Candidate only | Internal | Open/Activated/Merged/Split/Dismissed |
| approvalStatus | enum | System | No | Yes | Public Metadata | 不与 Lifecycle 合并 |
| evidenceIds | string[] | Human | Draft only | Policy based | Restricted | 只存引用和元数据 |
| templateIds | string[] | Derived/Governed | Via Mapping | Yes | Internal | 至少一个；不直接自由编辑数组 |
| platformIds | string[] | Derived | No | No | Public Metadata | 从 Templates 聚合 |
| channelIds | string[] | Derived | No | No | Public Metadata | 从 Templates 聚合 |
| monthlyVolume | number | Derived | No | No | Internal | 按 Metrics 口径 |
| deliveryOutcomes | object | Derived | No | No | Internal | sent/delivered/bounced/failed |
| firstSeenAt | datetime | Derived | No | No | Internal | 来源 Templates/Events |
| lastSeenAt | datetime | Derived | No | No | Internal | 来源 Templates/Events |
| currentAnalysisRunId | string | System | No | No | Internal | 最新有效 Run 引用 |
| createdAt/updatedAt | datetime | System | No | Yes | Internal | 审计时间 |

### Use Case 继承规则

- Classification 属于 Use Case；Template 默认继承，不单独编辑 Classification。
- Platform 和 Channel 来自关联 Templates，为 Derived 字段。
- Markets 是 Governed 多选字段，系统用 Templates/Traffic 建议，但人工可在 Draft 中修正。

## Template

| Field | Type | Source | Editable | Required | Sensitivity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| id | string(UUID) | System | No | Yes | Public Metadata | React Key 和关系主键 |
| externalTemplateId | string | Production | No | Yes | Internal | 组合键组成部分 |
| platformId | enum/ref | Production | No | Yes | Public Metadata | MDP/SFMC/ICCM/IRIS |
| tenantWorkspaceId | string | Production | No | Yes | Internal | 组合键组成部分 |
| compositeKey | string | Derived | No | Yes | Internal | platform + tenant + external ID |
| parentUseCaseId | string/null | Governed | Via Mapping Request | No | Internal | Unassigned 时为 null |
| mappingStatus | enum | System | No | Yes | Public Metadata | Assigned/Unassigned/Suggested/Pending |
| mappingConfidence | number | AI | No | No | Internal | 0–100 |
| mappingExplanation | object | AI/System | No | No | Internal | Rules/Cluster/Reasons |
| channelId | enum/ref | Production | No | Yes | Public Metadata | SMS/Email/Push/In-app |
| marketId | string/state | Production/AI | Draft correction | No | Public Metadata | 单值；支持 unknown/not_available |
| senderIdentity | string | Production | No | No | Restricted | 默认 Masked |
| templateFormat | string | Production | No | No | Internal | HTML/Text/etc. |
| currentVersionId | string | System | No | No | Internal | Approved Current Version |
| lifecycleStatus | enum | System/Governed | Via Change Request | Yes | Public Metadata | Active/No Traffic/Retired |
| approvalStatus | enum | System | No | Yes | Public Metadata | Mapping/Lifecycle 请求状态摘要 |
| monthlyVolume | number | Derived | No | No | Internal | 当前筛选时间范围 |
| firstSeenAt/lastSeenAt | datetime | Production/Derived | No | No | Internal | 数据新鲜度关键字段 |
| sourceLineageId | string | Production | No | Yes | Restricted | 指向 Lineage Record |

## Template Version

| Field | Type | Source | Editable | Required | Sensitivity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| id | string | System | No | Yes | Internal | 稳定 Version ID |
| templateId | UUID | System | No | Yes | Internal | Parent Template |
| versionNumber | integer/string | System/Production | No | Yes | Public Metadata | 平台无版本号时系统生成 |
| status | enum | System/Governed | No | Yes | Public Metadata | Candidate/Current/Superseded |
| approvalStatus | enum | System | No | Yes | Public Metadata | 独立于 Version Status |
| maskedContent | string | Production | No | No | Restricted | 永不默认展示 Raw Content |
| contentFingerprint | string | System | No | Yes | Restricted | 不可逆摘要 |
| variables | object[] | AI/System | Review correction | No | Restricted | name/type/example(masked) |
| materialConfig | object | Production | No | No | Restricted | Sender/Format/Locale/URL Domain 等快照 |
| previousVersionId | string/null | System | No | No | Internal | Diff 基准 |
| changeSummary | string | AI/Human | Draft review | Yes for confirmation | Internal | 人可修正摘要 |
| firstSeenAt/lastSeenAt | datetime | Production | No | Yes | Internal | 观察时间 |
| effectiveFrom | datetime/null | System/Governed | No | Current only | Internal | 批准后设置 |
| analysisRunIds | string[] | System | No | No | Internal | 不可变 Run 引用 |

### Material Change

默认创建 Candidate Version：Content Fingerprint、Variables Schema、Sender Identity、Template Format、Locale 或治理相关 URL/Domain 配置发生重要变化。

仅 Volume、Delivery Outcome、Last Seen 或格式化空白变化不创建 Version。

## Analysis Run

| Field | Type | Source | Editable | Sensitivity |
| --- | --- | --- | --- | --- |
| id | string | System | No | Internal |
| targetType/targetId | enum/string | System | No | Internal |
| trigger | enum | System/Human | No | Internal |
| status | enum | System | No | Public Metadata |
| steps | AnalysisStep[] | System/AI | No | Restricted |
| candidateMatches | object[] | AI | No | Internal |
| classificationSuggestion | object | AI | No | Internal |
| overallConfidence | number | AI/System | No | Internal |
| fieldConfidence | record | AI/System | No | Internal |
| rulesHit/clusterId | string[]/string | System | No | Restricted |
| modelVersion/promptVersion/rulesetVersion | string | System | No | Restricted |
| durationMs | number | System | No | Internal |
| warnings/errors/retries | object[] | System | No | Restricted |
| startedAt/completedAt | datetime | System | No | Internal |
| humanDecisionId | string/null | System | No | Internal |

## Review Task

| Field | Type | Source | Editable |
| --- | --- | --- | --- |
| id | string | System | No |
| type | enum | System | No |
| targetType/targetId | enum/string | System | No |
| title/summary | string | System/AI | No |
| priority | enum | System/Human | Yes with reason |
| status | enum | System | Through actions |
| assigneeId | string/null | Human/System | Yes |
| marketId/platformId/channelId | string/state | Derived | No |
| confidence | number/null | AI | No |
| createdAt/dueAt/updatedAt/resolvedAt | datetime | System | No |
| analysisRunId | string/null | System | No |
| resolution | object/null | Human/System | On resolve |

## Change Request

| Field | Type | Source | Editable |
| --- | --- | --- | --- |
| id | string | System | No |
| targetType/targetId | enum/string | System | No |
| baseRevision | number | System | No |
| changeType | enum | System/Human | No after submit |
| proposedPatch | object | Human/System | Draft only |
| beforeSnapshot/afterPreview | object | System | No |
| reason | string | Human | Draft only; required |
| evidenceIds | string[] | Human | Draft only |
| status | enum | System | Through workflow |
| submitterId/checkerId | string/null | System | No |
| submittedAt/decidedAt | datetime/null | System | No |
| comments | Comment[] | Human | Append only |
| approvalPackageId | string/null | System | No |

## Evidence Reference

| Field | Type | Source | Editable | Sensitivity |
| --- | --- | --- | --- | --- |
| id | string | System | No | Internal |
| type | enum | Human/System | Draft only | Internal |
| title | string | Human | Draft only | Internal |
| referenceUrl/referenceId | string | Human | Draft only | Restricted |
| issuer/owner | string | Human | Draft only | Internal |
| validFrom/validUntil | date/null | Human | Draft only | Internal |
| status | enum | System/Human | Governed | Internal |
| addedBy/addedAt | string/datetime | System | No | Internal |

MVP 不在前端保存 Evidence 文件内容；仅保存授权引用和元数据。
