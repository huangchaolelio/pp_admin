# UI 契约: 分页组件

**功能**: 003-paginate-list-views

## el-pagination 统一配置

所有列表页面使用相同的 `el-pagination` 配置：

```
layout: "total, sizes, prev, pager, next, jumper"
:page-sizes: [10, 20, 50]
:current-page.sync: currentPage
:page-size.sync: pageSize
:total: list.length（或 filteredList.length）
@current-change: handlePageChange
@size-change: handleSizeChange
```

## 事件处理约定

| 事件 | 处理方法 | 行为 |
|------|---------|------|
| `@current-change` | `handlePageChange(page)` | `this.currentPage = page` |
| `@size-change` | `handleSizeChange(size)` | `this.pageSize = size; this.currentPage = 1` |
| 筛选条件变更 | 现有 `fetchList` / 筛选 watch | 重置 `this.currentPage = 1` |

## 视图层数据流

```
接口返回全量 → this.list（全量缓存）
                    ↓
          filteredList（视频分类/教学提示有服务端筛选时直接是 list）
                    ↓
          pagedList = filteredList.slice((currentPage-1)*pageSize, currentPage*pageSize)
                    ↓
          el-table :data="pagedList"
```
