# 快速启动指南: 基础后台管理搭建

**功能**: `001-admin-base-setup`
**日期**: 2026-04-23

## 前提条件

- Node.js 12.x 或 14.x（vue-element-admin v4 要求）
- npm 或 yarn
- Git

## 1. 克隆基础框架

```bash
# 克隆 vue-element-admin
git clone https://github.com/PanJiaChen/vue-element-admin.git pp_admin_src
cd pp_admin_src

# 安装依赖
npm install
# 或
yarn install
```

## 2. 启动开发服务器（验证基础框架可用）

```bash
npm run dev
# 访问 http://localhost:9527
# 默认账号: admin / 任意密码（mock 模式）
```

## 3. 中文汉化配置

编辑 `src/main.js`，确保引入中文 locale：
```javascript
import ElementUI from 'element-ui'
import locale from 'element-ui/lib/locale/lang/zh-CN'
Vue.use(ElementUI, { locale })
```

编辑 `src/lang/index.js`，将默认语言设为 `zh`：
```javascript
const language = Cookies.get('language') || 'zh'  // 改为 'zh'
```

## 4. 环境变量配置

**开发环境** `.env.development`:
```
NODE_ENV = development
VUE_APP_BASE_API = '/dev-api'
```

**生产环境** `.env.production`:
```
NODE_ENV = production
VUE_APP_BASE_API = 'https://your-api-domain.com/api'
```

## 5. 角色权限配置

在 `src/router/index.js` 的 `asyncRoutes` 中配置角色可见菜单：
```javascript
export const asyncRoutes = [
  {
    path: '/user',
    meta: { title: '用户管理', roles: ['super_admin'] },
    // ...
  },
  {
    path: '/system',
    meta: { title: '系统配置', roles: ['super_admin'] },
    // ...
  },
  {
    path: '/pp-coach',
    meta: { title: '乒乓球教练管理', roles: ['super_admin', 'admin'] },
    // ...
  }
]
```

## 6. 验证清单

完成搭建后，按以下步骤验证功能：

```
□ 1. 访问 http://localhost:9527，自动跳转到 /login（路由守卫生效）
□ 2. 登录页所有文案为中文（标题、按钮、提示语）
□ 3. 使用正确账密登录，跳转到控制台
□ 4. 侧边栏显示 4 个中文一级菜单
□ 5. 切换菜单，面包屑导航同步更新
□ 6. 浏览器刷新，页面不跳回首页
□ 7. 点击退出，跳回登录页，Cookie 中 Admin-Token 已清除
□ 8. 普通管理员登录，侧边栏不显示「用户管理」和「系统配置」
□ 9. 访问 /user/list（普通管理员），跳转到 401 中文提示页
□ 10. 日期选择器、分页控件等内置文案均为中文
```

## 7. Mock 数据位置

开发阶段 mock 数据位于：
```
mock/
├── user.js     # 登录、用户信息、用户列表接口 mock
└── index.js    # mock-server 入口
```

修改 `mock/user.js` 可自定义测试用的角色和用户数据。
