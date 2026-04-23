# 实施计划: 基础后台管理搭建

**分支**: `001-admin-base-setup` | **日期**: 2026-04-23 | **规范**: [spec.md](./spec.md)
**输入**: 来自 `/specs/001-admin-base-setup/spec.md` 的功能规范

## 摘要

基于开源项目 vue-element-admin（Vue 2 + Element UI）进行二次开发，裁剪无关示例页面，完成以下核心建设：

1. **全局中文汉化** — Element UI locale 设置 + 业务文案中文化
2. **认证与路由守卫** — Token 存储（Cookie, 2h）+ 全局 beforeEach 守卫 + 401/过期处理
3. **RBAC 动态菜单** — 基于 `meta.roles` 的前端权限过滤，超级管理员/普通管理员不同视图
4. **用户管理页面** — 列表分页、新增、编辑、禁用/启用操作
5. **4 个一级菜单模块** — 控制台、用户管理、乒乓球教练管理（占位）、系统配置

## 技术背景

**语言/版本**: JavaScript ES6+ / Vue 2.6.x
**主要依赖**: vue-element-admin v4.x, Element UI 2.x, vue-router, vuex, axios, js-cookie
**存储**: Cookie（Token），mock-server（开发阶段数据模拟）
**测试**: 手动验收测试（quickstart.md 清单）
**目标平台**: 桌面浏览器（Chrome/Firefox/Edge 现代版本）
**项目类型**: Web 应用（SPA 前端管理后台）
**性能目标**: 路由切换 < 1 秒；登录流程 < 1 分钟
**约束条件**: 全中文界面；禁止引入 vue-element-admin 外的新 UI 库；构建产物 gzip < 3MB
**规模/范围**: 内部运营人员，< 100 用户，4 个一级菜单模块

## 章程检查

*门控: 必须在阶段 0 研究前通过。阶段 1 设计后重新检查。*

| 章程原则 | 本功能合规情况 | 状态 |
|----------|---------------|------|
| I. 快速接入优先 | 完全基于 vue-element-admin 二次开发，不引入新 UI 库 | ✅ 通过 |
| II. 前后端分离 | 通过 RESTful API 与后端通信，统一三段式响应格式（见 contracts/） | ✅ 通过 |
| III. 配置化管理 | 环境变量通过 `.env.*` 管理；`.env.example` 随代码维护 | ✅ 通过 |
| IV. 安全访问控制 | RBAC 两种角色；JWT Token 鉴权；路由守卫拦截未授权访问 | ✅ 通过 |
| V. 数据可观测性 | v1 前端基础搭建阶段，Dashboard 占位统计数据已规划；操作日志为后续功能 | ⚠️ 部分（可观测性为后续迭代补全） |

**门控结论**: ✅ 通过，可进入实施阶段。原则 V 的操作日志部分已在 FR-010（Dashboard）提供基础，操作审计日志为后续功能，不阻塞本功能。

**设计后重新检查**（阶段 1 完成后）:
- contracts/ 已定义统一响应格式（code/data/message），符合原则 II ✅
- `.env.development` / `.env.production` 结构已在 quickstart.md 定义，符合原则 III ✅
- 用户密码字段在 data-model.md 中标注 bcrypt 哈希存储，符合原则 IV ✅

## 项目结构

### 文档（此功能）

```
specs/001-admin-base-setup/
├── plan.md              # 此文件
├── research.md          # 阶段 0 输出
├── data-model.md        # 阶段 1 输出
├── quickstart.md        # 阶段 1 输出
├── contracts/
│   ├── auth-api.md      # 认证接口契约
│   └── user-api.md      # 用户管理接口契约
└── tasks.md             # 阶段 2 输出（/speckit.tasks 命令生成）
```

### 源代码（仓库根目录）

本功能为前端 SPA，基于 vue-element-admin 裁剪，单一前端项目结构：

```
src/
├── api/
│   ├── user.js          # 登录/用户信息/用户管理 API
│   └── dashboard.js     # 控制台统计数据 API
├── assets/              # 静态资源（logo、图片）
├── components/          # 公共组件（Breadcrumb, Hamburger, SvgIcon）
├── icons/               # SVG 图标（精简保留常用图标）
├── layout/              # 整体布局（Sidebar, Navbar, AppMain, TagsView）
├── lang/
│   └── zh.js            # 中文业务文案（菜单标题、页面标题、提示语）
├── permission.js         # 全局路由守卫（Token 检查 + 角色验证）
├── router/
│   └── index.js         # constantRoutes + asyncRoutes（含 meta.roles 配置）
├── store/
│   └── modules/
│       ├── app.js       # 侧边栏状态
│       ├── permission.js # 动态路由生成（generateRoutes）
│       ├── settings.js  # 系统设置
│       └── user.js      # 用户信息、Token 管理
├── styles/              # 全局样式（保留 vue-element-admin 原有）
├── utils/
│   ├── auth.js          # Token Cookie 操作封装（getToken/setToken/removeToken）
│   ├── request.js       # axios 实例（baseURL、Token 注入、401 拦截）
│   └── validate.js      # 表单验证工具函数
└── views/
    ├── dashboard/
    │   └── index.vue    # 控制台首页（基础统计占位）
    ├── login/
    │   └── index.vue    # 登录页（全中文）
    ├── error-page/
    │   ├── 401.vue      # 无权限页（中文提示）
    │   └── 404.vue      # 页面不存在（中文提示）
    ├── user/
    │   └── list/
    │       └── index.vue # 用户管理列表页
    ├── pp-coach/
    │   └── index.vue    # 乒乓球教练管理（占位空页面）
    └── system/
        └── config/
            └── index.vue # 系统配置（占位空页面）

.env.development          # VUE_APP_BASE_API=/dev-api
.env.production           # VUE_APP_BASE_API=（待填写真实后端地址）
.env.example              # 所有必要变量列表（不含真实值）
mock/
├── index.js              # mock-server 入口
└── user.js               # 用户相关 mock 数据
```

**结构决策**: 单一前端项目（选项 1 变体），直接在仓库根目录下基于 vue-element-admin 裁剪，移除所有原始 demo 页面（charts、excel、pdf 等），仅保留框架骨架和本功能所需页面。

## 复杂度跟踪

> 无章程违规，本表留空。

本功能完全在章程约束内实施，无需证明复杂度。
