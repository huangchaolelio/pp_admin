# 数据模型: 任务监控页面重新设计

**功能**: 004-task-monitor-redesign
**日期**: 2026-04-23

## 无新增后端表/字段

本功能为纯前端展示功能，不新增数据库表或字段，全部数据来自 char_pp `012-task-query-all` 接口。

---

## Vue 组件状态模型

### 列表页状态（`data()` in tasks/index.vue）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `list` | Array | `[]` | 当前页任务列表（来自接口 `items`） |
| `total` | Number | `0` | 总记录数（来自接口 `total`） |
| `page` | Number | `1` | 当前页码 |
| `pageSize` | Number | `20` | 每页条数 |
| `loading` | Boolean | `false` | 列表加载状态 |
| `filter.status` | String | `''` | 状态筛选值（空=全部） |
| `filter.taskType` | String | `''` | 任务类型筛选值（空=全部） |
| `filter.coachId` | String | `''` | 教练 ID 筛选值（空=全部） |
| `filter.createdAfter` | String | `''` | 创建时间下界（ISO 8601） |
| `filter.createdBefore` | String | `''` | 创建时间上界（ISO 8601） |
| `filter.dateRange` | Array | `[]` | 日期区间选择器绑定值（`[start, end]`） |
| `sortBy` | String | `'created_at'` | 排序字段（`created_at` / `completed_at`） |
| `order` | String | `'desc'` | 排序方向（`asc` / `desc`） |
| `coachOptions` | Array | `[]` | 教练下拉选项（`[{ value: id, label: name }]`） |
| `drawer.visible` | Boolean | `false` | 详情抽屉是否展开 |
| `drawer.loading` | Boolean | `false` | 详情加载状态 |
| `drawer.task` | Object | `null` | 当前展示的任务完整详情 |

---

## 接口响应映射

### GET /api/v1/tasks → 列表响应

```
{
  items: TaskListItem[]   → this.list
  total: number          → this.total
  page: number           → (验证与 this.page 一致)
  page_size: number      → (验证与 this.pageSize 一致)
  total_pages: number    → (用于分页组件上限校验)
}
```

### TaskListItem 字段映射（列表行）

| 接口字段 | 组件绑定 | 展示方式 |
|----------|----------|----------|
| `task_id` | `row.task_id` | 文本 + 复制按钮 |
| `task_type` | `row.task_type` | el-tag（expert_video=教练视频, athlete_video=运动员视频） |
| `status` | `row.status` | el-tag（颜色见 research.md 决策 5） |
| `coach_name` | `row.coach_name` | 文本（null → "—"） |
| `video_filename` | `row.video_filename` | 文本（overflow tooltip） |
| `progress_pct` | `row.progress_pct` | el-progress（null → 0） |
| `created_at` | `row.created_at` | 格式化时间 |
| `completed_at` | `row.completed_at` | 格式化时间（null → "—"） |

### GET /api/v1/tasks/{task_id} → 详情响应

扩展现有字段，新增 `summary` 对象：

```
{
  // 基础字段（同列表 + 额外字段）
  task_id, task_type, status, video_filename, video_storage_uri,
  video_duration_seconds, video_size_bytes, video_fps, video_resolution,
  progress_pct, total_segments, processed_segments,
  error_message, rejection_reason, audio_fallback_reason,
  knowledge_base_version, coach_id, coach_name,
  timing_stats,           // JSONB 对象，键=阶段名，值=秒数
  created_at, started_at, completed_at,

  // 新增摘要统计
  summary: {
    tech_point_count: number       // 技术点数量
    has_transcript: boolean        // 是否有音频转录
    semantic_segment_count: number // 语义分段数
    motion_analysis_count: number  // 动作分析分段数
    deviation_count: number        // 偏差报告数
    advice_count: number           // 建议条数
  }
}
```

---

## 枚举值映射

### TaskStatus

| 接口值 | 中文标签 | el-tag type |
|--------|----------|-------------|
| `pending` | 待处理 | `info` |
| `processing` | 处理中 | `warning` |
| `success` | 已完成 | `success` |
| `partial_success` | 部分完成 | `primary` |
| `failed` | 失败 | `danger` |
| `rejected` | 已拒绝 | `danger`（加 `.rejected-tag` class 区分） |

### TaskType

| 接口值 | 中文标签 | el-tag type |
|--------|----------|-------------|
| `expert_video` | 教练视频 | `primary` |
| `athlete_video` | 运动员视频 | `success` |

---

## 请求参数构造规则

`fetchList()` 方法构造传给 `listTasks` 的参数对象：

```js
{
  page: this.page,
  page_size: this.pageSize,
  sort_by: this.sortBy,
  order: this.order,
  ...(this.filter.status && { status: this.filter.status }),
  ...(this.filter.taskType && { task_type: this.filter.taskType }),
  ...(this.filter.coachId && { coach_id: this.filter.coachId }),
  ...(this.filter.createdAfter && { created_after: this.filter.createdAfter }),
  ...(this.filter.createdBefore && { created_before: this.filter.createdBefore })
}
```

- 空字符串/空数组的筛选项**不传**给接口（避免后端收到空参数）。
- `dateRange` 数组拆分为 `created_after`（索引 0）和 `created_before`（索引 1）。

---

## 分页约束

与 012 API 契约保持一致：
- 每页条数选项：`[10, 20, 50]`，默认 20
- 最大每页 200（后端自动截断，前端不限制 UI 上限）
- 筛选/排序变更时 `page` 重置为 1
