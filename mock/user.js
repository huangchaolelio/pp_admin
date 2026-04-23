
const tokens = {
  super_admin: {
    token: 'super_admin-token'
  },
  admin: {
    token: 'admin-token'
  }
}

const users = {
  'super_admin-token': {
    roles: ['super_admin'],
    introduction: '超级管理员，拥有所有权限',
    avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif',
    name: '超级管理员'
  },
  'admin-token': {
    roles: ['admin'],
    introduction: '普通管理员',
    avatar: 'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif',
    name: '普通管理员'
  }
}

// 用户列表数据（模拟数据库）
let userList = [
  {
    id: 1,
    username: 'super_admin',
    role: 'super_admin',
    phone: '13800138000',
    remark: '系统超级管理员',
    status: 'active',
    created_at: '2026-04-23T10:00:00Z'
  },
  {
    id: 2,
    username: 'admin',
    role: 'admin',
    phone: '13900139000',
    remark: '普通管理员',
    status: 'active',
    created_at: '2026-04-23T10:00:00Z'
  }
]

let nextId = 3

module.exports = [
  // 登录
  {
    url: '/api/user/login',
    type: 'post',
    response: config => {
      const { username } = config.body
      const token = tokens[username]

      if (!token) {
        return {
          code: 60204,
          message: '账号或密码错误'
        }
      }

      return {
        code: 20000,
        data: token
      }
    }
  },

  // 获取用户信息
  {
    url: '/api/user/info.*',
    type: 'get',
    response: config => {
      const { token } = config.query
      const info = users[token]

      if (!info) {
        return {
          code: 50008,
          message: '登录已过期，请重新登录'
        }
      }

      return {
        code: 20000,
        data: info
      }
    }
  },

  // 退出登录
  {
    url: '/api/user/logout',
    type: 'post',
    response: _ => {
      return {
        code: 20000,
        data: 'success'
      }
    }
  },

  // 获取用户列表
  {
    url: '/api/users',
    type: 'get',
    response: config => {
      const { page = 1, page_size, limit, username = '', status = '' } = config.query
      const pageSize = parseInt(page_size || limit || 10)

      let filtered = userList.filter(u => {
        const matchName = !username || u.username.includes(username)
        const matchStatus = !status || u.status === status
        return matchName && matchStatus
      })

      const total = filtered.length
      const start = (parseInt(page) - 1) * pageSize
      const items = filtered.slice(start, start + pageSize)

      return {
        code: 20000,
        data: { total, items },
        message: 'ok'
      }
    }
  },

  // 新增用户
  {
    url: '/api/users',
    type: 'post',
    response: config => {
      const { username, role, mobile, phone, remark } = config.body

      if (!username || !role) {
        return { code: 40000, data: null, message: '缺少必填字段' }
      }

      const exists = userList.some(u => u.username === username)
      if (exists) {
        return { code: 40001, data: null, message: '用户名已存在' }
      }

      const newUser = {
        id: nextId++,
        username,
        role,
        mobile: mobile || phone || '',
        remark: remark || '',
        status: 'active',
        created_at: new Date().toISOString()
      }
      userList.push(newUser)

      return { code: 20000, data: { id: newUser.id }, message: '新增成功' }
    }
  },

  // 编辑用户
  {
    url: '/api/users/\\d+',
    type: 'put',
    response: config => {
      const id = parseInt(config.url.match(/\/api\/users\/(\d+)/)[1])
      const user = userList.find(u => u.id === id)

      if (!user) {
        return { code: 40004, data: null, message: '用户不存在' }
      }

      const { role, phone, remark } = config.body
      if (role !== undefined) user.role = role
      if (phone !== undefined) user.phone = phone
      if (remark !== undefined) user.remark = remark

      return { code: 20000, data: null, message: '更新成功' }
    }
  },

  // 禁用/启用用户
  {
    url: '/api/users/\\d+/status',
    type: 'patch',
    response: config => {
      const id = parseInt(config.url.match(/\/api\/users\/(\d+)/)[1])
      const { status } = config.body

      // 简单 mock：不做登录用户校验（前端已做判断）
      const user = userList.find(u => u.id === id)
      if (!user) {
        return { code: 40004, data: null, message: '用户不存在' }
      }

      user.status = status
      return { code: 20000, data: null, message: '操作成功' }
    }
  }
]
