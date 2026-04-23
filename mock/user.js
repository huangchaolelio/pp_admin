
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
  }
]
