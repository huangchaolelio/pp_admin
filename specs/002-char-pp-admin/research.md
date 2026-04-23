# 研究报告: 002-char-pp-admin

**生成日期**: 2026-04-23
**功能**: 乒乓球AI教练后台管理系统 — 对接 char_pp 项目

---

## 1. char_pp API 端点研究

### 1.1 教练管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/coaches` | GET | 列出所有教练（支持 `include_inactive=true` 参数） |
| `POST /api/v1/coaches` | POST | 创建教练（`name`必填，`description`可选） |
| `PATCH /api/v1/coaches/{id}` | PATCH | 更新教练信息（部分更新） |
| `DELETE /api/v1/coaches/{id}` | DELETE | 停用教练（软删除，设置 `is_active=false`） |
| `PATCH /api/v1/tasks/{task_id}/coach` | PATCH | 为任务关联教练（`coach_id`字段） |

**响应格式**: 标准 HTTP 状态码（200/201/204/400/404/409），不使用 `{ code: 20000 }` 包装。
错误体：`{ "detail": { "code": "COACH_NOT_FOUND", "message": "..." } }` 或 FastAPI 默认 `{ "detail": "..." }`。

### 1.2 视频分类管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/videos/classifications` | GET | 列出所有视频分类（支持多条件过滤） |
| `PATCH /api/v1/videos/classifications/{cos_object_key}` | PATCH | 手动覆盖分类（cos_object_key 需 URL encode） |
| `POST /api/v1/videos/classifications/refresh` | POST | 触发全量重新扫描 |
| `POST /api/v1/videos/classifications/batch-submit` | POST | 批量提交知识提取任务 |

**重要**: `cos_object_key` 可能包含路径分隔符（如 `coaches/zhang/video.mp4`），必须用 `encodeURIComponent()` 编码后放入 URL 路径段。

### 1.3 技术标准管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/standards` | GET | 列出所有技术标准摘要 |
| `GET /api/v1/standards/{tech_category}` | GET | 获取特定技术类别的标准详情 |
| `POST /api/v1/standards/build` | POST | 触发标准重建（`tech_category` 可选，不传则全量重建） |

### 1.4 动作诊断

| 端点 | 方法 | 说明 |
|------|------|------|
| `POST /api/v1/diagnosis` | POST | 提交诊断请求（同步等待，最长约 60s） |

**重要**: 诊断是同步长请求，前端需设置 axios timeout ≥ 65000ms（65s，留5s余量）。

### 1.5 知识库（路径待核实）

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/knowledge_base` | GET | 列出知识库版本（待确认 underscore vs hyphen） |
| `GET /api/v1/teaching_tips` | GET | 列出教学提示 |

**待确认**: char_pp FastAPI 路由习惯用下划线（`knowledge_base`）还是连字符（`knowledge-base`）。需在 T016 实现时验证实际 char_pp 路由。

### 1.6 任务监控（依赖项）

| 端点 | 方法 | 状态 |
|------|------|------|
| `GET /api/v1/tasks` | GET | ❌ char_pp 待实现 |
| `GET /api/v1/tasks/{task_id}` | GET | ✅ 已实现 |

---

## 2. char_pp API 响应格式决策

### Decision
创建独立 axios 实例 `charPpRequest.js`，与现有 `request.js`（pp_admin 自身 API）完全分离。

### Rationale
- char_pp 使用标准 HTTP 状态码（200/4xx/5xx），错误体为 `{ detail: ... }`
- 现有 `request.js` 检查 `res.code !== 20000` 判断业务错误，不适配 char_pp 格式
- 独立实例可单独配置 timeout（65s）、baseURL、错误拦截逻辑

### Alternatives Considered
- **修改现有 request.js**：会破坏 pp_admin 用户管理等已有功能，拒绝
- **在各 API 文件内手动处理错误**：代码重复，拒绝
- **统一错误格式（在 char_pp 端加包装）**：需改动 char_pp，增加耦合，拒绝

---

## 3. 服务不可用降级策略决策

### Decision
使用 Vuex `charPpUnavailable` 布尔状态（存于 `store/modules/app.js`）驱动全局横幅和写操作禁用。

### Rationale
- Vuex 状态全局共享，所有模块页面可响应式读取
- 避免在每个组件内独立判断服务状态
- 横幅统一放在 `layout/index.vue`，不侵入业务组件

### Alternatives Considered
- **provide/inject 传递状态**：跨多层组件传递复杂，拒绝
- **EventBus**：Vue 2 中可行但不如 Vuex 可追踪，拒绝

---

## 4. 技术类别枚举

char_pp 当前支持两种技术动作类型（来自 spec 007/008/009/011）：
- `forehand_topspin`（正手拉球）
- `backhand_push`（反手推挡）

前端 select 直接硬编码这两个值，后续随 char_pp 扩展（新 spec）同步更新。

---

## 5. 偏差等级映射逻辑

诊断报告中各维度偏差等级，根据测量值相对标准的偏离程度在前端计算/展示：
- `正常`：测量值在 [min, max] 范围内
- `轻度偏差`：偏差 < 20%
- `明显偏差`：偏差 ≥ 20%

（具体阈值以 char_pp spec 011 返回的字段为准，前端根据响应数据中的 deviation_level 字段显示）

---

## 6. 未解决项

| 项目 | 状态 | 负责方 |
|------|------|--------|
| `GET /api/v1/tasks` 列表接口 | ❌ 待实现 | char_pp 团队 |
| 知识库 API 路径（underscore vs hyphen）| ⚠️ 待确认 | 实现 T016 时核实 |
