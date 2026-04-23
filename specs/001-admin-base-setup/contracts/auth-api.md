# API 契约: 认证接口

**功能**: `001-admin-base-setup`
**日期**: 2026-04-23
**响应格式**: 统一三段式 `{ code, data, message }`（遵循章程原则 II）

---

## POST /api/user/login

**描述**: 管理员账号密码登录，成功返回 JWT Token

**请求体**:
```json
{
  "username": "admin",
  "password": "123456"
}
```

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  },
  "message": "登录成功"
}
```

**失败响应**:
```json
// 用户名或密码错误
{ "code": 60204, "data": null, "message": "用户名或密码错误" }

// 账号已被禁用
{ "code": 60205, "data": null, "message": "账号已被禁用，请联系管理员" }
```

---

## POST /api/user/logout

**描述**: 退出登录，使服务端 Token 失效（前端同时清除 Cookie）

**请求头**: `Authorization: Bearer <token>`

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": null,
  "message": "退出成功"
}
```

---

## GET /api/user/info

**描述**: 获取当前登录用户信息（路由守卫在 Token 存在时调用，用于获取角色）

**请求头**: `Authorization: Bearer <token>`

**成功响应** (`code: 20000`):
```json
{
  "code": 20000,
  "data": {
    "roles": ["super_admin"],
    "name": "超级管理员",
    "avatar": ""
  },
  "message": "ok"
}
```

**失败响应** (Token 过期/无效):
```json
{ "code": 50008, "data": null, "message": "登录已过期，请重新登录" }
```
