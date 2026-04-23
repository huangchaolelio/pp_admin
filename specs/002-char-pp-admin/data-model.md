# 数据模型: 002-char-pp-admin

**生成日期**: 2026-04-23
**来源**: char_pp API 规范 + spec.md 需求

---

## 1. Coach（教练）

```
Coach {
  id:          number       // 唯一 ID，char_pp 生成
  name:        string       // 教练名称（唯一，必填）
  description: string|null  // 简介（可选）
  is_active:   boolean      // 活跃状态（false = 停用）
  created_at:  string       // ISO 8601 时间戳
}
```

**验证规则**:
- `name` 不可重复（char_pp 返回 409 Conflict）
- `name` 不可为空

**状态转换**:
```
活跃（is_active=true） → [停用操作] → 停用（is_active=false）
停用状态不可被新任务引用（char_pp 端控制）
```

---

## 2. AnalysisTask（分析任务）

```
AnalysisTask {
  task_id:      string       // 任务 UUID
  video_path:   string       // 视频在 COS 中的路径
  task_type:    enum         // 'expert' | 'athlete'
  status:       enum         // 'pending' | 'processing' | 'completed' | 'failed'
  coach_id:     number|null  // 关联教练 ID
  created_at:   string       // ISO 8601 时间戳
  duration_ms:  number|null  // 处理耗时（毫秒）
  error_message: string|null // 失败原因
  // 以下字段在任务详情中展示（GET /api/v1/tasks/{task_id}）
  video_duration: number|null    // 视频时长（秒）
  frame_rate:     number|null    // 帧率
  resolution:     string|null    // 分辨率（如 "1920x1080"）
  result_summary: object|null    // 处理结果摘要（专家/运动员不同结构）
}
```

**注意**: `GET /api/v1/tasks`（列表）接口待 char_pp 实现，US1 为占位页。

---

## 3. VideoClassification（视频分类）

```
VideoClassification {
  cos_object_key:    string       // COS 对象 key（唯一 ID，可含路径分隔符）
  coach_name:        string|null  // 教练名称
  tech_category:     string|null  // 技术类别（如 forehand_topspin）
  sub_category:      string|null  // 子类别
  tech_detail:       string|null  // 技术细节
  action_type:       string|null  // 动作类型
  video_type:        enum         // 'expert' | 'athlete'
  confidence:        number|null  // 置信度（0.0–1.0）
  is_manually_overridden: boolean // 是否手动覆盖
  classified_at:     string|null  // 分类时间
}
```

**关键约束**: `cos_object_key` 作为 URL 路径参数时必须 `encodeURIComponent()` 编码。

---

## 4. TechStandard（技术标准）

```
TechStandard {
  tech_category:   string   // 技术类别（如 forehand_topspin）
  version:         number   // 版本号
  quality_type:    string   // 质量类型（如 'high' | 'medium'）
  coach_count:     number   // 覆盖教练数
  dimension_count: number   // 维度数量
  built_at:        string   // 构建时间

  // 详情（GET /api/v1/standards/{tech_category}）
  dimensions: [{
    name:      string   // 维度名称
    unit:      string   // 单位
    ideal:     number   // 理想值
    min:       number   // 最小值
    max:       number   // 最大值
    sample_count: number // 样本数
  }]
}
```

---

## 5. DiagnosisReport（诊断报告）

```
DiagnosisReport {
  overall_score:  number   // 综合评分（0–100）
  tech_category:  string   // 被诊断的技术类别
  video_path:     string   // 诊断的视频路径

  dimensions: [{
    name:           string   // 维度名称
    measured_value: number   // 测量值
    ideal:          number   // 标准理想值
    min:            number   // 标准最小值
    max:            number   // 标准最大值
    deviation_level: string  // 偏差等级：'normal' | 'minor' | 'significant'
    suggestion:     string|null // 改进建议
  }]

  strengths:    string[]   // 优点列表
  improvements: string[]   // 总体改进建议列表
}
```

**前端偏差标签映射**:
- `normal` → `<el-tag type="success">正常</el-tag>`
- `minor` → `<el-tag type="warning">轻度偏差</el-tag>`
- `significant` → `<el-tag type="danger">明显偏差</el-tag>`

---

## 6. KnowledgeBase（知识库）

```
KnowledgeBaseEntry {
  tech_category:    string   // 技术类别
  version:          number   // 版本号
  tech_point_count: number   // 技术要点数量
  coach_count:      number   // 来源教练数量
  built_at:         string   // 构建时间
}

TeachingTip {
  id:              number   // 唯一 ID
  tech_category:   string   // 技术类别
  content:         string   // 提示内容
  source_clip:     string   // 来源视频片段路径
  confidence:      number   // 置信度
}
```

---

## 前端状态模型

### Vuex store/modules/app.js 新增状态

```js
state: {
  // ... 现有状态 ...
  charPpUnavailable: false  // char_pp 服务不可用标志
}
```

### 页面共用缓存模式

每个 char_pp 业务页面在组件 `data()` 中维护：
```js
data() {
  return {
    list: [],           // 当前展示数据（从 char_pp 加载或缓存）
    loading: false,     // 加载状态
    lastLoadedList: []  // 上次成功加载的数据（服务不可用时展示）
  }
}
```

当 `charPpUnavailable === true` 时，展示 `lastLoadedList`（只读），禁用新增/编辑/删除按钮。
