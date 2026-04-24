# UI 契约: 任务监控页面

**功能**: 004-task-monitor-redesign
**日期**: 2026-04-23

---

## 页面布局结构

```
app-container
├── 筛选栏（el-card，内联表单）
│   ├── 状态下拉（el-select）
│   ├── 任务类型下拉（el-select）
│   ├── 教练下拉（el-select，动态加载）
│   ├── 创建时间区间（el-date-picker type="daterange"）
│   ├── 查询按钮（el-button type="primary"）
│   └── 重置按钮（el-button）
├── 工具栏（排序选择 + 刷新按钮）
│   ├── 排序字段选择器（el-select：按创建时间/按完成时间）
│   ├── 排序方向选择器（el-select：升序/降序）
│   └── 刷新按钮（el-button icon="el-icon-refresh"，带 loading 状态）
├── 任务列表（el-table，v-loading）
│   ├── 任务 ID 列（可复制）
│   ├── 任务类型列（el-tag）
│   ├── 状态列（el-tag）
│   ├── 教练列
│   ├── 视频文件名列（overflow tooltip）
│   ├── 进度列（el-progress）
│   ├── 创建时间列
│   ├── 完成时间列
│   └── 操作列（查看详情按钮）
├── 分页控件（el-pagination）
│   layout="total, sizes, prev, pager, next, jumper"
│   :page-sizes="[10, 20, 50]"
└── 详情抽屉（el-drawer direction="rtl" size="600px"）
    ├── 基础信息区（el-descriptions，2列）
    ├── 摘要统计区（el-descriptions，3列）
    ├── 耗时统计区（el-descriptions，条件渲染）
    └── 错误信息区（条件渲染，红色文本）
```

---

## 筛选栏契约

### 状态下拉选项

| 值 | 标签 |
|----|------|
| `''` | 全部状态 |
| `pending` | 待处理 |
| `processing` | 处理中 |
| `success` | 已完成 |
| `partial_success` | 部分完成 |
| `failed` | 失败 |
| `rejected` | 已拒绝 |

### 任务类型下拉选项

| 值 | 标签 |
|----|------|
| `''` | 全部类型 |
| `expert_video` | 教练视频 |
| `athlete_video` | 运动员视频 |

### 教练下拉
- 组件 `created` 时调用 `listCoaches()` 加载，加载期间显示 loading
- 选项格式：`{ value: coach.id, label: coach.name }`
- 可清除（clearable）

### 创建时间区间
- `el-date-picker` type="daterange"，`range-separator="至"`
- 选择后转换为 ISO 8601 格式传参

---

## 任务列表表格契约

### 列定义

| 列名 | prop | 宽度 | 说明 |
|------|------|------|------|
| 任务 ID | `task_id` | 220px | 截断显示前 8 位 + "..." + 复制按钮（tooltip 显示完整 UUID） |
| 类型 | `task_type` | 100px | el-tag |
| 状态 | `status` | 100px | el-tag（颜色映射见 data-model.md） |
| 教练 | `coach_name` | 120px | 文本，null → "—" |
| 视频文件名 | `video_filename` | auto | show-overflow-tooltip |
| 进度 | `progress_pct` | 120px | el-progress :percentage="row.progress_pct \|\| 0" |
| 创建时间 | `created_at` | 160px | 格式化为 YYYY-MM-DD HH:mm:ss |
| 完成时间 | `completed_at` | 160px | 格式化，null → "—" |
| 操作 | — | 80px | "详情"文字按钮 |

---

## 详情抽屉契约

### 触发
- 点击列表行"详情"按钮 → 调用 `getTaskDetail(taskId)` → 抽屉展开

### 基础信息区（el-descriptions title="基础信息" :column="2" border）

| 标签 | 字段 |
|------|------|
| 任务 ID | `task_id` + 复制按钮 |
| 任务类型 | `task_type`（中文标签） |
| 状态 | `status`（el-tag） |
| 教练 | `coach_name`（null → "—"） |
| 视频文件名 | `video_filename` |
| 视频时长 | `video_duration_seconds` + "秒"（null → "—"） |
| 进度 | `progress_pct` + "%" |
| 知识库版本 | `knowledge_base_version`（null → "—"） |
| 创建时间 | `created_at` |
| 开始处理 | `started_at`（null → "—"） |
| 完成时间 | `completed_at`（null → "—"） |
| 错误信息 | `error_message`（条件显示，红色文本） |
| 拒绝原因 | `rejection_reason`（条件显示） |

### 摘要统计区（el-descriptions title="处理统计" :column="3" border）

仅当 `drawer.task.summary` 存在时展示：

| 标签 | 字段 |
|------|------|
| 技术点数量 | `summary.tech_point_count` |
| 音频转录 | `summary.has_transcript`（"有" / "无"） |
| 语义分段数 | `summary.semantic_segment_count` |
| 动作分析分段 | `summary.motion_analysis_count` |
| 偏差报告数 | `summary.deviation_count` |
| 建议条数 | `summary.advice_count` |

### 耗时统计区（el-descriptions title="耗时统计" :column="2" border）

仅当 `drawer.task.timing_stats` 不为 null 且有键值时展示：
- `v-for="(value, key) in drawer.task.timing_stats"`
- 标签：`key`（阶段名），内容：`value.toFixed(2) + " 秒"`

---

## 分页控件契约

```html
<el-pagination
  :current-page.sync="page"
  :page-sizes="[10, 20, 50]"
  :page-size.sync="pageSize"
  :total="total"
  layout="total, sizes, prev, pager, next, jumper"
  @current-change="onPageChange"
  @size-change="onSizeChange"
/>
```

- `@current-change` → 更新 `page`，调用 `fetchList()`（不重置页码）
- `@size-change` → 更新 `pageSize`，重置 `page = 1`，调用 `fetchList()`

---

## API 调用时序

```
页面 created()
  → loadCoachOptions()          // 加载教练下拉
  → fetchList()                 // 加载第 1 页任务列表

点击"查询"
  → page = 1
  → fetchList()

点击"重置"
  → 清空 filter.*、sortBy/order 恢复默认
  → page = 1
  → fetchList()

点击分页 / 切换每页条数
  → 更新 page / pageSize
  → fetchList()

点击排序选择器
  → 更新 sortBy / order
  → page = 1
  → fetchList()

点击"刷新"
  → fetchList()（保持当前 page 和 filter）

点击"详情"
  → drawer.visible = true
  → drawer.loading = true
  → getTaskDetail(taskId)
  → drawer.task = res
  → drawer.loading = false
```
