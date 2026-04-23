# UI 契约: 教练管理页面

**路由**: `/coaches`
**组件**: `src/views/coaches/index.vue`

---

## 页面状态机

```
初始态 → [mounted] → 加载中
加载中 → [listCoaches 成功] → 列表展示
加载中 → [listCoaches 失败/503] → 服务不可用（横幅 + 空列表）
列表展示 → [点击新增] → 新增 Dialog 开启
新增 Dialog 开启 → [提交成功] → 列表刷新
新增 Dialog 开启 → [409 重复] → 表单内联错误（"教练名称已存在"）
列表展示 → [点击编辑] → 编辑 Dialog 开启（预填当前数据）
编辑 Dialog 开启 → [提交成功] → 列表刷新
列表展示 → [点击停用] → 停用确认 Dialog
停用确认 Dialog → [确认] → deleteCoach → 列表刷新
服务不可用 → [写操作按钮] → 禁用（disabled=true）
```

---

## 接口绑定

| UI 操作 | API 调用 | 成功响应处理 | 失败响应处理 |
|---------|---------|------------|------------|
| 页面加载 | `GET /api/v1/coaches` | 渲染列表 | 横幅 + 空列表 |
| 含停用开关 ON | `GET /api/v1/coaches?include_inactive=true` | 更新列表 | 中文错误提示 |
| 新增提交 | `POST /api/v1/coaches` | 刷新列表，关闭 Dialog | 409→"名称已存在" |
| 编辑提交 | `PATCH /api/v1/coaches/{id}` | 刷新列表，关闭 Dialog | 中文错误提示 |
| 停用确认 | `DELETE /api/v1/coaches/{id}` | 刷新列表 | 中文错误提示 |
| 关联任务教练 | `PATCH /api/v1/tasks/{task_id}/coach` | 成功提示 | 中文错误提示 |

---

## 表单字段

### 新增/编辑表单
```
el-form-item label="教练名称" required
  el-input v-model="form.name" placeholder="请输入教练名称"

el-form-item label="简介"
  el-input type="textarea" v-model="form.description" rows="3"
```

### 验证规则
```js
rules: {
  name: [
    { required: true, message: '请输入教练名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度 1-50 字符', trigger: 'blur' }
  ]
}
```

---

## 权限控制

- `charPpUnavailable === true` 时：「新增教练」、「编辑」、「停用」按钮全部 `disabled`
- 不区分 super_admin / admin（两者权限相同）
