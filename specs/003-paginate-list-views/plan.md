# 实施计划: 各页面数据展示分页

**分支**: `003-paginate-list-views` | **日期**: 2026-04-23 | **规范**: [spec.md](spec.md)
**输入**: 来自 `/specs/003-paginate-list-views/spec.md` 的功能规范

## 摘要

为 pp_admin 后台的 5 个列表页面（视频分类、教学提示、教练管理、技术标准、知识库版本）添加前端分页能力。

由于 char_pp 后端所有列表接口均不支持分页查询参数，采用**前端分页**方案：一次性加载全量数据，在客户端用 `el-pagination` 按页切片展示。每页默认显示 20 条，支持 10/20/50 三档切换。

## 技术背景

**语言/版本**: JavaScript ES6+ / Vue 2.6.x
**主要依赖**: Element UI 2.x（el-pagination 组件，已内置，无需新增依赖）
**存储**: N/A（纯前端状态，不持久化）
**测试**: 手动验证（浏览器）
**目标平台**: Web 浏览器（Chrome/Firefox）
**项目类型**: 前端 Web 应用（vue-element-admin 二次开发）
**性能目标**: 换页操作即时响应（< 100ms，纯内存切片）
**约束条件**: 不修改后端接口；不引入新的 npm 依赖；复用 Element UI el-pagination
**规模/范围**: 5 个页面组件，每个修改量约 10-20 行

## 章程检查

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. 快速接入优先 | 复用 Element UI el-pagination，无新依赖 | ✅ 通过 |
| II. 前后端分离 | 纯前端变更，不修改后端接口 | ✅ 通过 |
| III. 配置化管理 | 无新配置项 | ✅ N/A |
| IV. 安全访问控制 | 无权限变更 | ✅ N/A |
| V. 数据可观测性 | 无数据写操作 | ✅ N/A |

**门控结论**: 无违规，可继续实施。

## 项目结构

### 文档(此功能)

```
specs/003-paginate-list-views/
├── plan.md              # 此文件
├── research.md          # 后端分页参数调研 + 前端分页决策
├── data-model.md        # 分页状态字段定义
├── contracts/
│   └── pagination-ui.md # el-pagination 统一配置契约
└── tasks.md             # 由 /speckit.tasks 生成
```

### 源代码(受影响文件)

```
src/views/
├── video-classifications/index.vue   # P1: 数据量最大(296条)，优先处理
├── knowledge-base/teaching-tips.vue  # P2: 数据量最大(2633条)
├── coaches/index.vue                 # P3: 统一体验
├── standards/index.vue               # P3: 统一体验
└── knowledge-base/index.vue          # P3: 统一体验
```

**结构决策**: 单一前端项目，直接修改各 view 组件。无新文件需要创建。

## 实施方案

### 通用改造模式（每个页面统一应用）

**Step 1 — data() 添加分页状态**:
```js
currentPage: 1,
pageSize: 20,
```

**Step 2 — computed 添加 pagedList**:
```js
pagedList() {
  const start = (this.currentPage - 1) * this.pageSize
  return this.filteredList.slice(start, start + this.pageSize)
  // 无 filteredList 的页面改为 this.list.slice(...)
}
```

**Step 3 — el-table 改用 pagedList**:
```html
<el-table :data="pagedList" ...>
```

**Step 4 — 添加 el-pagination**:
```html
<el-pagination
  style="margin-top: 16px; text-align: right"
  :current-page.sync="currentPage"
  :page-sizes="[10, 20, 50]"
  :page-size.sync="pageSize"
  :total="filteredList.length"
  layout="total, sizes, prev, pager, next, jumper"
  @current-change="val => currentPage = val"
  @size-change="val => { pageSize = val; currentPage = 1 }"
/>
```

**Step 5 — 筛选变更时重置页码**:
在所有触发数据重新加载/过滤的方法中加 `this.currentPage = 1`。

### 各页面特殊处理

| 页面 | 特殊处理 |
|------|---------|
| 视频分类 | `filteredList` 已存在（基于 manual_only 过滤），`pagedList` 基于它切片；筛选参数变更调 `fetchList` 时加 `currentPage = 1` |
| 教学提示 | `fetchList` 重新请求时加 `currentPage = 1` |
| 教练管理 | `list` 直接切片，`showInactive` 切换时加 `currentPage = 1` |
| 技术标准 | `list` 直接切片，无筛选 |
| 知识库版本 | `list` 直接切片，无筛选 |
