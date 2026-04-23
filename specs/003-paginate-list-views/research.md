# Research: 各页面数据展示分页

**功能**: 003-paginate-list-views
**日期**: 2026-04-23

## 研究结论

### 决策 1: 前端分页 vs 后端分页

**Decision**: 采用**前端分页**（客户端分页）

**Rationale**:
- 后端接口（`/api/v1/videos/classifications`、`/api/v1/teaching-tips` 等）均不支持 `limit`/`skip` 等分页查询参数
- 接口一次性返回全量数据：视频分类 296 条，教学提示 2633 条
- 在不修改后端的前提下，唯一可行方案是前端拿到全量数据后在内存中切片展示
- Element UI 的 `el-pagination` 组件天然支持前端分页模式

**Alternatives considered**:
- 后端分页（服务端 limit/skip）: 需要修改 char_pp FastAPI 接口，超出本次前端任务范围，暂不采用
- 虚拟滚动: 技术复杂度高，Element UI 无内置支持，不符合章程"复用现有组件"原则

**影响**:
- 视频分类（296条）、教学提示（2633条）仍需一次性请求全量，网络层无优化；但 DOM 渲染从全量渲染变为按页渲染（每页20条），页面性能得到改善
- 前端内存中持有全量数据，筛选/换页无需重新请求

---

### 决策 2: 分页组件选型

**Decision**: 使用 **Element UI `el-pagination`** 组件

**Rationale**:
- 项目已引入 Element UI，无需额外安装依赖（符合章程原则 I）
- `el-pagination` 支持 `layout="total, sizes, prev, pager, next, jumper"` 完整布局
- 通过 `:current-page`、`:page-size`、`:total` 三个 props 驱动，与 Vue 2 Options API 完全兼容

---

### 决策 3: 各页面分页数据量

| 页面 | 实际数据量 | 默认每页 | 是否有意义分页 |
|------|-----------|---------|--------------|
| 视频分类 | 296 条 | 20 | 是，需分页 |
| 教学提示 | 2633 条 | 20 | 是，强烈需要 |
| 教练管理 | 少量（~5条） | 20 | 保留控件，数据量小时自动只显示1页 |
| 技术标准 | 少量（~3条） | 20 | 同上 |
| 知识库版本 | 少量 | 20 | 同上 |

---

### 决策 4: 分页状态管理

**Decision**: 各页面组件内独立维护 `currentPage` 和 `pageSize` 状态，不使用 Vuex

**Rationale**:
- 分页状态是纯 UI 状态，无需跨组件共享
- 每个页面 `data()` 中增加 `currentPage: 1` 和 `pageSize: 20` 两个字段
- `computed` 中增加 `pagedList` 切片计算属性：`this.list.slice((currentPage-1)*pageSize, currentPage*pageSize)`

---

### 决策 5: 筛选条件与分页联动

**Decision**: 筛选条件变更时，前端直接对已加载的 `list` 重新过滤，重置 `currentPage = 1`

**Rationale**:
- 由于是前端分页，筛选无需重新请求接口（数据已在内存中）
- 视频分类当前有服务端筛选（请求时带参数），需保持：筛选变更时重新请求 + 重置页码
- 教学提示同理（action_type 是服务端参数）
- 无服务端筛选参数的页面（标准、教练等）直接在前端过滤 + 重置页码

---

## 接口参数确认

| 接口 | 是否支持分页参数 | 筛选参数 |
|------|---------------|---------|
| GET /api/v1/videos/classifications | 否 | coach_name, tech_category, tech_detail, action_type, video_type |
| GET /api/v1/teaching-tips | 否 | action_type, tech_phase, source_type, task_id, coach_id |
| GET /api/v1/coaches | 否 | include_inactive |
| GET /api/v1/standards | 否 | source_quality |
| GET /api/v1/knowledge-base/versions | 否 | 无 |
