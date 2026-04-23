---
description: "基础后台管理搭建任务列表"
---

# 任务: 基础后台管理搭建

**输入**: 来自 `/specs/001-admin-base-setup/` 的设计文档
**前置条件**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**测试**: 手动验收测试，参考 quickstart.md 中的 10 步验证清单。

**组织结构**: 任务按用户故事分组，每个故事均可独立实施和验证。

## 格式: `[ID] [P?] [Story?] 描述`
- **[P]**: 可并行运行（不同文件，无依赖关系）
- **[Story]**: US1=登录退出, US2=中文导航路由, US3=用户管理, US4=全局汉化
- 描述中包含确切文件路径

---

## 阶段 1: 项目初始化

**目的**: 从 vue-element-admin 克隆基础框架，完成项目骨架搭建

- [ ] T001 克隆 vue-element-admin 到项目目录，运行 `npm install` 验证依赖安装成功
- [ ] T002 删除无关 demo 页面目录：`src/views/charts/`, `src/views/clipboard/`, `src/views/components-demo/`, `src/views/excel/`, `src/views/guide/`, `src/views/i18n/`, `src/views/icons/`, `src/views/pdf/`, `src/views/tab/`, `src/views/zip/`
- [ ] T003 [P] 创建业务页面占位目录和空组件：`src/views/pp-coach/index.vue`, `src/views/system/config/index.vue`
- [ ] T004 [P] 创建 `.env.development`（`VUE_APP_BASE_API=/dev-api`）和 `.env.production`（`VUE_APP_BASE_API=` 待填写）
- [ ] T005 [P] 创建 `.env.example` 文件，列出所有必要环境变量（不含真实值）
- [ ] T006 运行 `npm run dev` 验证基础框架可正常启动，访问 `http://localhost:9527` 无报错

---

## 阶段 2: 基础设施（阻塞性前置条件）

**目的**: 建立认证、路由、状态管理等所有用户故事依赖的核心基础

⚠️ **关键**: 此阶段完成前，所有用户故事均无法实施

- [ ] T007 修改 `src/utils/auth.js`：Token 存储改用 `js-cookie`，key 为 `Admin-Token`，有效期设为 2 小时（`expires: 1/12`），导出 `getToken`/`setToken`/`removeToken`
- [ ] T008 修改 `src/utils/request.js`：axios 实例读取 `process.env.VUE_APP_BASE_API` 作为 `baseURL`；在 request interceptor 中注入 Token Header；在 response interceptor 中拦截 code=50008（Token 过期）→ 清除 Cookie + 跳转 `/login` + 提示「登录已过期，请重新登录」
- [ ] T009 修改 `src/router/index.js`：清理 demo 路由，定义 `constantRoutes`（`/login`, `/401`, `/404`）和 `asyncRoutes`（`/dashboard`, `/user`, `/pp-coach`, `/system`），在 `asyncRoutes` 的 `meta.roles` 中配置角色权限（`/user` 和 `/system` 仅 `super_admin`）
- [ ] T010 修改 `src/store/modules/permission.js`：实现 `generateRoutes(roles)` 方法，根据角色过滤 `asyncRoutes` 生成可访问路由表
- [ ] T011 修改 `src/store/modules/user.js`：实现 `login`/`getInfo`/`logout` actions，登录成功后存储 Token 和 `roles`
- [ ] T012 修改 `src/permission.js`：实现全局路由守卫 `beforeEach`，逻辑为：无 Token → 跳转 `/login`；有 Token 且无用户信息 → 调用 `getInfo` 获取角色 → 调用 `generateRoutes` → `router.addRoutes` 动态挂载

**检查点**: 此阶段完成后可验证路由守卫基础功能（无需登录访问 `/dashboard` 应跳转 `/login`）

---

## 阶段 3: 用户故事 1 — 管理员登录与退出 (优先级: P1) 🎯 MVP

**目标**: 管理员可通过账号密码登录后台，看到中文控制台主页，可安全退出

**独立测试**: 访问登录页 → 输入账密 → 验证跳转控制台 → 点击退出 → 验证跳回登录页，全程无英文

### 用户故事 1 实施

- [ ] T013 [US1] 修改 `src/api/user.js`：实现 `login(data)`, `logout()`, `getInfo(token)` 三个接口函数，读取 `VUE_APP_BASE_API` 拼接路径
- [ ] T014 [US1] 修改 `src/views/login/index.vue`：确保登录表单标签（「用户名」「密码」「登录」）、placeholder、验证提示均为中文；表单验证：用户名必填，密码必填
- [ ] T015 [US1] 修改 `src/layout/components/Navbar.vue`：顶部导航栏展示当前登录用户名；「退出」按钮文案为中文，点击触发 `logout` action 并跳转 `/login`
- [ ] T016 [US1] 修改 `mock/user.js`：添加 `login`（返回 token）、`logout`（返回成功）、`getInfo`（返回 `roles: ['super_admin']` 和 `name: '超级管理员'`）三个 mock 接口
- [ ] T017 [US1] 修改 `src/views/error-page/401.vue` 和 `404.vue`：错误提示文案改为中文（「抱歉，您无权访问此页面」「抱歉，您访问的页面不存在」），提供中文「返回首页」按钮

**检查点**: 此时用户故事 1 应完全可独立验证 — 登录成功跳转控制台，退出跳回登录页，错误密码显示中文提示

---

## 阶段 4: 用户故事 4 — 全局界面汉化 (优先级: P1)

**目标**: 所有 UI 组件（按钮、表单、分页、日期选择器、弹窗等）均显示中文，无英文残留

**独立测试**: 浏览器逐页检查，所有可见文本（包括 Element UI 内置组件文案）均为中文

> **注意**: US4 优先于 US2/US3 实施，因为汉化是基础设施，影响所有后续页面

### 用户故事 4 实施

- [ ] T018 [US4] 修改 `src/main.js`：引入 `element-ui/lib/locale/lang/zh-CN`，修改为 `Vue.use(ElementUI, { locale: zhCN })`，确保 Element UI 所有组件全局使用中文
- [ ] T019 [US4] 修改 `src/lang/index.js`：将默认语言设为 `'zh'`（`const language = Cookies.get('language') || 'zh'`），移除语言切换相关逻辑
- [ ] T020 [US4] 创建/更新 `src/lang/zh.js`：补充业务文案翻译，包括菜单标题（控制台、用户管理、乒乓球教练管理、系统配置）、通用操作词（新增、编辑、删除、查询、重置、确定、取消）
- [ ] T021 [P] [US4] 修改 `src/layout/components/Sidebar/index.vue` 和相关组件：确保侧边栏折叠按钮、菜单项均使用 `$t()` 读取中文文案
- [ ] T022 [P] [US4] 修改 `src/components/Breadcrumb/index.vue`：面包屑文案从路由 `meta.title` 读取中文标题（确保所有路由 `meta.title` 已设置中文）

**检查点**: 此时用户故事 4 应完全可独立验证 — 打开日期选择器/分页/弹窗均显示中文，无任何英文残留

---

## 阶段 5: 用户故事 2 — 中文侧边栏导航与页面路由 (优先级: P1)

**目标**: 侧边栏显示 4 个中文一级菜单，点击切换页面，刷新不丢失路由

**独立测试**: 依次点击 4 个中文菜单项，验证内容区切换正确，面包屑同步更新，刷新后路由保持

### 用户故事 2 实施

- [ ] T023 [US2] 修改 `src/router/index.js`：为所有路由配置中文 `meta.title`（「控制台」「用户管理」「乒乓球教练管理」「系统配置」），设置对应 `meta.icon`
- [ ] T024 [US2] 修改 `src/views/dashboard/index.vue`：控制台首页展示基础占位统计（用户总数、模块数等静态数字卡片，中文标题），布局使用 Element UI 的 `el-card` 组件
- [ ] T025 [P] [US2] 修改 `src/views/pp-coach/index.vue`：乒乓球教练管理占位页面，显示中文「功能开发中，敬请期待」提示
- [ ] T026 [P] [US2] 修改 `src/views/system/config/index.vue`：系统配置占位页面，显示中文「功能开发中，敬请期待」提示
- [ ] T027 [US2] 验证侧边栏折叠功能：点击 Hamburger 按钮，侧边栏正确折叠/展开，折叠后显示图标，展开后显示中文标题 + 图标

**检查点**: 此时用户故事 2 应完全可独立验证 — 4 个中文菜单均可点击切换，面包屑正确，刷新不丢失

---

## 阶段 6: 用户故事 3 — 用户管理基础功能 (优先级: P2)

**目标**: 超级管理员可在「用户管理」模块查看用户列表，新增、编辑、禁用用户账号

**独立测试**: 新增测试用户 → 列表可见 → 编辑信息 → 禁用账号 → 验证禁用后无法登录

### 用户故事 3 实施

- [ ] T028 [US3] 修改 `src/api/user.js`：添加用户管理接口函数 `getUserList(params)`、`createUser(data)`、`updateUser(id, data)`、`updateUserStatus(id, data)`，路径对应 `contracts/user-api.md`
- [ ] T029 [US3] 修改 `mock/user.js`：添加用户列表、新增用户、编辑用户、禁用/启用用户 mock 接口，初始数据包含 2 条记录（一个超级管理员、一个普通管理员）
- [ ] T030 [US3] 创建 `src/views/user/list/index.vue`：实现用户列表页面，包含：分页表格（列：用户名、角色中文名、手机号、状态、创建时间、操作）、顶部搜索栏（用户名模糊搜索、状态过滤）、「新增用户」按钮（仅超级管理员可见）
- [ ] T031 [US3] 在 `src/views/user/list/index.vue` 中实现新增用户对话框：表单包含用户名（必填、唯一性提示）、密码（必填）、角色（下拉选择「超级管理员」/「普通管理员」）、手机号（可选）、备注（可选）；提交后刷新列表
- [ ] T032 [US3] 在 `src/views/user/list/index.vue` 中实现编辑用户对话框：回填当前用户信息（密码留空表示不修改），提交后刷新列表
- [ ] T033 [US3] 在 `src/views/user/list/index.vue` 中实现禁用/启用功能：点击「禁用」弹出中文确认对话框（「确认禁用该账号吗？禁用后该账号将无法登录」），确认后调用接口，表格状态列同步更新；禁用自身账号时提示「不能禁用当前登录账号」
- [ ] T034 [P] [US3] 在用户列表所有中文文案进行审查：表格列头、操作按钮（「编辑」「禁用」「启用」）、表单标签、状态显示（「启用」「禁用」）、空数据提示均为中文

**检查点**: 此时用户故事 3 应完全可独立验证 — 完整的用户 CRUD 流程均可操作，数据正确回显

---

## 阶段 7: 收尾与横切关注点

**目的**: 整体质量收尾、ESLint 检查、验收清单执行

- [ ] T035 [P] 执行 `npm run lint` 修复所有 ESLint 错误，确保代码风格符合 vue-element-admin 内置配置
- [ ] T036 [P] 全站中文审查：按 quickstart.md 验证清单逐项执行 10 步验证，记录并修复发现的英文残留
- [ ] T037 [P] 权限场景验证：分别使用「超级管理员」和「普通管理员」账号登录，验证菜单可见性差异符合 data-model.md 中的角色-菜单映射表
- [ ] T038 执行 `npm run build:prod` 验证生产构建无报错，检查 dist 目录生成正常
- [ ] T039 [P] 更新 `mock/user.js`：确保 mock 数据覆盖普通管理员账号（`roles: ['admin']`），便于角色权限测试
- [ ] T040 [P] 检查 `.env.example` 完整性：对照 `.env.development` 确保所有变量均有占位说明

---

## 依赖关系与执行顺序

### 阶段依赖关系

- **阶段 1（设置）**: 无依赖，立即开始
- **阶段 2（基础）**: 依赖阶段 1 完成 — **阻塞所有用户故事**
- **阶段 3（US1 登录）**: 依赖阶段 2 完成
- **阶段 4（US4 汉化）**: 依赖阶段 2 完成，建议在 US2/US3 之前完成（影响所有页面文案）
- **阶段 5（US2 导航）**: 依赖阶段 2 + 4 完成
- **阶段 6（US3 用户管理）**: 依赖阶段 2 + 4 完成，可与阶段 5 并行
- **阶段 7（收尾）**: 依赖所有用户故事阶段完成

### 用户故事依赖关系

- **US1（P1）**: 可在基础阶段后立即开始
- **US4（P1）**: 可在基础阶段后立即开始，建议与 US1 并行或优先于 US2/US3
- **US2（P1）**: 依赖 US4 汉化完成（避免页面文案返工）
- **US3（P2）**: 可在基础阶段后开始，与 US1/US4 独立，建议 US4 完成后再做

### 故事内部执行顺序

- API 函数 → Mock 数据 → 页面组件 → 交互功能 → 文案检查

### 并行机会

- 阶段 2 内：T007、T008、T009 可并行（不同文件）
- 阶段 2 内：T010、T011 可并行（不同 store 文件）
- 阶段 4 内：T021、T022 可并行
- 阶段 5 内：T025、T026 可并行
- 阶段 7 内：T035、T036、T037、T039、T040 均可并行

---

## 并行示例: 阶段 2（基础）

```bash
# 同时启动以下独立任务:
任务: "修改 src/utils/auth.js — Cookie Token 封装"
任务: "修改 src/utils/request.js — axios 拦截器"
任务: "修改 src/router/index.js — 路由表定义"

# 上述完成后同时启动:
任务: "修改 src/store/modules/permission.js — generateRoutes"
任务: "修改 src/store/modules/user.js — login/getInfo/logout"
```

---

## 实施策略

### 仅 MVP（US1 + US4）

1. 完成阶段 1: 初始化
2. 完成阶段 2: 基础
3. 完成阶段 3: US1 登录与退出
4. 完成阶段 4: US4 全局汉化
5. **停止验证**: 登录、退出、全中文界面均可独立演示
6. 此时已交付可用的后台入口

### 增量交付

1. 阶段 1+2 → 基础就绪
2. 阶段 3+4 → 登录+汉化 → 验证 → 演示 MVP
3. 阶段 5 → 中文导航 → 验证 → 演示完整框架
4. 阶段 6 → 用户管理 → 验证 → 演示业务功能
5. 阶段 7 → 收尾 → 生产构建验证

---

## 注意事项

- [P] 任务 = 不同文件，无依赖关系，可安全并行
- US4（汉化）虽标注 P1，但建议优先于 US2/US3 实施，避免后续页面文案返工
- mock 数据必须同时包含 `super_admin` 和 `admin` 两种角色账号，便于权限测试
- 所有中文文案统一维护在 `src/lang/zh.js`，禁止硬编码在组件模板中（保持一致性）
- 用户密码在 mock 阶段可明文，生产阶段后端必须 bcrypt 哈希存储（见 data-model.md）
- 每完成一个阶段后执行对应检查点验证，确保独立可测试后再进入下一阶段
