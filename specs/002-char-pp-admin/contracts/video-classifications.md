# UI 契约: 视频分类管理页面

**路由**: `/video-classifications`
**组件**: `src/views/video-classifications/index.vue`

---

## 页面状态机

```
初始态 → [mounted] → 加载分类列表
加载中 → [成功] → 展示列表
加载中 → [失败] → 服务不可用横幅 + 空列表

列表展示
  ├─[点击行内「编辑分类」]→ 覆盖 Dialog 开启（预填当前分类字段）
  ├─[点击「重新扫描分类」]→ 确认 Dialog → POST refresh → 展示扫描结果
  └─[点击「批量提交知识提取」]→ 配置 Dialog（选择音频分析选项）

覆盖 Dialog
  └─[提交]→ PATCH classifications/{encodeURIComponent(key)} → 刷新列表

批量提交 Dialog
  └─[确认]→ POST batch-submit → TaskIdListDialog 展示 task_id 列表

服务不可用
  └─[所有写操作按钮] → disabled
```

---

## 接口绑定

| UI 操作 | API 调用 | 成功响应处理 |
|---------|---------|------------|
| 页面加载 | `GET /api/v1/videos/classifications` | 渲染列表 |
| 过滤条件变化 | `GET /api/v1/videos/classifications?{过滤参数}` | 更新列表 |
| 提交覆盖 | `PATCH /api/v1/videos/classifications/{encodeURI(key)}` | 刷新列表 |
| 重新扫描 | `POST /api/v1/videos/classifications/refresh` | 展示统计（重新分类数/跳过数/总数）|
| 批量提交 | `POST /api/v1/videos/classifications/batch-submit` | TaskIdListDialog({taskIds}) |

---

## 过滤条件

```
tech_category: el-select（forehand_topspin / backhand_push / 全部）
video_type:    el-select（expert / athlete / 全部）
manual_only:   el-checkbox（只看手动覆盖）
```

---

## 列表列定义

| 列名 | 字段 | 渲染 |
|------|------|------|
| 视频路径 | cos_object_key | 文本（超长截断 + tooltip）|
| 教练名 | coach_name | 文本 |
| 技术类别 | tech_category | 文本 |
| 视频类型 | video_type | el-tag（expert→蓝，athlete→绿）|
| 置信度 | confidence | el-progress 或百分比文本 |
| 手动覆盖 | is_manually_overridden | el-tag type="warning"（是）/ 无 |
| 操作 | — | 「编辑分类」按钮 |

---

## TaskIdListDialog 契约

**位置**: `src/components/TaskIdListDialog/index.vue`

```
Props:
  visible: Boolean    // .sync 绑定
  taskIds: String[]   // 已提交的 task_id 列表

展示:
  el-dialog title="批量提交结果"
    el-table :data="taskIds"
      el-table-column label="任务 ID"
        template: el-link @click="goToTask(taskId)"  // 跳转 /tasks/{taskId}

Events:
  update:visible  // 关闭 Dialog
```
