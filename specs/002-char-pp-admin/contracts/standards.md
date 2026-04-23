# UI 契约: 技术标准管理页面

**路由**: `/standards`
**组件**: `src/views/standards/index.vue`

---

## 页面状态机

```
初始态 → [mounted] → GET /api/v1/standards → 列表展示
列表展示
  ├─[点击技术类别行]→ GET /api/v1/standards/{tech_category} → 详情侧抽屉/弹窗
  └─[点击「重建标准」]→ 重建 Dialog（选择技术类别，可选）
       └─[确认]→ POST /api/v1/standards/build → 展示构建结果

服务不可用
  └─[「重建标准」按钮] → disabled
```

---

## 接口绑定

| UI 操作 | API 调用 | 成功响应处理 |
|---------|---------|------------|
| 页面加载 | `GET /api/v1/standards` | 渲染列表 |
| 查看详情 | `GET /api/v1/standards/{tech_category}` | 侧抽屉展示维度表 |
| 触发重建 | `POST /api/v1/standards/build` | el-message 展示构建结果 |

---

## 列表列定义

| 列名 | 字段 | 渲染 |
|------|------|------|
| 技术类别 | tech_category | el-link（点击查看详情）|
| 版本 | version | 数字 |
| 质量类型 | quality_type | 文本 |
| 教练数 | coach_count | 数字 |
| 维度数 | dimension_count | 数字 |
| 构建时间 | built_at | 格式化日期 |
| 状态 | — | 无数据→ el-tag type="danger" "缺少标准" |

---

## 重建 Dialog

```
el-select label="技术类别（不选则全量重建）"
  el-option value="" label="全量重建"
  el-option value="forehand_topspin" label="正手拉球"
  el-option value="backhand_push" label="反手推挡"

请求体: { tech_category: selectedCategory || undefined }
```

---

## 构建结果展示

```
el-message-box 或 el-alert 展示：
  成功: "标准重建完成：成功 X 个，跳过 Y 个，失败 Z 个"
  失败: 中文错误提示
```
