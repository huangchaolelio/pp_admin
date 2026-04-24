# 研究报告: 任务监控页面重新设计

**功能**: 004-task-monitor-redesign
**日期**: 2026-04-23

## 决策 1: 服务端分页 vs 前端分页

- **Decision**: 使用**服务端分页**（传 `page`/`page_size` 给 `GET /api/v1/tasks`）。
- **Rationale**: 012 API 已提供完整分页参数（`page`, `page_size`, `total`, `total_pages`），任务总量可能达到数千条（现有教学提示已 2633 条）；前端一次加载全量会导致内存和请求时间不可控。其他列表页（教练/标准/分类）使用前端分页是因为后端不支持分页参数，任务监控应区别对待。
- **Alternatives considered**: 前端分页（与其他页面一致，但任务数量不可预期，被排除）。

## 决策 2: el-drawer 详情面板

- **Decision**: 使用 Element UI `el-drawer` 组件，`direction="rtl"`（右侧），`size="600px"`。
- **Rationale**: 用户在澄清中选定 A（右侧抽屉）；el-drawer 是 Element UI 2.x 内置组件，无需引入外部依赖，符合章程原则 I；抽屉不遮挡列表，符合监控场景"边查列表边看详情"的需求。
- **Alternatives considered**: el-dialog（覆盖列表，体验差，被排除）；行内展开（操作复杂，被排除）。

## 决策 3: 教练筛选下拉数据源

- **Decision**: 教练筛选使用 `el-select`，组件 `created` 时调用已有的 `listCoaches` API（`src/api/coaches.js`），将返回的教练列表转为下拉选项（`{ value: coach.id, label: coach.name }`）。
- **Rationale**: 用户在澄清中选定 B（下拉选择器）；`listCoaches` API 已存在，无需新增接口；教练数量（通常几十个）完整加载对性能无影响。
- **Alternatives considered**: 输入框粘贴 UUID（体验差，被排除）；不实现教练筛选（被排除）。

## 决策 4: API 模块组织

- **Decision**: 新建 `src/api/tasks.js`，导出 `listTasks(params)` 和 `getTaskDetail(taskId)` 两个函数，均使用 `charPpRequest`。
- **Rationale**: 与已有 `coaches.js`、`standards.js` 等模块风格一致；职责单一，易于维护。
- **Alternatives considered**: 在 `views/tasks/index.vue` 中内联 request 调用（不符合项目 API 分层惯例，被排除）。

## 决策 5: 状态徽标颜色映射

- **Decision**: 使用 el-tag 的 `type` 属性实现状态颜色区分：
  - `pending` → `info`（灰色）
  - `processing` → `warning`（橙色）
  - `success` → `success`（绿色）
  - `partial_success` → `primary`（蓝色）
  - `failed` → `danger`（红色）
  - `rejected` → `danger`（深红色，通过 class 覆盖样式区分）
- **Rationale**: el-tag 内置类型恰好覆盖大部分状态语义；仅 rejected 需要轻微样式覆盖（与 failed 同色但可加图标区分）。
- **Alternatives considered**: 自定义颜色（增加样式维护成本，被排除）。

## 决策 6: 刷新机制

- **Decision**: 工具栏添加"刷新"按钮（`el-button icon`），点击后重新调用 `fetchList()`，保持当前筛选条件不变，刷新期间按钮 loading 状态。
- **Rationale**: 用户在澄清中选定 B（手动刷新）；不引入定时器，避免持续网络请求和 Vue 组件销毁时的清理问题。
- **Alternatives considered**: 自动轮询 30 秒（被排除）。

## 决策 7: timing_stats 展示方式

- **Decision**: 若 `timing_stats` 字段（JSONB）有值，使用 `el-descriptions` 展示各阶段耗时（键值对）；若为 null 则不渲染该区块。
- **Rationale**: 后端返回的是 JSON 对象，键是阶段名，值是秒数；descriptions 组件最适合展示键值对，且可动态 `v-for` 遍历。
- **Alternatives considered**: 固定字段 el-table（结构不固定，被排除）。

## 无需额外研究项

- Element UI el-drawer、el-table、el-pagination、el-date-picker、el-select：均为项目已在用组件，API 明确。
- charPpRequest 封装：已有完整实现（`src/utils/charPpRequest.js`），直接复用。
- 路由：`/tasks/index` 路由已存在，无需修改。
- ESLint 配置：复用项目现有配置，无新增规则。
