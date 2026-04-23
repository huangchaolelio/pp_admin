# 任务: 各页面数据展示分页

**输入**: 来自 `/specs/003-paginate-list-views/` 的设计文档
**前置条件**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/pagination-ui.md ✅

**组织结构**: 任务按用户故事分组，每个故事可独立实施和验证。

## 格式: `[ID] [P?] [Story] 描述`
- **[P]**: 可以并行运行（不同文件，无依赖关系）
- **[Story]**: 此任务属于哪个用户故事（US1, US2, US3）

---

## 阶段 1: 设置（无需额外设置）

**目的**: 本功能为纯前端改造，复用 Element UI `el-pagination`（已内置），无需安装新依赖、无需修改后端接口，无设置任务。

---

## 阶段 2: 基础（各页面共用分页模式确认）

**目的**: 确认 `el-pagination` 统一配置契约，所有用户故事的实施基于同一模式

**⚠️ 关键**: 各用户故事的实施需遵循 `specs/003-paginate-list-views/contracts/pagination-ui.md` 定义的统一模式

- [x] T001 阅读并确认 `specs/003-paginate-list-views/contracts/pagination-ui.md` 的分页 UI 契约，确保理解 `pagedList` computed、`currentPage`/`pageSize` data 字段和 `el-pagination` 配置

**检查点**: 基础就绪 — 可开始并行实施各用户故事

---

## 阶段 3: 用户故事 1 — 视频分类列表分页 (优先级: P1) 🎯 MVP

**目标**: 为视频分类页面（约 296 条数据）添加前端分页，`el-table` 改为按页渲染，避免一次性渲染全量 DOM

**独立测试**: 打开视频分类页面，确认首次仅展示 20 条记录；点击翻页按钮可切换页面；修改筛选条件后自动回到第 1 页；修改每页条数后正确重新分页

### 用户故事 1 的实施

- [x] T00x [US1] 在 `src/views/video-classifications/index.vue` 的 `data()` 中添加 `currentPage: 1` 和 `pageSize: 20` 字段
- [x] T00x [US1] 在 `src/views/video-classifications/index.vue` 的 `computed` 中添加 `pagedList()` 计算属性，基于 `filteredList` 切片：`filteredList.slice((currentPage-1)*pageSize, currentPage*pageSize)`
- [x] T00x [US1] 在 `src/views/video-classifications/index.vue` 中将 `el-table` 的 `:data` 属性从 `filteredList` 改为 `pagedList`
- [x] T00x [US1] 在 `src/views/video-classifications/index.vue` 的 `el-table` 下方添加 `el-pagination` 组件，配置 `layout="total, sizes, prev, pager, next, jumper"`，`:total="filteredList.length"`
- [x] T00x [US1] 在 `src/views/video-classifications/index.vue` 的 `fetchList` 方法开头添加 `this.currentPage = 1`（筛选参数变更重新请求时重置页码）
- [x] T00x [US1] 在 `src/views/video-classifications/index.vue` 中确认 `filteredList` computed 的 `manual_only` 过滤逻辑变更时也触发页码重置（在 watch 或筛选 change 事件中加 `this.currentPage = 1`）

**检查点**: 视频分类页面分页功能完整可用，可独立验证

---

## 阶段 4: 用户故事 2 — 教学提示列表分页 (优先级: P2)

**目标**: 为教学提示页面（约 2633 条数据）添加前端分页，解决大量数据渲染导致的性能问题

**独立测试**: 打开教学提示页面，确认首次仅展示 20 条记录；翻页正常工作；切换动作类型筛选后自动回到第 1 页

### 用户故事 2 的实施

- [x] T00x [US2] 在 `src/views/knowledge-base/teaching-tips.vue` 的 `data()` 中添加 `currentPage: 1` 和 `pageSize: 20` 字段
- [x] T00x [US2] 在 `src/views/knowledge-base/teaching-tips.vue` 的 `computed` 中添加 `pagedList()` 计算属性，基于 `list` 切片：`list.slice((currentPage-1)*pageSize, currentPage*pageSize)`
- [x] T01x [US2] 在 `src/views/knowledge-base/teaching-tips.vue` 中将 `el-table` 的 `:data` 属性从 `list` 改为 `pagedList`
- [x] T01x [US2] 在 `src/views/knowledge-base/teaching-tips.vue` 的 `el-table` 下方添加 `el-pagination` 组件，`:total="list.length"`
- [x] T01x [US2] 在 `src/views/knowledge-base/teaching-tips.vue` 的 `fetchList` 方法开头添加 `this.currentPage = 1`（筛选条件变更重新请求时重置页码）

**检查点**: 教学提示页面分页功能完整可用，可独立验证

---

## 阶段 5: 用户故事 3 — 教练/标准/知识库版本列表分页 (优先级: P3)

**目标**: 为教练管理、技术标准、知识库版本三个页面统一添加分页控件，保持交互一致性

**独立测试**: 打开三个页面，确认分页控件存在且显示正确的总记录数；数据量小时分页控件正确显示单页；各页面翻页操作正常

### 用户故事 3 的实施

- [x] T01x [P] [US3] 在 `src/views/coaches/index.vue` 的 `data()` 中添加 `currentPage: 1` 和 `pageSize: 20`；添加 `pagedList` computed（基于 `list` 切片）；`el-table :data` 改为 `pagedList`；`el-table` 下方添加 `el-pagination`（`:total="list.length"`）；`fetchCoaches` 中 `showInactive` 切换时重置 `currentPage = 1`
- [x] T01x [P] [US3] 在 `src/views/standards/index.vue` 的 `data()` 中添加 `currentPage: 1` 和 `pageSize: 20`；添加 `pagedList` computed（基于 `list` 切片）；`el-table :data` 改为 `pagedList`；`el-table` 下方添加 `el-pagination`（`:total="list.length"`）
- [x] T01x [P] [US3] 在 `src/views/knowledge-base/index.vue` 的 `data()` 中添加 `currentPage: 1` 和 `pageSize: 20`；添加 `pagedList` computed（基于 `list` 切片）；`el-table :data` 改为 `pagedList`；`el-table` 下方添加 `el-pagination`（`:total="list.length"`）

**检查点**: 所有 5 个列表页面均已添加分页，交互一致

---

## 阶段 6: 收尾与验证

**目的**: 验证所有页面分页一致性，并提交变更

- [x] T01x ESLint 检查所有修改文件：运行 `npm run lint` 确认无新增错误（`src/views/video-classifications/index.vue`、`src/views/knowledge-base/teaching-tips.vue`、`src/views/coaches/index.vue`、`src/views/standards/index.vue`、`src/views/knowledge-base/index.vue`）
- [x] T01x 提交所有分页变更到 `003-paginate-list-views` 分支并推送到远端

---

## 依赖关系与执行顺序

### 阶段依赖关系

- **基础（阶段 2）**: 无依赖，立即开始
- **US1（阶段 3）**: 依赖阶段 2 完成（理解契约）
- **US2（阶段 4）**: 依赖阶段 2 完成，可与 US1 并行
- **US3（阶段 5）**: 依赖阶段 2 完成，可与 US1/US2 并行
- **收尾（阶段 6）**: 依赖所有用户故事完成

### 并行机会

- T013、T014、T015 均在不同文件，可完全并行执行
- US1（T002-T007）和 US2（T008-T012）在不同文件，可并行执行

---

## 并行执行示例

```bash
# 阶段 5 三个任务可同时开始（不同文件）:
T013: 修改 src/views/coaches/index.vue
T014: 修改 src/views/standards/index.vue
T015: 修改 src/views/knowledge-base/index.vue
```

---

## 实施策略

### 仅 MVP（用户故事 1）

1. 完成 T001（基础确认）
2. 完成 T002–T007（视频分类分页）
3. **停止并验证**: 视频分类页面分页功能可用
4. 视需要继续 US2/US3

### 增量交付（推荐）

1. T001 → T002–T007（视频分类，P1）→ 验证
2. T008–T012（教学提示，P2）→ 验证
3. T013–T015（其余页面，P3，可并行）→ 验证
4. T016–T017（收尾提交）

---

## 注意事项

- [P] 任务 = 不同文件，无依赖关系，可并行
- 所有页面复用相同的 `el-pagination` 配置，详见 `contracts/pagination-ui.md`
- 本次为前端分页：后端一次性返回全量数据（视频分类 296 条，教学提示 2633 条），前端在内存中切片
- 无需修改任何 API 文件（`src/api/`）
- 无需安装新依赖（`el-pagination` 已内置于 Element UI）
