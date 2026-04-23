# UI 契约: 知识库页面

**路由**: `/knowledge-base`（子路由）
**组件**:
- `src/views/knowledge-base/index.vue` — 知识库版本列表
- `src/views/knowledge-base/teaching-tips.vue` — 教学提示列表

---

## 知识库版本列表（index.vue）

### 页面状态机

```
初始态 → [mounted] → GET /api/v1/knowledge_base → 展示按技术类别分组的版本列表
服务不可用 → 横幅 + 缓存数据（只读）
```

### 接口绑定

| UI 操作 | API 调用 | 成功响应处理 |
|---------|---------|------------|
| 页面加载 | `GET /api/v1/knowledge_base` | 按 tech_category 分组渲染 |

### 列表结构

```
按技术类别分组（el-collapse 或分组 el-table）:
  每组展示版本列表：
    版本号 | 技术要点数量 | 来源教练数量 | 构建时间
```

---

## 教学提示列表（teaching-tips.vue）

### 页面状态机

```
初始态 → [mounted] → GET /api/v1/teaching_tips → 展示列表
[切换技术类别过滤] → GET /api/v1/teaching_tips?tech_category={value} → 更新列表
服务不可用 → 横幅 + 缓存数据（只读）
```

### 接口绑定

| UI 操作 | API 调用 | 成功响应处理 |
|---------|---------|------------|
| 页面加载 | `GET /api/v1/teaching_tips` | 渲染全量列表 |
| 过滤切换 | `GET /api/v1/teaching_tips?tech_category={v}` | 更新列表 |

### 列表列定义

| 列名 | 字段 | 渲染 |
|------|------|------|
| 技术类别 | tech_category | el-tag |
| 提示内容 | content | 文本（多行） |
| 来源视频片段 | source_clip | 文本路径 |
| 置信度 | confidence | 百分比或进度条 |

---

## 路由配置

```js
{
  path: '/knowledge-base',
  component: Layout,
  redirect: '/knowledge-base/list',
  name: 'KnowledgeBase',
  meta: { title: '知识库', icon: 'el-icon-reading' },
  children: [
    {
      path: 'list',
      component: () => import('@/views/knowledge-base/index'),
      name: 'KnowledgeBaseList',
      meta: { title: '知识库版本', icon: 'el-icon-collection' }
    },
    {
      path: 'teaching-tips',
      component: () => import('@/views/knowledge-base/teaching-tips'),
      name: 'TeachingTips',
      meta: { title: '教学提示', icon: 'el-icon-chat-line-round' }
    }
  ]
}
```

> ⚠️ API 路径 `/api/v1/knowledge_base` 和 `/api/v1/teaching_tips` 待 T016 时核实 char_pp 实际路由。
