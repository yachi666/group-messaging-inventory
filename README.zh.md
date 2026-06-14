# Group Messaging Inventory

> 面向 Group Messaging Inventory MVP 的 React 仪表盘，用于发现、匹配、确认并导出可治理的 outbound messaging use case 清单。

[English README](./README.md) · [MIT License](./LICENSE)

## ✨ 项目概览

Group Messaging Inventory 用于回答一个核心治理问题：当前有哪些 outbound messages 正在生产环境发送，它们由谁负责，通过什么平台、渠道、sender identity 和 template 发送，以及是否能够提供可导出的 control evidence。

本仓库是一个基于 Vite + React + TypeScript 的 MVP 前端基础。产品体验覆盖 pilot market coverage、use case matching、triage、evidence readiness、analytics、audit trail 和 governance settings。

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
- CSS design tokens
- 面向未来 API response 结构设计的 mock data

## 📁 项目结构

```text
src/
  app/                  应用组合入口
  components/           可复用展示组件
  data/                 Mock inventory 和 governance 数据
  domain/               产品领域类型与契约
  features/dashboard/   Dashboard-first MVP 页面
  features/workspace/   Inventory、triage、evidence、analytics、audit、settings 视图
  i18n/                 英文/中文消息与语言提供器
  layout/               应用外壳与导航
  lib/                  小型框架无关工具函数
  styles/               设计 token 与全局 CSS
```

## 🚀 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

运行类型检查：

```bash
npm run typecheck
```

构建生产包：

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
npm run typecheck
npm run build
```

仓库还包含基于 Playwright 的 UI 验证脚本：

```bash
npm run test:ui
```

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
