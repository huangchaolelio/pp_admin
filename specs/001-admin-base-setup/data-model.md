# 数据模型: 基础后台管理搭建

**功能**: `001-admin-base-setup`
**日期**: 2026-04-23

## 实体定义

### AdminUser（管理员账号）

| 字段 | 类型 | 必填 | 唯一 | 说明 |
|------|------|------|------|------|
| id | Number | ✅ | ✅ | 自增主键 |
| username | String | ✅ | ✅ | 用户名，长度 4-20 字符，仅字母/数字/下划线 |
| password | String | ✅ | ❌ | bcrypt 哈希存储，禁止明文 |
| role | Enum | ✅ | ❌ | `super_admin`（超级管理员）/ `admin`（普通管理员） |
| phone | String | ❌ | ❌ | 手机号，11位数字，可为空 |
| remark | String | ❌ | ❌ | 备注，最长 200 字符 |
| status | Enum | ✅ | ❌ | `active`（启用）/ `disabled`（禁用） |
| created_at | DateTime | ✅ | ❌ | 创建时间，自动填充 |
| updated_at | DateTime | ✅ | ❌ | 最后更新时间，自动填充 |

**约束**:
- `username` 全局唯一，注册和编辑时校验重复
- `status = disabled` 时，该账号登录时返回「账号已被禁用」提示，Token 颁发被拒绝
- 禁用自身账号的操作 MUST 被拦截（超级管理员不能禁用自己）
- 密码修改时，旧密码必须验证通过

**状态机**:
```
active ──[禁用操作]──> disabled
disabled ──[启用操作]──> active
```

---

### Role（角色）

| 角色标识 | 显示名称 | 可见菜单 |
|----------|----------|----------|
| `super_admin` | 超级管理员 | 全部菜单（控制台、用户管理、乒乓球教练管理、系统配置） |
| `admin` | 普通管理员 | 控制台、乒乓球教练管理（占位） |

> v1 阶段角色固定为以上两种，不提供动态角色增删功能。

---

### MenuItem（菜单项）

> 菜单项在前端路由配置中静态定义（`src/router/index.js`），不存储于数据库。

| 属性 | 类型 | 说明 |
|------|------|------|
| path | String | 路由路径，如 `/dashboard` |
| title | String | 中文菜单标题，如「控制台」 |
| icon | String | SVG 图标名称 |
| roles | Array | 允许访问的角色列表，如 `['super_admin', 'admin']` |
| children | Array | 子菜单项列表（支持 2 级嵌套） |
| hidden | Boolean | 是否在侧边栏隐藏（如 404 页面路由） |

**v1 菜单结构**:
```
/ (Layout)
├── /dashboard          控制台      [super_admin, admin]
├── /user               用户管理    [super_admin]
│   └── /user/list      用户列表
├── /pp-coach           乒乓球教练管理  [super_admin, admin]  （占位，空页面）
└── /system             系统配置    [super_admin]
    └── /system/config  系统参数
```

---

### Token（访问凭证）

> Token 存储于浏览器 Cookie（`Admin-Token`），不存储于数据库，服务端通过 JWT 验证。

| 属性 | 说明 |
|------|------|
| 存储位置 | Cookie（`js-cookie`，key: `Admin-Token`） |
| 有效期 | 2 小时（`expires: 1/12` 天） |
| 续期策略 | 每次成功 API 请求后，后端可返回新 Token 刷新有效期（v1 前端侧自动续期通过 response interceptor 处理） |
| 过期行为 | 前端 response interceptor 捕获 401 → 清除 Cookie + 跳转 `/login` + 提示「登录已过期，请重新登录」 |

---

## 验证规则汇总

| 字段 | 规则 |
|------|------|
| username | 必填；4-20 字符；仅字母、数字、下划线；全局唯一 |
| password | 必填；6-20 字符；新增时必填，编辑时留空表示不修改 |
| role | 必填；枚举值为 `super_admin` 或 `admin` |
| phone | 选填；若填写则必须为 11 位数字 |
| remark | 选填；最长 200 字符 |

---

## 前端本地状态模型（Vuex Store）

```javascript
// store/modules/user.js
{
  token: '',          // 从 Cookie 读取
  name: '',           // 用户名（显示在顶部导航栏）
  roles: [],          // 角色数组，如 ['super_admin']
}

// store/modules/permission.js
{
  routes: [],         // 完整路由表（constantRoutes + 动态路由）
  addRoutes: [],      // 根据角色动态生成的路由
}

// store/modules/app.js
{
  sidebar: {
    opened: true      // 侧边栏展开/折叠状态
  },
  language: 'zh',    // 固定中文
}
```
