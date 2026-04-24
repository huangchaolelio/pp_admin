# 任务: 任务监控页面重新设计

**输入**: 来自 `/specs/004-task-monitor-redesign/` 的设计文档
**前置条件**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/task-monitor-ui.md ✅, quickstart.md ✅

## 格式: `[ID] [P?] [Story] 描述`
- **[P]**: 可以并行运行（不同文件，无依赖关系）
- **[Story]**: 此任务属于哪个用户故事（US1–US4）
- 描述中包含确切的文件路径

---

## 阶段 1: 设置（共享基础设施）

**目的**: 新建 API 模块，为所有用户故事提供数据访问基础

- [x] T001 新建 `src/api/tasks.js`，导出 `listTasks(params)` 函数，使用 `charPpRequest` 调用 `GET /api/v1/tasks`，params 透传（page, page_size, sort_by, order, status, task_type, coach_id, created_after, created_before）
- [x] T002 在 `src/api/tasks.js` 中追加导出 `getTaskDetail(taskId)` 函数，调用 `GET /api/v1/tasks/{taskId}`

**检查点**: `src/api/tasks.js` 可正常 import，两个函数签名与 012 API 契约一致

---

## 阶段 2: 基础（阻塞性前置条件）

**目的**: 建立组件骨架和公共常量，所有用户故事依赖此阶段

**⚠️ 关键**: 基础阶段完成后方可开始各用户故事实现

- [x] T003 在 `src/views/tasks/index.vue` 中清空现有占位内容，建立 Vue 2 Options API 组件骨架：`data()`（含 list/total/page/pageSize/loading/filter/sortBy/order/coachOptions/drawer 字段，初始值见 data-model.md），`methods` 占位，`created()` 钩子占位
- [x] T004 在 `src/views/tasks/index.vue` 中定义组件内常量：`STATUS_OPTIONS`（6 个状态枚举 + "全部" 选项）、`TASK_TYPE_OPTIONS`（2 个类型 + "全部" 选项）、`STATUS_TAG_MAP`（状态 → el-tag type 映射）、`TASK_TYPE_LABEL_MAP`（类型 → 中文标签）
- [x] T005 在 `src/views/tasks/index.vue` 中实现工具方法：`formatTime(val)`（null → "—"，否则格式化为 YYYY-MM-DD HH:mm:ss）、`statusTagType(status)`、`statusLabel(status)`、`taskTypeLabel(type)`、`copyToClipboard(text)`（使用 `navigator.clipboard` 复制并 `this.$message.success('已复制')`）

**检查点**: 组件可正常渲染（无 JS 错误），常量和工具方法可在模板中调用

---

## 阶段 3: 用户故事 1 — 管理员查看全量任务列表 (优先级: P1) 🎯 MVP

**目标**: 用服务端分页的任务表格替换现有占位页面，管理员打开即可看到任务列表

**独立测试**: 打开任务监控页面，表格展示任务数据，分页控件显示总数和总页数，切换页码后数据更新

### 用户故事 1 的实现

- [x] T006 [US1] 在 `src/views/tasks/index.vue` 中实现 `loadCoachOptions()` 方法：调用 `listCoaches()` 加载教练列表，映射为 `{ value: id, label: name }` 数组存入 `coachOptions`；`created()` 钩子中调用此方法
- [x] T007 [US1] 在 `src/views/tasks/index.vue` 中实现 `fetchList()` 方法：根据 data-model.md 中的请求参数构造规则，将 `filter.*`/`page`/`pageSize`/`sortBy`/`order` 组装为 params 对象（空值不传），调用 `listTasks(params)`，将响应的 `items` 存入 `list`，`total` 存入 `total`；加载期间设置 `loading = true`
- [x] T008 [US1] 在 `src/views/tasks/index.vue` 的 `created()` 中调用 `fetchList()`，确保页面初始化时自动加载第 1 页数据
- [x] T009 [US1] 在 `src/views/tasks/index.vue` `<template>` 中实现任务列表表格（el-table）：`:data="list"`，`v-loading="loading"`；按 contracts/task-monitor-ui.md 列定义添加各列（任务 ID 截断显示前 8 位+tooltip+复制按钮、任务类型 el-tag、状态 el-tag、教练姓名 null→"—"、视频文件名 show-overflow-tooltip、进度 el-progress、创建时间、完成时间、操作-详情按钮）
- [x] T010 [US1] 在 `src/views/tasks/index.vue` `<template>` 中实现分页控件（el-pagination）：`:current-page.sync="page"`，`:page-sizes="[10, 20, 50]"`，`:page-size.sync="pageSize"`，`:total="total"`，`layout="total, sizes, prev, pager, next, jumper"`；`@current-change` → 更新 page + fetchList；`@size-change` → pageSize = val + page = 1 + fetchList

**检查点**: 页面加载显示任务列表，分页功能正常，任务 ID 可复制，空列表显示"暂无数据"

---

## 阶段 4: 用户故事 2 — 多维筛选快速定位目标任务 (优先级: P1)

**目标**: 筛选栏支持状态/类型/教练/时间范围组合筛选，查询后列表刷新且页码归 1

**独立测试**: 选择状态"失败"点击查询，列表只显示失败任务；点击重置后列表恢复全量数据

### 用户故事 2 的实现

- [x] T011 [US2] 在 `src/views/tasks/index.vue` `<template>` 中实现筛选栏（el-card 内 el-form inline）：状态下拉（el-select clearable，选项来自 STATUS_OPTIONS）、任务类型下拉（el-select clearable，选项来自 TASK_TYPE_OPTIONS）、教练下拉（el-select clearable filterable，选项来自 coachOptions，加载教练时显示 loading）、创建时间区间（el-date-picker type="daterange" value-format="yyyy-MM-ddTHH:mm:ssZ" range-separator="至"，绑定 filter.dateRange）、查询按钮、重置按钮
- [x] T012 [US2] 在 `src/views/tasks/index.vue` 中实现 `handleSearch()` 方法：将 `filter.dateRange[0]` 赋给 `filter.createdAfter`，`filter.dateRange[1]` 赋给 `filter.createdBefore`，重置 `page = 1`，调用 `fetchList()`；查询按钮绑定此方法
- [x] T013 [US2] 在 `src/views/tasks/index.vue` 中实现 `handleReset()` 方法：清空所有 `filter.*` 字段、`filter.dateRange = []`，重置 `page = 1`、`sortBy = 'created_at'`、`order = 'desc'`，调用 `fetchList()`；重置按钮绑定此方法

**检查点**: 筛选条件组合查询后列表正确过滤，重置后恢复全量第 1 页；教练下拉显示教练名称

---

## 阶段 5: 用户故事 3 — 查看单条任务完整详情 (优先级: P2)

**目标**: 点击"详情"展开右侧抽屉，显示基础字段 + 摘要统计 + 耗时统计

**独立测试**: 点击任意任务行"详情"，抽屉在右侧滑出，展示完整信息包括 summary 统计数字；教练视频任务技术点数有值，运动员视频任务动作分析数有值

### 用户故事 3 的实现

- [x] T014 [US3] 在 `src/views/tasks/index.vue` 中实现 `openDetail(taskId)` 方法：设置 `drawer.visible = true`、`drawer.loading = true`、`drawer.task = null`，调用 `getTaskDetail(taskId)`，成功后赋值 `drawer.task = res`（响应为 task 对象），异常时 `drawer.visible = false`，最终 `drawer.loading = false`；列表"详情"按钮绑定 `openDetail(row.task_id)`
- [x] T015 [US3] 在 `src/views/tasks/index.vue` `<template>` 中实现详情抽屉（el-drawer）：`:visible.sync="drawer.visible"`，`direction="rtl"`，`size="600px"`，`title="任务详情"`；内部 `v-loading="drawer.loading"`；基础信息区（el-descriptions :column="2" border，按 contracts/task-monitor-ui.md 基础信息区字段逐一渲染，含任务 ID 复制按钮）
- [x] T016 [US3] 在详情抽屉中追加摘要统计区（el-descriptions title="处理统计" :column="3" border）：`v-if="drawer.task && drawer.task.summary"`，按 contracts/task-monitor-ui.md 摘要统计区字段渲染（tech_point_count、has_transcript → "有"/"无"、semantic_segment_count、motion_analysis_count、deviation_count、advice_count）
- [x] T017 [US3] 在详情抽屉中追加耗时统计区（el-descriptions title="耗时统计" :column="2" border）：`v-if="drawer.task && drawer.task.timing_stats && Object.keys(drawer.task.timing_stats).length"`，使用 `v-for="(value, key) in drawer.task.timing_stats"` 动态渲染各阶段耗时（`value.toFixed(2) + ' 秒'`）

**检查点**: 右侧抽屉正确展示任务详情，摘要统计字段全部显示（教练视频/运动员视频分别有对应字段有值），耗时统计在有数据时显示

---

## 阶段 6: 用户故事 4 — 排序与手动刷新 (优先级: P3)

**目标**: 工具栏提供排序切换器（创建时间/完成时间 × 升降序）和手动刷新按钮

**独立测试**: 切换排序字段为"完成时间倒序"，列表重新加载并按 completed_at 排序，未完成任务排末尾；点击刷新按钮保持当前筛选重新加载

### 用户故事 4 的实现

- [x] T018 [US4] 在 `src/views/tasks/index.vue` `<template>` 筛选栏与表格之间添加工具栏：排序字段选择器（el-select，选项：created_at→"按创建时间" / completed_at→"按完成时间"，绑定 sortBy）、排序方向选择器（el-select，选项：desc→"倒序" / asc→"正序"，绑定 order）、刷新按钮（el-button icon="el-icon-refresh" circle，绑定 handleRefresh，`:loading="loading"`）
- [x] T019 [US4] 在 `src/views/tasks/index.vue` 中使用 `watch` 监听 `sortBy` 和 `order` 变化：分别重置 `page = 1` 并调用 `fetchList()`；实现 `handleRefresh()` 方法，直接调用 `fetchList()`（保持当前 page 和 filter）

**检查点**: 切换排序后列表重新加载，刷新按钮有 loading 状态，排序期间表格显示加载中

---

## 阶段 7: 收尾与横切关注点

**目的**: 样式细节、边界处理和代码质量

- [x] T020 在 `src/views/tasks/index.vue` `<style scoped>` 中添加必要样式：`.task-id-cell`（等宽字体展示 UUID 前 8 位）、`.rejected-tag`（与 failed 区分的深红色 #c0392b 背景）、筛选栏 `.filter-bar`（bottom margin）、详情抽屉内容区 padding
- [x] T021 [P] 在 `src/views/tasks/index.vue` 中处理所有边界情况：`progress_pct` 为 null 时 el-progress 显示 0；`timing_stats` 为 null 时不渲染耗时区；`error_message`/`rejection_reason` 非空时在详情中以红色文本渲染（`v-if` 条件）；`video_filename` 过长时 `show-overflow-tooltip` 截断
- [x] T022 在 `src/views/tasks/index.vue` 的 `fetchList()` catch 块中添加错误处理：捕获异常后 `this.$message.error('加载失败，请刷新重试')`，并将 `list = []`、`total = 0`，避免显示空白页面
- [x] T023 [P] 运行 `npm run lint` 检查 `src/api/tasks.js` 和 `src/views/tasks/index.vue`，修复所有 ESLint 报错（重点：无用变量、引号规范、组件 name 声明）
- [x] T024 [P] 更新 `specs/004-task-monitor-redesign/checklists/requirements.md`，将所有清单项标记为 `[x]` 已完成

---

## 依赖关系与执行顺序

### 阶段依赖关系

- **阶段 1 (设置)**: 无依赖，立即开始
- **阶段 2 (基础)**: 依赖阶段 1（tasks.js 需先存在）
- **阶段 3 (US1)**: 依赖阶段 2 完成
- **阶段 4 (US2)**: 依赖阶段 3（筛选栏需表格已渲染）
- **阶段 5 (US3)**: 依赖阶段 3（详情按钮在表格操作列）
- **阶段 6 (US4)**: 依赖阶段 3（排序影响 fetchList）
- **阶段 7 (收尾)**: 依赖所有功能故事完成

### 用户故事依赖关系

```
阶段1(T001-T002) → 阶段2(T003-T005) → 阶段3/US1(T006-T010) → 阶段4/US2(T011-T013)
                                                              ↘ 阶段5/US3(T014-T017)
                                                              ↘ 阶段6/US4(T018-T019)
```

- **US2、US3、US4** 均依赖 US1 列表表格存在，但三者可在 US1 完成后并行实现

### 并行机会

```
# 阶段 1 内并行：
T001 (listTasks 函数) 与 T002 (getTaskDetail 函数) 可并行

# 阶段 2 内并行：
T004 (常量定义) 与 T005 (工具方法) 可并行（均属 script，不冲突）

# US1 完成后并行：
阶段 4 (US2 筛选栏) + 阶段 5 (US3 详情抽屉) + 阶段 6 (US4 排序刷新) 可并行

# 阶段 7 收尾并行：
T020 (样式) + T021 (边界) + T023 (lint) + T024 (清单) 可并行
```

---

## 实施策略

### 仅 MVP（用户故事 1：基础列表分页）

1. 完成阶段 1 (T001–T002)
2. 完成阶段 2 (T003–T005)
3. 完成阶段 3 (T006–T010)
4. **停止验证**: 打开任务监控页面，表格显示数据，分页正常
5. 即可演示：任务列表功能完整替换占位页面

### 增量交付（推荐顺序）

1. 阶段 1+2 → 骨架就绪
2. 阶段 3 → MVP，列表可用
3. 阶段 4 → 筛选上线
4. 阶段 5+6 → 详情+排序（可并行）
5. 阶段 7 → 收尾打磨

---

## 注意事项

- [P] 任务 = 不同代码区域，无依赖，可并行
- US1 是整个页面的骨架，US2–US4 都在其基础上扩展
- 服务端分页：`page`/`pageSize` 变化时直接调用 `fetchList()`，不使用 `pagedList` computed（与其他页面不同）
- 教练下拉在 `created()` 中加载一次，与任务列表加载并行
- `timing_stats` 是 JSONB 对象，键名不固定，必须用 `v-for` 动态渲染
- ESLint 检查在最后统一运行，但开发时注意 no-unused-vars 和 vue/order-in-components
