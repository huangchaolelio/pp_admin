# Data Model: 各页面数据展示分页

**功能**: 003-paginate-list-views
**日期**: 2026-04-23

## 分页状态实体

每个列表页面组件内维护以下分页状态字段（纯前端 UI 状态，不持久化）：

### PaginationState（每个列表页面共用的 data 字段模式）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `currentPage` | Number | 1 | 当前页码（从 1 开始） |
| `pageSize` | Number | 20 | 每页显示条数 |
| `list` | Array | [] | 从接口加载的全量数据（前端分页的数据源） |

### 计算属性（computed）

| 字段 | 类型 | 说明 |
|------|------|------|
| `pagedList` | Array | `list.slice((currentPage-1)*pageSize, currentPage*pageSize)`，传给 `el-table :data` |
| `total` | Number | `list.length`，传给 `el-pagination :total` |

> 视频分类页面额外有 `filteredList`（服务端筛选后结果），`pagedList` 基于 `filteredList` 切片。

## 受影响的页面组件

| 页面 | 文件路径 | 当前数据量 |
|------|---------|-----------|
| 视频分类 | `src/views/video-classifications/index.vue` | ~296 条 |
| 教学提示 | `src/views/knowledge-base/teaching-tips.vue` | ~2633 条 |
| 教练管理 | `src/views/coaches/index.vue` | 少量 |
| 技术标准 | `src/views/standards/index.vue` | 少量 |
| 知识库版本 | `src/views/knowledge-base/index.vue` | 少量 |
