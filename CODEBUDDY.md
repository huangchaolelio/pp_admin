# 乒乓球AI教练后台管理系统 开发指南

基于所有功能计划自动生成. 最后更新时间: 2026-04-23

## 活跃技术

- **前端框架**: Vue 2.6.x + vue-element-admin v4.x + Element UI 2.x
- **状态管理**: Vuex 3.x
- **路由**: vue-router 3.x
- **HTTP 客户端**: axios + js-cookie
- **构建工具**: webpack（vue-cli 3）
- **代码规范**: ESLint（vue-element-admin 内置配置）

## 参考文档

- **项目章程**: [.specify/memory/constitution.md](./.specify/memory/constitution.md)（MUST 阅读，尤其原则 VI）
- **后端业务流程（权威）**: [char_pp/docs/business-workflow.md](https://github.com/huangchaolelio/char_pp/blob/master/docs/business-workflow.md)
  - 所有系统设计、页面结构、作业/任务交互、流程优化都 MUST 与该文档保持一致
  - 涉及菜单重排、作业状态机、异步任务入口/跳转的改动，提交 PR 前先对照此文档

## 项目结构

```text
src/
├── api/              # API 请求层（user.js, dashboard.js）
├── layout/           # 整体布局（Sidebar, Navbar, AppMain）
├── permission.js     # 全局路由守卫
├── router/index.js   # 路由定义（constantRoutes + asyncRoutes）
├── store/modules/    # Vuex（app, permission, settings, user）
├── utils/            # 工具函数（auth.js, request.js, validate.js）
└── views/
    ├── dashboard/    # 控制台首页
    ├── login/        # 登录页
    ├── user/list/    # 用户管理
    ├── pp-coach/     # 乒乓球教练管理（占位）
    └── system/config/ # 系统配置（占位）

.env.development      # 开发环境变量（VUE_APP_BASE_API=/dev-api）
.env.production       # 生产环境变量
mock/user.js          # 用户相关 mock 数据
```

## 命令

```bash
# 安装依赖
npm install

# 启动开发服务器（含 mock）
npm run dev

# 构建生产包
npm run build:prod

# ESLint 检查
npm run lint
```

## 代码风格

- **语言**: JavaScript ES6+（不使用 TypeScript）
- **组件风格**: Vue 2 Options API（`data()`, `methods`, `computed`）
- **提交规范**: Conventional Commits（`feat:`, `fix:`, `refactor:`, `docs:`）
- **API 响应格式**: `{ code, data, message }` 三段式（code: 20000 为成功）
- **中文覆盖**: 所有 UI 文案必须中文，业务文案在 `src/lang/zh.js` 维护

## 最近变更

### 001-admin-base-setup（2026-04-23）

- 初始化项目：基于 vue-element-admin 裁剪，移除无关 demo 页面
- 全局汉化：Element UI locale 设置为 zh-CN
- RBAC 权限：超级管理员/普通管理员动态菜单渲染
- 用户管理：列表分页、新增、编辑、禁用功能
- 认证：Cookie Token（2h）+ 路由守卫 + 401 自动跳转

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
