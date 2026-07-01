# Group Messaging Inventory

> 面向 outbound group messaging 治理与 Templates Analysis Harness 的 Dashboard-first TypeScript monorepo。

[English README](./README.md) · [MIT License](./LICENSE)

## 概览

Group Messaging Inventory 帮助治理、消息和运营团队回答以下问题：

- 当前有哪些 outbound message template 和 use case 在生产环境中运行？
- 谁负责它们？
- 涉及哪些平台、租户、发送方和模板标识符？
- 哪些变更需要复核或 maker-checker 审批？
- 当 reviewer、监管者或发布门禁要求时，能否导出审计证据？

本仓库目前包含 Vite + React 产品界面、NestJS API、Temporal TypeScript worker、共享 TypeScript packages、数据库迁移脚本、确定性评估门禁，以及用于本地 Postgres 和 Temporal 的 Docker Compose profile。

## 当前范围

MVP 聚焦 Messaging-owned 平台：

- MDP
- SFMC
- ICCM
- IRIS

产品方向是 dashboard-first 而非 marketing-first。前端直接进入可操作的 inventory coverage、unknown traffic、drift exceptions、review queue、maker-checker 治理、模型配置和 evidence readiness。

## 能力

- 面向仪表盘、use case、template、review queue、治理、设置、分析和上传状态的产品 inventory projection。
- 通过仅入队本地路径或 Temporal-backed workflow 的模板分析运行。
- 通过 `@gmi/ai-adapters` 实现 AI provider 隔离，包含确定性 `noop`、OpenAI Agents SDK 和 OpenAI-compatible chat-completions adapter。
- 面向 auto-recorded、review-required、blocked 和 maker-checker 流程的 policy routing。
- 在调用 provider 前的 PII masking 检查。
- 通过本地 header 或可信 gateway header 实现治理授权。
- Postgres-backed 审计事件、review task、change request、analysis output、evaluation 和 release evidence。
- 面向 analysis run 和 change request 的 evidence-package 导出。
- 黄金数据集评估门禁和 release-readiness 检查。

## 技术栈

- CI 中使用 Node.js 24
- npm workspaces
- TypeScript
- React 19 与 Vite 8
- NestJS 11 API
- Temporal TypeScript SDK worker
- PostgreSQL 16、Kysely 与 `pg`
- Zod contracts
- OpenAI Agents SDK，通过可替换 adapter 接入
- 基于 Playwright 的 UI smoke 检查
- 用于本地基础设施和应用 profile 验证的 Docker Compose

## 仓库结构

```text
apps/
  web/          Vite + React 前端
  api/          NestJS API
  worker/       Temporal TypeScript worker

packages/
  domain/       共享产品类型与状态模型
  contracts/    Zod API 与 provider schemas
  db/           Kysely 表类型、迁移脚本与 Postgres smoke test
  policy/       治理、路由与 PII masking 规则
  runtime-config/
                共享 API/worker 运行时配置校验
  ai-adapters/  Noop、OpenAI 与 OpenAI-compatible provider adapter
  evals/        黄金数据集评估与 release-readiness 逻辑

docs/
  agents/       面向 Agent 的仓库操作说明
  api/          API surface 快照
  architecture/ 后端架构说明

design/         产品设计索引、领域模型、工作流与页面规格
scripts/        本地验证、seed、发布与 smoke-test 脚本
```

前端源码位于 `apps/web/src/`。产品与实现方向记录在 [design/README.md](./design/README.md)、[DESIGN.md](./DESIGN.md)、[requirements.md](./requirements.md) 和 [requirements.zh.md](./requirements.zh.md)。

## 前置条件

- Node.js 24，与 `.github/workflows/ci.yml` 保持一致。
- npm，使用仓内的 `package-lock.json`。
- Docker Desktop 或兼容的 Docker Compose 运行时，用于 Postgres、Temporal 和容器化 app-profile 检查。

安装依赖：

```bash
npm install
```

CI 使用 `npm ci`；当需要干净的 lockfile 精确安装时可使用该命令。

## 快速开始

仅运行前端：

```bash
npm run dev
```

仅运行 API：

```bash
npm run dev:api
```

前端对接本地 API（`http://127.0.0.1:4000`）：

```bash
npm run dev:web:api
```

启动本地基础设施与数据库迁移：

```bash
npm run infra:up
npm run db:migrate
npm run db:smoke
```

使用本地 app Docker profile 同时运行 API、worker 与前端：

```bash
docker compose --profile app up --build gmi-api gmi-worker gmi-web
```

默认本地地址：

- 前端开发服务器：由 Vite 显示，通常为 `http://127.0.0.1:5173`
- 容器化 Web 应用：`http://127.0.0.1:5080`
- API：`http://127.0.0.1:4000`
- API 健康检查：`http://127.0.0.1:4000/health`
- API 就绪检查：`http://127.0.0.1:4000/ready`
- API 指标：`http://127.0.0.1:4000/metrics`
- Postgres：`postgres://gmi:gmi@127.0.0.1:55432/gmi`
- Temporal：`127.0.0.1:7233`
- Temporal UI：`http://127.0.0.1:8233`

## 运行时配置

API 和 worker 通过 `@gmi/runtime-config` 校验运行时配置，并在配置无效时快速失败。

常用变量：

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `PORT` | API 端口 | `4000` |
| `DATABASE_URL` | 启用 Postgres-backed 仓库 | 未设置时使用内存/本地回退（如支持） |
| `API_AUTH_MODE` | `header`、`gateway` 或 `disabled` | `header` |
| `ANALYSIS_WORKFLOW_DRIVER` | `none` 或 `temporal` | `none` |
| `TEMPORAL_ADDRESS` | Temporal 服务地址 | `127.0.0.1:7233`（Temporal 模式需要显式配置时除外） |
| `TEMPORAL_NAMESPACE` | Temporal 命名空间 | `default` |
| `TEMPORAL_TASK_QUEUE` | Temporal 任务队列 | `template-analysis` |
| `AI_PROVIDER` | `noop`、`openai` 或 `openai-compatible` | `noop` |
| `READINESS_TIMEOUT_MS` | 依赖探测超时 | `1000` |

日常开发使用确定性本地 provider：

```bash
AI_PROVIDER=noop npm run dev:worker
```

使用 OpenAI Agents SDK：

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_TRACE_INCLUDE_SENSITIVE_DATA=false
npm run dev:worker
```

使用 OpenAI-compatible 网关，如 LiteLLM、vLLM、OpenRouter、DeepSeek 或内部网关：

```bash
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:4001/v1
OPENAI_COMPATIBLE_API_KEY=...
OPENAI_COMPATIBLE_MODEL=provider-model-name
OPENAI_COMPATIBLE_PROVIDER_NAME=internal-gateway
OPENAI_COMPATIBLE_TIMEOUT_MS=60000
OPENAI_COMPATIBLE_MAX_RETRIES=2
OPENAI_COMPATIBLE_RETRY_BACKOFF_MS=250
npm run dev:worker
```

Provider 特定的请求元数据可通过 `OPENAI_COMPATIBLE_EXTRA_BODY_JSON` 提供，该值必须是 JSON object。密钥应保留在环境变量中，不要提交真实的 API key。

## API 与授权

公开运维端点：

- `GET /health`
- `GET /ready`
- `GET /metrics`

主要产品与 Harness 端点包括：

- `POST /template-versions/{versionId}/analysis-runs`
- `GET /analysis-runs/{runId}`
- `GET /analysis-runs/{runId}/evidence-package`
- `POST /analysis-runs/{runId}/confirm`
- `GET /templates/analysis-results`
- `GET /review-tasks`
- `POST /review-tasks/{taskId}/transition`
- `GET /change-requests`
- `GET /audit-events`
- `GET /product-inventory`
- `GET /change-requests/{changeRequestId}/evidence-package`
- `POST /templates/{templateUuid}/mapping-change-requests`
- `POST /templates/{templateUuid}/lifecycle-change-requests`
- `POST /template-versions/{versionId}/current-version-change-requests`
- `POST /change-requests/{changeRequestId}/submit`
- `POST /change-requests/{changeRequestId}/decision`
- `GET /analysis-evaluations/latest`
- `POST /analysis-evaluations/release-evidence`

已实现的 API surface 记录在 [docs/api/template-analysis-api.json](./docs/api/template-analysis-api.json)，并由 `npm run test:api-surface` 校验。

对于本地受保护路由，使用 header 授权：

```bash
curl -H 'x-actor-id: analyst-local' \
  -H 'x-gmi-roles: analysis_runner,change_maker,change_checker,auditor' \
  -H 'x-gmi-scope-tenants: local' \
  http://127.0.0.1:4000/ready
```

支持的角色为 `analysis_runner`、`analysis_reader`、`change_maker`、`change_checker` 和 `auditor`。Gateway 模式读取由 `API_GATEWAY_ACTOR_HEADER`、`API_GATEWAY_ROLES_HEADER` 和 `API_GATEWAY_TENANT_SCOPE_HEADER` 配置的可信身份 header。

Web 客户端可通过以下方式对齐本地测试 header：

```bash
VITE_GOVERNANCE_ACTOR_ID=analyst-local
VITE_GOVERNANCE_ACTOR_DISPLAY_NAME='Analyst Local'
VITE_GOVERNANCE_ROLES=analysis_runner,change_maker,change_checker,auditor
```

## 开发命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动 Vite 前端。 |
| `npm run dev:web:api` | 以 `VITE_API_BASE_URL=http://127.0.0.1:4000` 启动前端。 |
| `npm run dev:api` | 启动 NestJS API。 |
| `npm run dev:api:pg` | 使用本地 Postgres 连接串启动 API。 |
| `npm run dev:worker` | 启动 Temporal worker。 |
| `npm run dev:worker:local` | 对接本地 Temporal 启动 worker。 |
| `npm run infra:up` | 启动本地 Postgres 与 Temporal 服务。 |
| `npm run infra:down` | 停止本地基础设施。 |
| `npm run db:migrate` | 执行本地 Postgres 数据库迁移。 |
| `npm run db:smoke` | 运行 Postgres 仓库 smoke test。 |
| `npm run typecheck` | 构建共享 packages 并在所有 workspace 中运行 TypeScript 检查。 |
| `npm run build` | 类型检查并构建 packages、API、worker 与前端。 |
| `npm run preview` | 提供前端生产构建预览。 |

## 验证

在提交 PR 前运行主要的无基础设施 PR 门禁：

```bash
npm run test:no-infra
```

该命令执行类型检查、secret scan、后端 smoke test、readiness 与 metrics 检查、运行时配置检查、API-surface 检查、AI-adapter 检查、PII masking 检查、golden replay evals、release evidence 检查、前端实时数据检查、CI workflow 检查、部署配置检查、构建检查、Web bundle 检查与本地 UI smoke 检查。

其他常用门禁：

| 命令 | 使用场景 |
| --- | --- |
| `npm run test:backend` | 无需 Postgres 或 Temporal 的本地后端 smoke test。 |
| `npm run test:evals` | 修改了 golden fixtures、contracts、provider output shape 或 policy routing。 |
| `npm run test:ai-adapter` | 修改了 provider adapter 行为。 |
| `npm run test:pii:local` | 修改了 masking 规则或 prompt/provider 边界。 |
| `npm run test:live-frontend-data` | 修改了前端数据加载或 inventory projection。 |
| `npm run test:ui` | 修改了前端可见行为，且开发服务器正在运行。 |
| `npm run test:harness:temporal` | 需要完整的 API -> Temporal -> worker -> Postgres evidence-loop smoke。 |
| `npm run test:harness:temporal:provider-failure` | 需要验证 provider 失败的 run 持久化和公开错误摘要。 |
| `npm run test:deploy:compose` | 修改了 Dockerfiles、compose 配置、迁移脚本、API 启动、worker 启动或 Web serving。 |
| `npm run test:release-preflight:local` | 准备发布候选版本，需要 Docker-backed preflight 套件。 |

GitHub CI workflow 在 PR 和推送到 `main` 或 `codex/**` 分支时运行 `npm run test:no-infra`。Release preflight workflow 可通过 GitHub Actions 手动触发。

## 评估与发布证据

运行确定性黄金数据集评估：

```bash
npm run test:evals
```

对接注入的 provider adapter 运行相同评估：

```bash
EVAL_MODE=provider \
AI_PROVIDER=openai-compatible \
OPENAI_COMPATIBLE_BASE_URL=http://127.0.0.1:4001/v1 \
OPENAI_COMPATIBLE_API_KEY=... \
OPENAI_COMPATIBLE_MODEL=provider-model-name \
npm run test:gate -w @gmi/evals
```

创建 release evidence artifact：

```bash
EVAL_CREATE_RELEASE_EVIDENCE=true \
EVAL_RELEASE_EVIDENCE_PATH=artifacts/release-evidence.json \
npm run test:gate -w @gmi/evals
```

将评估结果和 release evidence 持久化到本地 Postgres：

```bash
npm run infra:up
npm run test:evals:pg
EVAL_CREATE_RELEASE_EVIDENCE=true \
EVAL_WRITE_RELEASE_DATABASE=true \
DATABASE_URL=postgres://gmi:gmi@127.0.0.1:55432/gmi \
npm run test:gate -w @gmi/evals
```

对默认本地 API 端点执行 release readiness 检查：

```bash
npm run check:release-readiness
```

设置 `RELEASE_READINESS_URL`、`RELEASE_READINESS_PIPELINE_VERSION`、`RELEASE_READINESS_PROMPT_VERSION`、`RELEASE_READINESS_MODEL_PROVIDER`、`RELEASE_READINESS_MODEL_NAME`、`RELEASE_READINESS_RULESET_VERSION`、`RELEASE_READINESS_DATASET_VERSION` 和 `RELEASE_READINESS_MIN_CASE_COUNT` 可将 readiness check 绑定到指定的候选版本。

## Seed 数据

为手工 API/UI 验证写入更丰富的 Postgres-backed 数据集：

```bash
npm run infra:up
npm run db:migrate
npm run seed:verification:pg
```

通过真实 API 端点验证 seed 数据集：

```bash
npm run test:seed-verification-api:pg
```

无需 Postgres 验证 seed-case 数据结构：

```bash
npm run test:verification-seed-cases:local
```

Seed 覆盖 auto-recorded、review-required、blocked、enhanced-review、candidate-version-drift、approved、pending、changes-requested 和 rejected 治理路径。需要稳定 demo 数据集标签时，可通过 `SEED_DATASET_ID` 覆盖。

## 设计与产品文档

- [design/README.md](./design/README.md)：产品设计与实现入口。
- [DESIGN.md](./DESIGN.md)：视觉语言。
- [requirements.md](./requirements.md)：英文 PRD 与路线图。
- [requirements.zh.md](./requirements.zh.md)：中文 PRD 与路线图。
- [docs/architecture/template-analysis-harness-architecture.md](./docs/architecture/template-analysis-harness-architecture.md)：后端架构。
- [docs/agents/issue-tracker.md](./docs/agents/issue-tracker.md)：面向 Agent 的 GitHub Issues 工作流。
- [docs/agents/triage-labels.md](./docs/agents/triage-labels.md)：标准 issue 标签。
- [docs/agents/domain.md](./docs/agents/domain.md)：领域文档布局。

Agent 在实施产品变更时应从 `design/README.md` 开始，而非从当前 UI 推断行为。

## 贡献说明

- 依赖变更时需保持 `package-lock.json` 提交。
- 使用 TypeScript、React 函数组件、命名导出、2 空格缩进，`.ts` 和 `.tsx` 文件中使用单引号。
- 优先使用 `apps/web/src/styles/tokens.css` 中的 design token，而非硬编码视觉值。
- 保持变更范围聚焦；避免将纯格式化编辑与行为变更混在一起。
- 对于可见 UI 变更，请在 PR 中包含截图并运行 UI smoke check。
- 对于后端、policy、provider 或 evidence 变更，请在 PR 中包含相关验证命令。

## License

本项目基于 [MIT License](./LICENSE) 开源。
