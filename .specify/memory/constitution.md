<!--
## 同步影响报告

**版本更改**: 无 → 1.0.0
**递增理由**: 初始版本，全新采用，无先前版本

### 修改的原则
- 全部新增（无先前原则）

### 添加的部分
- I. 快速接入优先
- II. 前后端分离
- III. 配置化管理
- IV. 安全访问控制
- V. 数据可观测性

### 删除的部分
- 无（初始版本）

### 需要更新的模板
- ✅ `.specify/memory/constitution.md` — 当前文件已更新
- ✅ `.specify/templates/plan-template.md` — 原则引用已对齐（无需修改，模板为通用格式）
- ✅ `.specify/templates/spec-template.md` — 范围约束已对齐（无需修改，模板为通用格式）
- ✅ `.specify/templates/tasks-template.md` — 任务分类已对齐（无需修改，模板为通用格式）

### 延迟 TODO
- TODO(BACKEND_LANG): 后端技术栈尚未指定，需在首个功能开发前确认
- TODO(DATABASE): 数据库选型尚未指定，需在首个功能开发前确认
- TODO(DEPLOY): 部署策略尚未指定
-->

# 乒乓球AI教练后台管理系统 项目章程

## 核心原则

### I. 快速接入优先

本项目 MUST 基于开源管理框架 [vue-element-admin](https://github.com/PanJiaChen/vue-element-admin) 进行二次开发，禁止从零搭建管理界面。
所有新增功能页面 MUST 复用 vue-element-admin 已有的布局、组件和路由机制。
引入新的第三方 UI 库之前，MUST 确认 vue-element-admin 或 Element UI 中不存在等效组件。

**理由**: 本项目定位为后台服务支撑系统，核心价值在于业务逻辑，而非 UI 框架建设；快速接入成熟框架可大幅降低维护成本。

### II. 前后端分离

本后台管理系统 MUST 通过 RESTful API 与前端 [char_pp](https://github.com/huangchaolelio/char_pp.git) 主项目进行通信，禁止在后台直接嵌入业务逻辑渲染。
API 接口 MUST 遵循统一的响应格式（code、data、message 三段式结构）。
跨域（CORS）配置 MUST 在服务端显式声明，禁止使用通配符 `*` 作为生产环境的 origin 配置。

**理由**: char_pp 主项目与本后台系统是独立部署的两个服务，通过 API 解耦可保证各自独立迭代。

### III. 配置化管理

后台系统中所有涉及乒乓球教练功能的业务配置（训练计划模板、AI 参数、评分规则等）MUST 通过管理界面进行维护，禁止硬编码在代码中。
环境变量（数据库地址、API 密钥、第三方服务 Token）MUST 通过 `.env` 文件管理，禁止提交到版本控制系统。
`.env.example` MUST 随代码一同维护，列出所有必要的环境变量（不含真实值）。

**理由**: 乒乓球 AI 教练的业务规则会随运营需求频繁调整，配置化可避免频繁发版。

### IV. 安全访问控制

后台管理系统 MUST 实现基于角色的访问控制（RBAC），至少区分超级管理员与普通管理员两种角色。
所有后台 API 接口 MUST 经过 JWT Token 鉴权，未经授权的请求 MUST 返回 401 状态码。
用户密码 MUST 使用不可逆哈希算法（如 bcrypt）存储，禁止明文或对称加密存储。

**理由**: 后台系统管理用户数据、AI 模型配置及训练记录，属于高权限操作，必须严格鉴权。

### V. 数据可观测性

后台系统对 char_pp 主项目数据的所有增删改操作 MUST 记录操作日志（操作人、时间、操作内容摘要）。
关键业务指标（用户活跃数、训练次数、AI 调用量）MUST 在后台 Dashboard 中可视化展示。
系统错误日志 MUST 结构化输出（JSON 格式），便于后续接入日志收集系统。

**理由**: 乒乓球 AI 教练平台的运营效果需要数据支撑决策，可观测性是运营管理的前提。

## 技术栈约束

**前端框架**: Vue 2.x + vue-element-admin + Element UI
**后端语言**: TODO(BACKEND_LANG): 后端技术栈尚未在用户输入中指定，需在首个功能开发前确认
**数据库**: TODO(DATABASE): 数据库选型尚未指定，需在首个功能开发前确认
**主项目仓库**: https://github.com/huangchaolelio/char_pp.git
**后台框架基础**: https://github.com/PanJiaChen/vue-element-admin.git
**部署方式**: TODO(DEPLOY): 部署策略尚未指定（Docker / 云服务器 / PaaS）

所有前端代码 MUST 通过 ESLint 检查后方可提交（复用 vue-element-admin 的 lint 配置）。
引入新依赖包 MUST 评估包体积影响，避免将后台体积膨胀超过 3MB（gzip 后）。

## 开发工作流

**分支策略**: 功能开发使用 `feature/[功能名]` 分支，修复使用 `fix/[问题描述]` 分支，向 `main` 分支发起 PR。
**代码审查**: 所有合并到 `main` 的 PR MUST 至少经过一次代码审查。
**提交规范**: 提交信息 MUST 遵循 Conventional Commits 格式（`feat:`, `fix:`, `docs:`, `refactor:` 等前缀）。
**测试要求**: 涉及 API 接口的改动 SHOULD 包含接口测试用例；涉及权限控制的改动 MUST 包含权限验证测试。
**文档同步**: 新增或变更 API 接口时，MUST 同步更新接口文档（Swagger / README 中的 API 说明）。

## 治理

本章程优先于项目内所有其他开发规范文档。
章程修订 MUST 经过文档记录、团队确认，并在 `LAST_AMENDED_DATE` 字段更新修订日期。
版本控制遵循语义版本规范：MAJOR 用于原则删除或不兼容变更，MINOR 用于新增原则或部分，PATCH 用于措辞澄清。
合规审查 SHOULD 在每个功能迭代结束时执行，确认实现符合章程约束。
所有 PR 审查 MUST 验证变更不违反安全访问控制（原则 IV）和数据可观测性（原则 V）要求。

**版本**: 1.0.0 | **批准日期**: 2026-04-23 | **最后修订**: 2026-04-23
