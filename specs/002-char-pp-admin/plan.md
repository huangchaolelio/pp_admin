# 实施计划: 乒乓球AI教练后台管理系统 — 对接 char_pp 项目

**分支**: `002-char-pp-admin` | **日期**: 2026-04-23 | **规范**: [spec.md](./spec.md)
**输入**: 来自 `/specs/002-char-pp-admin/spec.md` 的功能规范

## 摘要

在现有 pp_admin（Vue 2 + Element UI + vue-element-admin）基础上，新增 6 个业务模块，对接 char_pp FastAPI 后端的 REST API：

1. **任务监控**（US1，占位页）— 等待 char_pp 添加 `GET /api/v1/tasks`
2. **教练管理**（US2，P1）— CRUD + 停用 + 关联任务
3. **视频分类管理**（US3，P2）— 查看/纠错/重扫/批量提交知识提取
4. **技术标准管理**（US4，P2）— 查看/详情/触发重建
5. **动作诊断**（US5，P2）— 提交诊断 + 查看报告 + 超时处理
6. **知识库查看**（US6，P3）— 知识库版本列表 + 教学提示列表

**技术方案**: 独立 axios 实例（`charPpRequest.js`）对接 char_pp API（标准 HTTP 状态码，非 code:20000 格式）；Vuex 新增 `charPpUnavailable` 状态驱动服务不可用横幅；路由全开放（super_admin + admin 均可访问）。

---

## 技术背景

**语言/版本**: JavaScript ES6+，Vue 2.6.x，Node.js（构建环境）
**主要依赖**: vue-element-admin 4.4.0，Element UI 2.x，axios 0.18.x，vue-router 3.x，vuex 3.x
**存储**: N/A（纯前端，所有状态以 char_pp PostgreSQL 数据库为准）
**测试**: 手动验证（mock 数据辅助开发阶段测试）
**目标平台**: 现代浏览器（Chrome 60+），桌面端
**项目类型**: Web 管理后台（SPA）
**性能目标**: 任务列表加载 < 3s，诊断报告渲染 < 1s（char_pp 响应后）
**约束条件**: 诊断同步等待最长 60s（axios timeout: 65000ms）；char_pp API 响应格式为标准 HTTP 状态码（非 code:20000 包装）
**规模/范围**: 6 个新增菜单模块，~16 个新增文件，~6 个修改文件

---

## 章程检查

| 章程原则 | 检查项 | 状态 |
|---------|--------|------|
| I. 快速接入优先 | 所有新页面均基于 vue-element-admin 布局，复用 Element UI 组件 | ✅ 通过 |
| I. 快速接入优先 | 不引入新 UI 库（Element UI 已有 Table、Form、Dialog、Tag 等所需组件） | ✅ 通过 |
| II. 前后端分离 | 通过 charPpRequest.js（独立 axios）与 char_pp REST API 通信 | ✅ 通过 |
| II. 前后端分离 | char_pp API 使用标准 HTTP 状态码，不使用 code:20000 包装 → 需单独 axios 实例 | ✅ 已处理 |
| III. 配置化管理 | char_pp API 基础地址通过 `VUE_APP_CHAR_PP_API` 环境变量配置，不硬编码 | ✅ 通过 |
| IV. 安全访问控制 | 复用现有 RBAC（super_admin/admin），新路由对两角色均开放 | ✅ 通过 |
| V. 数据可观测性 | 服务不可用横幅 + 缓存只读数据，满足可观测性要求 | ✅ 通过 |

**阶段 0 后重检**: ✅ 无违规，无需复杂度证明。

---

## 项目结构

### 文档（此功能）

```
specs/002-char-pp-admin/
├── plan.md              # 此文件
├── research.md          # 阶段 0 输出 — char_pp API 研究与技术决策
├── data-model.md        # 阶段 1 输出 — 实体模型与字段定义
├── contracts/           # 阶段 1 输出 — UI 契约（页面状态机）
│   ├── coaches.md
│   ├── video-classifications.md
│   ├── standards.md
│   ├── diagnosis.md
│   └── knowledge-base.md
└── tasks.md             # 阶段 2 输出（/speckit.tasks 命令生成）
```

### 源代码（新增文件）

```
src/
├── utils/
│   └── charPpRequest.js          # 独立 axios 实例（char_pp 专用）
├── api/
│   ├── coaches.js                 # 教练 CRUD API
│   ├── videoClassifications.js    # 视频分类 API
│   ├── standards.js               # 技术标准 API
│   ├── diagnosis.js               # 动作诊断 API
│   └── knowledgeBase.js           # 知识库 API
├── components/
│   └── TaskIdListDialog/
│       └── index.vue              # 批量提交结果弹窗（可复用）
├── layout/
│   └── components/
│       └── CharPpStatus.vue       # 服务不可用横幅
└── views/
    ├── tasks/
    │   └── index.vue              # 任务监控（占位页）
    ├── coaches/
    │   └── index.vue              # 教练管理
    ├── video-classifications/
    │   └── index.vue              # 视频分类管理
    ├── standards/
    │   └── index.vue              # 技术标准管理
    ├── diagnosis/
    │   └── index.vue              # 动作诊断
    └── knowledge-base/
        ├── index.vue              # 知识库版本列表
        └── teaching-tips.vue      # 教学提示列表

mock/
└── charPp.js                      # char_pp API mock 数据
```

### 源代码（修改文件）

```
src/
├── store/modules/app.js           # 新增 charPpUnavailable 状态
├── layout/index.vue               # 注入 CharPpStatus 横幅
└── router/index.js                # 替换 pp-coach 占位路由，新增 5 个业务路由

.env.development                   # 新增 VUE_APP_CHAR_PP_API=/char-pp-api
.env.production                    # 新增 VUE_APP_CHAR_PP_API=https://your-char-pp-domain.com
vue.config.js                      # 新增 devServer proxy /char-pp-api → http://localhost:8000
```

**结构决策**: 单项目 Vue SPA（选项 1 变体），API 层与 View 层分离，遵循 vue-element-admin 约定目录结构。

---

## 实施任务（4 个阶段，21 个任务）

### 阶段 1 — 基础设施（T001–T005）

**T001** — 创建 `src/utils/charPpRequest.js`
- 独立 axios 实例，baseURL: `process.env.VUE_APP_CHAR_PP_API`，timeout: 65000
- 请求拦截器：注入 pp_admin Token（复用 `getToken()`）
- 响应拦截器：HTTP 状态码 → 中文错误映射（401→未授权，404→资源不存在，422→参数错误，500→服务器内部错误，503→服务不可用）
- 错误时触发 `store.commit('app/SET_CHAR_PP_UNAVAILABLE', true)` 当 503/network error
- 成功时触发 `store.commit('app/SET_CHAR_PP_UNAVAILABLE', false)`

**T002** — 修改 `src/store/modules/app.js`
- state 新增：`charPpUnavailable: false`
- mutations 新增：`SET_CHAR_PP_UNAVAILABLE: (state, val) => { state.charPpUnavailable = val }`
- actions 新增：`setCharPpUnavailable({ commit }, val) { commit('SET_CHAR_PP_UNAVAILABLE', val) }`

**T003** — 创建 `src/layout/components/CharPpStatus.vue`
- 从 `store.state.app.charPpUnavailable` 读取状态
- 显示时：`<el-alert type="warning" title="char_pp 服务暂不可用，当前数据为只读模式" show-icon :closable="false" />`
- 注入 `src/layout/index.vue`（在 `<app-main />` 上方）

**T004** — 配置环境变量与代理
- `.env.development` 追加：`VUE_APP_CHAR_PP_API = /char-pp-api`
- `.env.production` 追加：`VUE_APP_CHAR_PP_API = https://your-char-pp-domain.com`
- `vue.config.js` devServer 新增 proxy：`'/char-pp-api': { target: 'http://localhost:8000', changeOrigin: true, pathRewrite: { '^/char-pp-api': '' } }`

**T005** — 重构 `src/router/index.js`
- 移除现有 `pp-coach` 和 `system` 占位路由
- 新增 6 个路由（均无 roles 限制，super_admin + admin 均可访问）：
  - `/tasks` → 任务监控（图标：`el-icon-time`）
  - `/coaches` → 教练管理（图标：`el-icon-trophy`）
  - `/video-classifications` → 视频分类（图标：`el-icon-video-camera`）
  - `/standards` → 技术标准（图标：`el-icon-data-analysis`）
  - `/diagnosis` → 动作诊断（图标：`el-icon-cpu`）
  - `/knowledge-base` → 知识库（含 2 个子路由：知识库列表 + 教学提示，图标：`el-icon-reading`）

---

### 阶段 2 — P1 核心模块（T006–T008）

**T006** — 创建 `src/api/coaches.js`
```js
import request from '@/utils/charPpRequest'

export function listCoaches(params) {
  return request({ url: '/api/v1/coaches', method: 'get', params })
}
export function createCoach(data) {
  return request({ url: '/api/v1/coaches', method: 'post', data })
}
export function updateCoach(id, data) {
  return request({ url: `/api/v1/coaches/${id}`, method: 'patch', data })
}
export function deleteCoach(id) {
  return request({ url: `/api/v1/coaches/${id}`, method: 'delete' })
}
export function assignCoachToTask(taskId, data) {
  return request({ url: `/api/v1/tasks/${taskId}/coach`, method: 'patch', data })
}
```

**T007** — 创建 `src/views/coaches/index.vue`
- 教练列表（`el-table`）：ID、姓名、简介、状态（活跃/停用标签）、操作
- 顶部工具栏：「新增教练」按钮 + 「显示停用」switch
- 新增/编辑 Dialog（`el-dialog` + `el-form`）：姓名（必填）、简介
- 停用确认：`this.$confirm('...', '确认停用', { type: 'warning' })`
- 调用 charPpUnavailable 状态禁用写操作按钮

**T008** — 创建 `src/views/tasks/index.vue`（占位页）
- 展示说明卡片：「任务监控功能正在建设中，依赖 char_pp 任务列表接口（GET /api/v1/tasks）就绪后上线。」
- 提供「查看任务详情」链接示例（使用已有的 `GET /api/v1/tasks/{task_id}`）

---

### 阶段 3 — P2 业务模块（T009–T015）

**T009** — 创建 `src/api/videoClassifications.js`
```js
import request from '@/utils/charPpRequest'

export function listClassifications(params) {
  return request({ url: '/api/v1/videos/classifications', method: 'get', params })
}
export function overrideClassification(cosObjectKey, data) {
  return request({ url: `/api/v1/videos/classifications/${encodeURIComponent(cosObjectKey)}`, method: 'patch', data })
}
export function refreshClassifications() {
  return request({ url: '/api/v1/videos/classifications/refresh', method: 'post' })
}
export function batchSubmitKnowledgeExtraction(data) {
  return request({ url: '/api/v1/videos/classifications/batch-submit', method: 'post', data })
}
```

**T010** — 创建 `src/components/TaskIdListDialog/index.vue`
- Props: `visible`（Boolean）、`taskIds`（Array<string>）
- 展示 task_id 列表，每条可点击（`router-push` 到任务详情页）
- emit `update:visible`（`.sync` 语法）

**T011** — 创建 `src/views/video-classifications/index.vue`
- 分类列表（`el-table`）：教练名、技术类别、子类别、视频类型、置信度、手动覆盖标签
- 多条件过滤（技术类别 select + 视频类型 select + 手动覆盖 checkbox）
- 行内编辑 Dialog：修改分类字段（提交后调用 `overrideClassification`，需 URL encode key）
- 顶部按钮：「重新扫描分类」（调用 `refreshClassifications`）+ 「批量提交知识提取」
- 批量提交结果通过 `TaskIdListDialog` 展示

**T012** — 创建 `src/api/standards.js`
```js
import request from '@/utils/charPpRequest'

export function listStandards() {
  return request({ url: '/api/v1/standards', method: 'get' })
}
export function getStandard(techCategory) {
  return request({ url: `/api/v1/standards/${techCategory}`, method: 'get' })
}
export function buildStandard(data) {
  return request({ url: '/api/v1/standards/build', method: 'post', data })
}
```

**T013** — 创建 `src/views/standards/index.vue`
- 标准列表（`el-table`）：技术类别、版本、质量类型、覆盖教练数、维度数、构建时间
- 无标准数据的类别标红（`cell-class-name` 或空行提示）
- 详情抽屉/弹窗：各维度 ideal/min/max 表格
- 「重建标准」按钮：Dialog 选择技术类别（可选）→ 调用 `buildStandard`

**T014** — 创建 `src/api/diagnosis.js`
```js
import request from '@/utils/charPpRequest'

export function submitDiagnosis(data) {
  return request({ url: '/api/v1/diagnosis', method: 'post', data, timeout: 65000 })
}
```

**T015** — 创建 `src/views/diagnosis/index.vue`
- 诊断表单：视频路径（输入框）、技术类别（select：forehand_topspin/backhand_push）
- 提交时展示全屏加载遮罩（`v-loading.fullscreen`）+ 进度提示
- 超时（60s）处理：关闭遮罩，展示「请求超时，点击重试」按钮，**保留表单输入**
- 报告展示区：综合评分、各维度卡片（测量值 vs ideal/min/max、偏差等级标签：正常/轻度偏差/明显偏差）、改进建议

---

### 阶段 4 — P3 知识库 + 收尾（T016–T021）

**T016** — 创建 `src/api/knowledgeBase.js`
```js
import request from '@/utils/charPpRequest'

export function listKnowledgeBase(params) {
  return request({ url: '/api/v1/knowledge_base', method: 'get', params })
}
export function listTeachingTips(params) {
  return request({ url: '/api/v1/teaching_tips', method: 'get', params })
}
```
> ⚠️ 路径待确认：需核实 char_pp 实际 endpoint（`/api/v1/knowledge_base` vs `/api/v1/knowledge-base`）

**T017** — 创建 `src/views/knowledge-base/index.vue`
- 按技术类别分组的知识库版本列表
- 展示：版本号、技术要点数量、来源教练数量、构建时间

**T018** — 创建 `src/views/knowledge-base/teaching-tips.vue`
- 教学提示列表，支持技术类别过滤
- 展示：提示内容、来源视频片段、置信度

**T019** — 创建 `mock/charPp.js` + 注册 mock
- 覆盖所有新增接口的 mock 数据：coaches、videos/classifications、standards、diagnosis、knowledge_base、teaching_tips
- 在 `mock/mock-server.js`（或入口）中注册

**T020** — 最终路由与目录整理
- 清理 `src/views/pp-coach/`、`src/views/system/config/` 占位目录
- 确认所有新增 views 目录均有 index.vue

**T021** — 提交代码 + 创建 PR
- `git add .`
- `git commit -m "feat: 002-char-pp-admin — 对接 char_pp API，实现教练管理/视频分类/技术标准/诊断/知识库模块"`
- `git push origin 002-char-pp-admin`
- 使用 GitHub API 创建 PR → master

---

## 依赖与风险

| 依赖 | 状态 | 处理方案 |
|------|------|---------|
| `GET /api/v1/tasks`（任务列表）| char_pp 待实现 | US1 占位页先交付 |
| 知识库 API 路径 | 待确认（`/knowledge_base` vs `/knowledge-base`） | T016 实现时核实 char_pp 路由 |
| char_pp 本地服务（联调） | 需本地启动 char_pp | 开发阶段通过 mock/charPp.js 替代 |

---

## 建议下一步

执行 `/speckit.build` 开始逐任务实施，或直接从 **T001（charPpRequest.js）** 开始编码。
