# 任务: 乒乓球AI教练后台管理系统 — 对接 char_pp 项目

**输入**: 来自 `/specs/002-char-pp-admin/` 的设计文档
**前置条件**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**测试**: 本项目不包含自动化测试任务（规范未要求）。通过 mock 数据 + 浏览器手动验证各用户故事。

**组织结构**: 任务按用户故事分组，每个故事可独立实施和验证。

## 格式: `[ID] [P?] [Story] 描述`
- **[P]**: 可以并行运行（不同文件，无依赖关系）
- **[Story]**: 此任务属于哪个用户故事（US1–US6）
- 描述中包含确切文件路径

---

## 阶段 1: 设置（共享基础设施）

**目的**: 建立 char_pp 对接所需的基础设施，所有用户故事共享

- [x] T001 创建 `src/utils/charPpRequest.js`：独立 axios 实例（baseURL: VUE_APP_CHAR_PP_API，timeout: 65000），请求拦截注入 Token，响应拦截 HTTP 状态码→中文错误映射，503/网络错误触发 `app/SET_CHAR_PP_UNAVAILABLE`
- [x] T002 修改 `src/store/modules/app.js`：state 新增 `charPpUnavailable: false`，mutations 新增 `SET_CHAR_PP_UNAVAILABLE`，actions 新增 `setCharPpUnavailable`
- [x] T003 [P] 创建 `src/layout/components/CharPpStatus.vue`：读取 `charPpUnavailable` 状态，显示 `el-alert` 服务不可用横幅（type="warning"，不可关闭）
- [x] T004 [P] 修改 `src/layout/index.vue`：在 `<app-main />` 上方注入 `<char-pp-status />` 组件，import CharPpStatus
- [x] T005 [P] 修改 `.env.development`：追加 `VUE_APP_CHAR_PP_API = /char-pp-api`
- [x] T006 [P] 修改 `.env.production`：追加 `VUE_APP_CHAR_PP_API = https://your-char-pp-domain.com`
- [x] T007 修改 `vue.config.js`：devServer.proxy 新增 `/char-pp-api` → `http://localhost:8000`（changeOrigin: true，pathRewrite 去前缀）
- [x] T008 修改 `src/router/index.js`：移除 `pp-coach`/`system` 占位路由，新增 6 个业务路由（tasks/coaches/video-classifications/standards/diagnosis/knowledge-base），均无 roles 限制
- [x] T009 [P] 创建 `src/components/TaskIdListDialog/index.vue`：可复用弹窗，props: visible(.sync) + taskIds(Array)，列表每行可点击跳转任务详情页
- [x] T010 [P] 创建 `mock/charPp.js`：注册所有 char_pp 接口 mock（coaches/tasks/video-classifications/standards/diagnosis/knowledge_base/teaching_tips）
- [x] T011 在 `mock/mock-server.js`（或 `vue.config.js`）中注册 `mock/charPp.js`

**检查点**: T001–T011 完成后，基础设施就绪，可开始各用户故事

---

## 阶段 2: 用户故事 2 — 教练管理（优先级: P1）🎯 MVP 首选

**目标**: 运营人员可完整进行教练 CRUD 操作（新增、查看、编辑、停用），任务关联教练

**独立测试**: 访问 `/coaches`，可新增教练、查看列表、停用教练、切换「含停用」开关查看历史记录，整个流程无需其他模块

### 用户故事 2 实施

- [x] T012 [US2] 创建 `src/api/coaches.js`：listCoaches(params)、createCoach(data)、updateCoach(id, data)、deleteCoach(id)、assignCoachToTask(taskId, data)，全部使用 charPpRequest
- [x] T013 [US2] 创建 `src/views/coaches/index.vue`：教练列表（el-table）、「新增教练」按钮、「含停用」switch、新增/编辑 Dialog（el-form，name必填/description可选）、停用确认对话框、charPpUnavailable 时禁用所有写操作按钮
- [x] T014 [US2] 确认 `src/router/index.js` 中 `/coaches` 路由已指向 `src/views/coaches/index.vue`，侧边栏菜单可见且图标正确（el-icon-trophy）

**检查点**: 访问 `/coaches`，完整教练管理功能可独立验证

---

## 阶段 3: 用户故事 1 — 任务监控占位（优先级: P1）

**目标**: 任务监控占位页就位，等待 char_pp 实现 `GET /api/v1/tasks` 后接入完整功能

**独立测试**: 访问 `/tasks`，页面正常渲染，显示「功能建设中」说明卡片

### 用户故事 1 实施

- [x] T015 [US1] 创建 `src/views/tasks/index.vue`：占位说明卡片（el-card），内容：「任务监控功能正在建设中，依赖 char_pp 任务列表接口（GET /api/v1/tasks）就绪后上线」；提供「查看任务详情」表单示例（输入 task_id 可跳转到详情，使用已有的 GET /api/v1/tasks/{task_id}）
- [x] T016 [US1] 确认 `src/router/index.js` 中 `/tasks` 路由已指向 `src/views/tasks/index.vue`，图标 el-icon-time

**检查点**: 访问 `/tasks`，占位页正常展示

---

## 阶段 4: 用户故事 3 — 视频分类管理（优先级: P2）

**目标**: 运营人员可查看所有视频分类、手动纠错、触发重新扫描、批量提交知识提取任务

**独立测试**: 访问 `/video-classifications`，可查看分类列表（含过滤）、手动覆盖某条记录、点击「重新扫描」看到统计结果、批量提交后 TaskIdListDialog 弹出展示 task_id 列表

### 用户故事 3 实施

- [x] T017 [US3] 创建 `src/api/videoClassifications.js`：listClassifications(params)、overrideClassification(cosObjectKey, data)（使用 encodeURIComponent）、refreshClassifications()、batchSubmitKnowledgeExtraction(data)，全部使用 charPpRequest
- [x] T018 [US3] 创建 `src/views/video-classifications/index.vue`：分类列表（el-table，含 cos_object_key/coach_name/tech_category/video_type/confidence/手动覆盖标签列）、多条件过滤（技术类别 select + 视频类型 select + 只看手动覆盖 checkbox）、行内「编辑分类」按钮（打开覆盖 Dialog）、「重新扫描分类」按钮（POST refresh，展示统计结果）、「批量提交知识提取」按钮（调用 batch-submit，结果通过 TaskIdListDialog 展示）、charPpUnavailable 时禁用写操作

**检查点**: 访问 `/video-classifications`，US3 全部验收场景可独立验证

---

## 阶段 5: 用户故事 4 — 技术标准管理（优先级: P2）

**目标**: 运营人员可查看各技术类别标准摘要、查看维度详情、触发标准重建

**独立测试**: 访问 `/standards`，可查看标准列表（含「缺少标准」标注）、点击技术类别查看维度详情、触发重建并查看构建结果

### 用户故事 4 实施

- [x] T019 [US4] 创建 `src/api/standards.js`：listStandards()、getStandard(techCategory)、buildStandard(data)，全部使用 charPpRequest
- [x] T020 [US4] 创建 `src/views/standards/index.vue`：标准列表（el-table，含 tech_category/version/quality_type/coach_count/dimension_count/built_at 列，无数据类别标红）、点击技术类别显示维度详情（el-dialog，各维度 ideal/min/max 表格）、「重建标准」按钮（Dialog 选择技术类别，可选，不选则全量重建；展示构建结果）、charPpUnavailable 时禁用重建按钮

**检查点**: 访问 `/standards`，US4 全部验收场景可独立验证

---

## 阶段 6: 用户故事 5 — 动作诊断（优先级: P2）

**目标**: 运营人员可提交诊断请求并查看完整报告，超时时保留表单可重试

**独立测试**: 访问 `/diagnosis`，填写表单提交后看到加载遮罩，成功后展示报告（综合评分 + 维度卡片 + 偏差标签 + 建议）；超时后看到「请求超时，点击重试」按钮且表单不被清空

### 用户故事 5 实施

- [x] T021 [US5] 创建 `src/api/diagnosis.js`：submitDiagnosis(data)，使用 charPpRequest，timeout: 65000
- [x] T022 [US5] 创建 `src/views/diagnosis/index.vue`：诊断表单（video_path 输入框 + tech_category select：forehand_topspin/backhand_push）；提交时 `v-loading.fullscreen` 全屏遮罩 + 进度提示文案；超时（ECONNABORTED）处理：关闭遮罩、设置 isTimeout=true、**不清空表单**、展示「请求超时，点击重试」按钮；成功后渲染报告区（综合评分 el-progress + 维度卡片列表 + 偏差等级 el-tag + 改进建议）；charPpUnavailable 时禁用提交按钮；`NO_STANDARD_DATA` 错误映射为「该技术类别暂无有效标准数据」

**检查点**: 访问 `/diagnosis`，US5 全部 4 个验收场景（含超时场景）可独立验证

---

## 阶段 7: 用户故事 6 — 知识库与教学提示（优先级: P3）

**目标**: 运营人员可查看知识库版本列表（按技术类别分组）和教学提示列表（支持技术类别过滤）

**独立测试**: 访问 `/knowledge-base/list`，可查看按技术类别分组的知识库版本；访问 `/knowledge-base/teaching-tips`，可按技术类别过滤教学提示列表

### 用户故事 6 实施

- [x] T023 [US6] 创建 `src/api/knowledgeBase.js`：listKnowledgeBase(params)（`GET /api/v1/knowledge_base`）、listTeachingTips(params)（`GET /api/v1/teaching_tips`），全部使用 charPpRequest；⚠️ 实现前核实 char_pp 实际路径（underscore vs hyphen）
- [x] T024 [P] [US6] 创建 `src/views/knowledge-base/index.vue`：按 tech_category 分组展示知识库版本列表（版本号/技术要点数量/来源教练数量/构建时间），使用 el-collapse 或分组 el-table
- [x] T025 [P] [US6] 创建 `src/views/knowledge-base/teaching-tips.vue`：教学提示列表，tech_category el-select 过滤，展示（内容/来源视频片段/置信度）列

**检查点**: 访问 `/knowledge-base/list` 和 `/knowledge-base/teaching-tips`，US6 两个验收场景可独立验证

---

## 阶段 8: 收尾与横切关注点

**目的**: 清理遗留占位目录，完善 mock 数据，最终验收并提交 PR

- [x] T026 [P] 清理遗留占位目录：移除 `src/views/pp-coach/`，移除 `src/views/system/config/`（如已被新路由替代）
- [x] T027 [P] 完善 `mock/charPp.js`：补全所有接口 mock 数据（含教练列表/视频分类/标准/诊断报告/知识库/教学提示），确保开发环境所有页面可脱离 char_pp 服务独立浏览
- [x] T028 验收检查：在开发环境（`npm run dev`）验证 6 个菜单模块均可访问、charPpStatus 横幅在模拟不可用时正确显示、所有写操作在不可用时禁用
- [x] T029 提交代码：`git add .` + `git commit -m "feat: 002-char-pp-admin — 对接 char_pp API，实现教练管理/视频分类/技术标准/诊断/知识库模块"`
- [x] T030 推送并创建 PR：`git push origin 002-char-pp-admin`，使用 GitHub API 创建 PR → master，标题：「feat: 002-char-pp-admin char_pp 后台管理对接」

---

## 依赖关系与执行顺序

### 阶段依赖关系

- **阶段 1（设置，T001–T011）**: 无依赖 — 立即开始
- **阶段 2–7（用户故事）**: 依赖阶段 1 完成（T001–T008 必须就绪）
  - US2（T012–T014）、US1（T015–T016）、US3（T017–T018）、US4（T019–T020）、US5（T021–T022）、US6（T023–T025）可在阶段 1 完成后并行推进
- **阶段 8（收尾）**: 依赖所有用户故事阶段完成

### 关键路径依赖

```
T001（charPpRequest.js）
  ↓
T002（Vuex 状态）
  ↓
T003/T004（横幅组件 + layout 注入）
  ↓
T007（vue.config.js proxy）+ T008（路由）
  ↓
T010/T011（mock 注册）
  ↓ 基础设施就绪
  ├── T012→T013→T014（US2 教练管理）
  ├── T015→T016（US1 任务占位）
  ├── T017→T018（US3 视频分类）
  ├── T019→T020（US4 技术标准）
  ├── T021→T022（US5 动作诊断）
  └── T023→T024+T025（US6 知识库）[T024/T025 可并行]
```

### 并行机会

- **阶段 1 内**: T003、T004、T005、T006、T009、T010 均可并行（不同文件）
- **阶段 1 完成后**: US1–US6 六个故事可并行（各自独立的 api/ + views/ 文件）
- **US6 内**: T024（知识库列表）和 T025（教学提示）可并行

---

## 并行示例

```bash
# 阶段 1 内可并行执行（在 T001/T002 完成后）:
任务 A: "创建 src/layout/components/CharPpStatus.vue"        # T003
任务 B: "修改 .env.development 追加 VUE_APP_CHAR_PP_API"     # T005
任务 C: "创建 src/components/TaskIdListDialog/index.vue"    # T009
任务 D: "创建 mock/charPp.js"                                # T010

# 阶段 1 完成后，各故事可并行:
任务 E: "创建 src/api/coaches.js + src/views/coaches/"      # US2
任务 F: "创建 src/api/standards.js + src/views/standards/"  # US4
任务 G: "创建 src/api/diagnosis.js + src/views/diagnosis/"  # US5
```

---

## 实施策略

### 仅 MVP（US2 教练管理）

1. 完成阶段 1（T001–T011）：基础设施
2. 完成阶段 2（T012–T014）：US2 教练管理
3. **停止并验证**: 访问 `/coaches`，完整 CRUD 独立可用
4. 可演示/上线 MVP

### 增量交付（按优先级）

1. 阶段 1（设置）→ 基础就绪
2. 阶段 2（US2 教练管理，P1）→ 验证 → 演示 MVP
3. 阶段 3（US1 任务占位，P1）→ 验证
4. 阶段 4（US3 视频分类，P2）→ 验证
5. 阶段 5（US4 技术标准，P2）→ 验证
6. 阶段 6（US5 动作诊断，P2）→ 验证
7. 阶段 7（US6 知识库，P3）→ 验证
8. 阶段 8（收尾 + PR）→ 完整交付

### 单人开发（推荐顺序）

按阶段 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 顺序依次推进，每个阶段完成后在浏览器验证对应菜单。

---

## 注意事项

- `[P]` 任务 = 不同文件，无依赖关系，可并行
- `[US?]` 标签将任务映射到具体用户故事，便于追溯
- 每个用户故事有独立的 api/ 文件 + views/ 目录，互不干扰
- 所有 char_pp API 调用必须通过 `charPpRequest`（T001），不得使用现有 `request.js`
- `cos_object_key` 用于 URL 路径时必须 `encodeURIComponent()`（T017/T018）
- 诊断超时处理（T022）必须保留表单输入，不清空 video_path 和 tech_category
- T023 实现前需核实知识库 API 路径（`/api/v1/knowledge_base` vs `/api/v1/knowledge-base`）
- 每个阶段完成后执行 `git commit`，保持提交粒度与用户故事对齐
