# Group Messaging Inventory

> 面向 Group Messaging Inventory MVP 的 React 仪表盘，用于发现、匹配、确认并导出可治理的 outbound messaging use case 清单。

[English README](./README.md) · [MIT License](./LICENSE)

## ✨ 项目概览

Group Messaging Inventory 用于回答一个核心治理问题：当前有哪些 outbound messages 正在生产环境发送，它们由谁负责，通过什么平台、渠道、sender identity 和 template 发送，以及是否能够提供可导出的 control evidence。

本仓库是一个基于 npm workspaces 的 TypeScript monorepo。现有 Vite + React 前端承载产品体验，新增 API、worker 与共享 packages 用于逐步落地 Templates Analysis Harness 后台。

## 🎯 MVP 范围

MVP 聚焦 Messaging-owned platforms：

- MDP
- SFMC
- ICCM
- IRIS

产品方向是 dashboard-first，而不是 landing page-first。应用打开后直接进入可操作的 inventory coverage、unknown traffic、drift exceptions、owner confirmation 和 evidence readiness。

## 🧭 产品能力

- 基于 production logs 建立 outbound messages inventory baseline
- 基于规则和聚类生成 candidate use cases，并展示 confidence score
- 识别 retired-but-live、new sender identity、new template、unknown traffic 和 volume anomaly 等 drift
- 支持确认 Message Owner 与 Integrating System Owner 的 ownership workflow
- 支持 Regulatory、Servicing、Marketing 三类消息 classification
- 跟踪 evidence、maker-checker status 与可审计事件
- 为后续 CSV export 和 regulator response pack 提供产品方向
- 通过内置 language provider 支持英文和简体中文 UI 文案

## 🧱 技术栈

- React 19
- TypeScript
- Vite
- NestJS API scaffold
- Temporal TypeScript worker scaffold
- npm workspaces
- Zod contracts
- Kysely database types
- 通过可替换 adapter 接入 OpenAI Agents SDK
- CSS design tokens
- 面向未来 API response 结构设计的 mock data

## 📁 项目结构

```text
apps/
  web/                  Vite + React 前端
  api/                  NestJS API scaffold
  worker/               Temporal worker scaffold
packages/
  domain/               共享产品类型与状态模型
  contracts/            Zod API 与 provider schemas
  db/                   Kysely 数据库表类型
  policy/               治理与路由规则
  ai-adapters/          可替换 AI provider adapter，包括 OpenAI Agents SDK
```

前端源码位于 `apps/web/src/`。

## 🚀 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

启动后台进程：

```bash
npm run dev:api
npm run dev:worker
```

运行状态接口：

- `GET /health` 是 API liveness check。
- `GET /ready` 返回 API、Postgres、Temporal workflow driver 与 AI provider 配置的组件化 readiness。当启用 `DATABASE_URL` 或 `ANALYSIS_WORKFLOW_DRIVER=temporal` 时，readiness 会执行轻量依赖探测，而不只是检查环境变量是否存在。

默认 worker 使用 `AI_PROVIDER=noop`，本地开发不会调用模型 provider。需要通过 OpenAI Agents SDK 执行分析活动时，设置：

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TRACE_INCLUDE_SENSITIVE_DATA=false
npm run dev:worker
```

业务 Harness 仍然负责 workflow 状态、policy routing、持久化和 review gates。OpenAI SDK 只封装在 `@gmi/ai-adapters` 后面，用于模型编排、结构化输出、guardrails 和 tracing。

本地治理 API 授权先使用轻量 header 模式，后续可替换为 SSO 或 API Gateway 注入的身份上下文：

```bash
API_AUTH_MODE=header
curl -H 'x-actor-id: analyst-local' \
  -H 'x-gmi-roles: analysis_runner,change_maker,change_checker,auditor' \
  http://127.0.0.1:4000/ready
```

受保护的分析与治理路由需要以下角色之一：`analysis_runner`、`analysis_reader`、`change_maker`、`change_checker` 或 `auditor`。`/health` 与 `/ready` 保持公开。只有隔离本地调试时才建议设置 `API_AUTH_MODE=disabled`。

不可变治理账本通过以下接口暴露：

```bash
curl -H 'x-gmi-roles: auditor' \
  'http://127.0.0.1:4000/audit-events?changeRequestId=CR-...'
```

`/audit-events` 支持按 `objectType`、`objectId`、`sourceRunId`、`changeRequestId` 和 `limit` 筛选。

API 提交可以只入队，也可以直接启动 Temporal workflow。需要本地完整 Harness 链路时，先运行 Temporal，并设置：

```bash
ANALYSIS_WORKFLOW_DRIVER=temporal
TEMPORAL_ADDRESS=127.0.0.1:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=template-analysis
npm run dev:api
```

启动本地后台基础设施：

```bash
npm run infra:up
npm run db:migrate
npm run db:smoke
```

本地 Postgres 连接串：

```text
postgres://gmi:gmi@127.0.0.1:55432/gmi
```

Temporal 运行在 `127.0.0.1:7233`，Temporal UI 位于 `http://127.0.0.1:8233`。

使用本地 deploy profile 一起启动 API、worker 与 web 容器：

```bash
docker compose --profile app up --build gmi-api gmi-worker gmi-web
```

容器化 API 位于 `http://127.0.0.1:4000`，前端位于 `http://127.0.0.1:5080`。该 app profile 默认使用 `AI_PROVIDER=noop`、本地 header 授权、Postgres 与 Temporal，并通过一次性的 `gmi-db-migrate` 服务在 API 启动前自动执行数据库迁移。API 与 worker 会处理停机信号，在容器停止或部署替换时释放 Postgres 与 Temporal 连接。

运行类型检查：

```bash
npm run typecheck
```

构建共享包、后台应用与前端生产包：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## ✅ 验证

在提交 PR 或发布前，建议运行：

```bash
npm run test:no-infra
```

该命令会执行类型检查、secret scan、后台 smoke、PII masking、golden evals、release evidence、CI workflow、部署配置、构建、前端 bundle 和本地 UI 验证。

仓库还包含基于 Playwright 的 UI 验证脚本：

```bash
npm run test:ui
```

无需 Postgres 或 Temporal 的本地后台契约验证：

```bash
npm run test:backend
```

该 smoke test 覆盖 API validation、analysis run submission、repository domain errors、Change Request 创建、maker-checker submit/decision、禁止自审批、待审批队列 projection，以及 Change Request evidence package。

运行 golden dataset evaluation gate：

```bash
npm run test:evals
```

将通过的 evaluation report 写入 Postgres evidence：

```bash
npm run infra:up
npm run test:evals:pg
```

验证后台持久化链路：

```bash
npm run infra:up
npm run db:smoke
```

验证完整 API -> Temporal -> worker -> Postgres evidence loop：

```bash
npm run infra:up
npm run test:harness:temporal
```

在 Postgres-backed 模式下，analysis run 会按照存储状态保持为 `Queued`、`Running`、`Failed` 或 `Succeeded`。只有 worker 写入 `analysis_outputs` 之后，API response 才会包含 `output` 和 policy routing。

## 🎨 设计方向

视觉语言记录在 [DESIGN.md](./DESIGN.md)。界面采用友好且信息密度较高的治理仪表盘风格，包括浅色导航、紧凑表格、圆角指标卡、平静的状态标签和面向审计的语言。

## 🗺️ 路线图

产品路线图记录在 [requirements.md](./requirements.md) 和 [requirements.zh.md](./requirements.zh.md)。计划阶段包括：

- MVP pilot ingestion、extraction、deterministic matching、clustering、triage 和 export
- 扩展平台覆盖并增加 classification suggestions
- 在可用 upstream identifier 的前提下建立端到端 traceability
- 通过 telemetry feeds 扩展 enterprise coverage
- 强化 BAU 能力，包括 access、retention、resilience 和 automated governance reporting

## 📄 License

本项目基于 [MIT License](./LICENSE) 开源。
