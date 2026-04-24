# 实施计划: 任务监控页面重新设计

**分支**: `004-task-monitor-redesign` | **日期**: 2026-04-23 | **规范**: [spec.md](./spec.md)
**输入**: 来自 `/specs/004-task-monitor-redesign/spec.md` 的功能规范

## 摘要

重写现有占位任务监控页面 (`src/views/tasks/index.vue`)，对接 char_pp `012-task-query-all` 实现的两个接口：
- `GET /api/v1/tasks` — 全量任务列表（服务端分页+筛选+排序）
- `GET /api/v1/tasks/{task_id}` — 单任务完整详情（含 `summary` 摘要统计）

新页面包含：任务列表表格（服务端分页）、多维筛选栏（状态/类型/时间/教练下拉）、排序选择、手动刷新、右侧详情抽屉（Drawer）。

## 技术背景

**语言/版本**: JavaScript ES6+ / Vue 2.6.x
**主要依赖**: Element UI 2.x（el-table, el-drawer, el-pagination, el-select, el-date-picker）、axios（charPpRequest 封装）
**存储**: N/A（纯前端页面，不涉及本地持久化）
**测试**: 手动功能测试（本项目无前端单元测试框架配置）
**目标平台**: Web 浏览器（管理后台）
**项目类型**: Vue 2 单页应用（vue-element-admin 二次开发）
**性能目标**: 1000 条任务时首页加载 ≤ 2 秒
**约束条件**: 必须复用 Element UI 组件；不引入新 UI 库；ESLint 通过；代理路径 `/char-pp-api`
**规模/范围**: 单一 Vue 组件改写 + 新增 API 模块；不涉及路由变更

## 章程检查

*门控: 必须在阶段 0 研究前通过。阶段 1 设计后重新检查。*

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. 快速接入优先 | 使用 el-drawer, el-table, el-pagination 等 Element UI 原生组件，不引入外部库 | ✅ 通过 |
| II. 前后端分离 | 通过 charPpRequest（axios）调用 char_pp RESTful API，不在前端嵌入业务逻辑 | ✅ 通过 |
| III. 配置化管理 | 无新增业务配置项，代理地址已在 .env 中管理 | ✅ 通过 |
| IV. 安全访问控制 | 任务监控路由已配置 roles: ['super_admin', 'admin']，无需变更 | ✅ 通过 |
| V. 数据可观测性 | 任务监控本身即可观测性工具，展示处理状态和耗时；本改动不新增写操作，无操作日志需求 | ✅ 通过 |

**结论**: 所有章程检查通过，可进入阶段 0。

## 项目结构

### 文档（此功能）

```
specs/004-task-monitor-redesign/
├── plan.md              # 此文件
├── research.md          # 阶段 0 输出
├── data-model.md        # 阶段 1 输出
├── quickstart.md        # 阶段 1 输出
├── contracts/           # 阶段 1 输出
│   └── task-monitor-ui.md
└── tasks.md             # /speckit.tasks 命令生成
```

### 源代码（仓库根目录）

```
src/
├── api/
│   └── tasks.js                  # 新增：任务相关 API 函数
├── views/
│   └── tasks/
│       └── index.vue             # 改写：任务监控主页面
```

**结构决策**: 单文件改写 + 新增 API 模块。路由 `/tasks/index` 已存在，无需修改 router/index.js。

## 复杂度跟踪

> 无章程违规，此表跳过。
