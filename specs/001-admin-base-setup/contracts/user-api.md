# API 契约: 用户管理接口

**功能**: `001-admin-base-setup`
**日期**: 2026-04-23
**权限**: 以下接口均需 `super_admin` 角色
**响应格式**: 统一三段式 `{ code, data, message }`

---

## GET /api/users

**描述**: 分页获取用户列表

**请求参数** (Query):
```
page        Number  页码，默认 1
page_size   Number  每页条数，默认 10，最大 100
username    String  用户名模糊搜索（可选）
status      String  状态过滤：active / disabled（可选）
```

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": {
    "total": 50,
    "items": [
      {
        "id": 1,
        "username": "admin",
        "role": "super_admin",
        "phone": "13800138000",
        "remark": "",
        "status": "active",
        "created_at": "2026-04-23T10:00:00Z"
      }
    ]
  },
  "message": "ok"
}
```

---

## POST /api/users

**描述**: 新增管理员账号

**请求体**:
```json
{
  "username": "newadmin",
  "password": "Abc12345",
  "role": "admin",
  "phone": "13900139000",
  "remark": "新用户备注"
}
```

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": { "id": 5 },
  "message": "新增成功"
}
```

**失败响应**:
```json
// 用户名已存在
{ "code": 40001, "data": null, "message": "用户名已存在" }
// 参数校验失败
{ "code": 40000, "data": null, "message": "用户名格式不正确" }
```

---

## PUT /api/users/:id

**描述**: 编辑管理员账号信息

**请求体** (仅传需要修改的字段，password 留空表示不修改):
```json
{
  "role": "super_admin",
  "phone": "13700137000",
  "remark": "更新备注",
  "password": ""
}
```

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": null,
  "message": "更新成功"
}
```

---

## PATCH /api/users/:id/status

**描述**: 禁用或启用账号

**请求体**:
```json
{
  "status": "disabled"
}
```

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": null,
  "message": "操作成功"
}
```

**失败响应**:
```json
// 禁用自身账号
{ "code": 40003, "data": null, "message": "不能禁用当前登录账号" }
```
