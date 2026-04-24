# 快速入门: 任务监控页面重新设计

**功能**: 004-task-monitor-redesign
**日期**: 2026-04-23

## 前提条件

1. 确认 char_pp 后端已部署 `012-task-query-all` 功能（`GET /api/v1/tasks` 接口已上线）
2. `.env.development` 中 `CHAR_PP_PROXY_TARGET` 配置正确（`http://21.6.66.244:8002`）
3. 本地分支已切换至 `004-task-monitor-redesign`

## 开发启动

```bash
# 启动开发服务器（含 webpack 代理）
npm run dev
# 访问 http://localhost:9528
# 导航至"任务监控"菜单
```

## 验证接口可用性

```bash
# 直接请求 char_pp 测试列表接口（在服务器上运行）
curl "http://21.6.66.244:8002/api/v1/tasks?page=1&page_size=5"
# 期望返回 { items: [...], total: N, page: 1, page_size: 5, total_pages: M }

# 测试单任务详情（需要有效的 task_id UUID）
curl "http://21.6.66.244:8002/api/v1/tasks/{task_id}"
# 期望返回含 summary 字段的任务对象
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/api/tasks.js` | 新增：任务 API 函数（listTasks, getTaskDetail） |
| `src/views/tasks/index.vue` | 改写：任务监控主页面 |
| `src/api/coaches.js` | 已有：listCoaches（教练下拉数据源） |
| `src/utils/charPpRequest.js` | 已有：char_pp 专用 axios 实例 |

## 实现顺序建议

1. 新建 `src/api/tasks.js`（`listTasks`、`getTaskDetail`）
2. 改写 `src/views/tasks/index.vue`：
   a. 筛选栏 + 教练下拉（加载 coachOptions）
   b. 排序选择器 + 刷新按钮
   c. 任务列表表格（服务端分页）
   d. 详情抽屉（el-drawer + el-descriptions）
3. ESLint 检查并修复

## ESLint 检查

```bash
npm run lint
```

## 状态颜色快速参考

| 状态 | el-tag type | 中文 |
|------|-------------|------|
| pending | info | 待处理 |
| processing | warning | 处理中 |
| success | success | 已完成 |
| partial_success | primary | 部分完成 |
| failed | danger | 失败 |
| rejected | danger | 已拒绝 |
