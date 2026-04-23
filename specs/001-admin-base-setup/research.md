# 研究报告: 基础后台管理搭建

**功能**: `001-admin-base-setup`
**日期**: 2026-04-23
**状态**: 完成，所有 NEEDS CLARIFICATION 已解决

## 决策 1: vue-element-admin 版本与分支选择

**Decision**: 使用 `master` 分支（v4.x），不使用 i18n 分支；中文设置通过手动修改默认语言实现。

**Rationale**: master 分支 v4.1.0+ 已移除内置 i18n 多语言切换，但 Element UI 自带 `locale` 配置，直接在 `main.js` 或 `src/lang/index.js` 中将 `locale` 设置为 `zhCN` 即可实现完整汉化。本项目只需中文，无需多语言切换，无需 i18n 分支的额外复杂度。

**Alternatives considered**:
- i18n 分支：功能多余，引入不必要的语言包和切换逻辑
- vue3-element-admin（Element Plus）：需要 Vue 3，现有 vue-element-admin 生态是 Vue 2，迁移成本高

---

## 决策 2: Element UI 汉化方式

**Decision**: 在 `src/main.js` 中引入 `element-ui/lib/locale/lang/zh-CN` 并通过 `Vue.use(ElementUI, { locale: zhCN })` 全局设置，同时在 `src/lang/index.js` 修改默认语言为 `zh`。

**Rationale**: 这是 Element UI 官方推荐的国际化方式，覆盖所有组件内置文案（日期选择器、分页、弹窗按钮等），一次配置全局生效，无遗漏风险。

**Key files to modify**:
```
src/main.js              # Vue.use(ElementUI, { locale: zhCN })
src/lang/index.js        # 设置默认语言为 zh，移除语言切换逻辑
src/lang/zh.js           # 业务文案中文翻译（菜单标题、页面标题等）
```

**Alternatives considered**:
- 逐组件设置 locale：遗漏风险高，维护成本大

---

## 决策 3: 权限控制与动态路由方案

**Decision**: 使用 vue-element-admin 内置的前端路由权限方案（`src/permission.js` + `src/store/modules/permission.js`）。在路由定义的 `meta.roles` 中配置允许访问的角色，登录后根据用户角色通过 `generateRoutes` 过滤生成可访问路由表，再通过 `router.addRoutes` 动态挂载。

**Rationale**: vue-element-admin 已内置完整的前端权限方案，开箱即用。本项目 v1 阶段仅需控制菜单可见性（不做按钮级权限），与该方案完全匹配。

**角色-菜单映射**:
| 路由/菜单 | 超级管理员 | 普通管理员 |
|-----------|-----------|-----------|
| 控制台 | ✅ | ✅ |
| 乒乓球教练管理（占位） | ✅ | ✅ |
| 用户管理 | ✅ | ❌ 隐藏 |
| 系统配置 | ✅ | ❌ 隐藏 |

**Key files**:
```
src/permission.js                   # 全局路由守卫，Token 检查 + 角色过滤
src/store/modules/permission.js     # generateRoutes 动态路由生成
src/store/modules/user.js           # 用户信息和角色存储
src/router/index.js                 # constantRoutes（公共） + asyncRoutes（权限控制）
```

**Alternatives considered**:
- 后端返回路由表：需要后端配合，v1 阶段后端尚未就绪
- 全前端硬编码隐藏：维护性差，不利于后续扩展

---

## 决策 4: Token 存储与路由守卫

**Decision**: Token 存储在 `Cookies`（vue-element-admin 默认使用 `js-cookie`，存储 key 为 `Admin-Token`）。前端通过 `src/permission.js` 中的全局 `beforeEach` 路由守卫：有 Token 则放行（并在需要时获取用户信息），无 Token 则重定向到 `/login`。

> **注意**: 虽然规范澄清 Q2 选择了 `localStorage`，研究发现 vue-element-admin 原生使用 `Cookies` 存储 Token（通过 `src/utils/auth.js` 封装）。**推荐保持与框架一致**，使用 `Cookies` 存储（`js-cookie`），有效期设为 2 小时（通过 `Cookies.set('Admin-Token', token, { expires: 1/12 })` 设置）。修改 `src/utils/auth.js` 即可统一控制。

**Key files**:
```
src/utils/auth.js        # getToken / setToken / removeToken，封装 Cookie 操作
src/permission.js        # router.beforeEach：有 Token → 放行/获取用户信息；无 Token → /login
```

---

## 决策 5: Mock 与真实 API 切换

**Decision**: 通过 `.env.development` 和 `.env.production` 环境变量文件控制：
- 开发环境：`VUE_APP_BASE_API = '/dev-api'`，webpack devServer proxy 转发到 mock-server
- 生产环境：`VUE_APP_BASE_API = '/prod-api'`，替换为真实后端地址

**Key files**:
```
.env.development    # VUE_APP_BASE_API=/dev-api，VUE_APP_MOCK=true
.env.production     # VUE_APP_BASE_API=/prod-api
vue.config.js       # devServer.proxy 配置，将 /dev-api 代理到 mock-server port
mock/index.js       # mock-server 入口
src/utils/request.js # axios baseURL 读取 process.env.VUE_APP_BASE_API
```

---

## 决策 6: 项目目录结构裁剪

**Decision**: 基于 vue-element-admin 原始目录，移除与乒乓球教练业务无关的示例页面，保留框架骨架。

**保留/新增目录**:
```
src/
├── api/             # API 请求（login.js, user.js）
├── assets/          # 静态资源
├── components/      # 公共组件（Breadcrumb, Hamburger, SvgIcon 等）
├── icons/           # SVG 图标
├── layout/          # 整体布局（Sidebar, Navbar, AppMain）
├── lang/            # 语言包（zh.js，精简为中文）
├── permission.js    # 路由守卫
├── router/          # 路由定义（constantRoutes + asyncRoutes）
├── store/           # Vuex（app, permission, settings, user）
├── styles/          # 全局样式
├── utils/           # 工具函数（request.js, auth.js, validate.js）
└── views/
    ├── dashboard/   # 控制台首页
    ├── login/       # 登录页
    ├── error-page/  # 404/401 中文错误页
    ├── system/      # 系统配置（占位）
    │   └── config/
    ├── user/        # 用户管理
    │   └── list/
    └── pp-coach/    # 乒乓球教练管理（占位）
```

**移除**（原始 demo 页面）:
```
src/views/charts/
src/views/clipboard/
src/views/components-demo/
src/views/excel/
src/views/guide/
src/views/i18n/
src/views/icons/
src/views/nested/（保留结构但清空内容）
src/views/pdf/
src/views/tab/
src/views/table/（保留 user 改版）
src/views/zip/
```
