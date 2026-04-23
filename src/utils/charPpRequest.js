import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// HTTP 状态码到中文错误信息映射
const HTTP_ERROR_MAP = {
  400: '请求参数有误，请检查输入内容',
  401: '未授权，请重新登录',
  403: '无权限访问该资源',
  404: '请求的资源不存在',
  409: '数据冲突，请检查是否有重复记录',
  422: '请求参数有误，请检查输入内容',
  500: '服务器内部错误，请稍后重试',
  502: '网关错误，请稍后重试',
  503: 'char_pp 服务暂不可用，请稍后重试',
  504: '网关超时，请稍后重试'
}

// char_pp 专用 axios 实例
const charPpRequest = axios.create({
  baseURL: process.env.VUE_APP_CHAR_PP_API,
  timeout: 65000
})

// 请求拦截器 — 注入 pp_admin Token
charPpRequest.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) {
      config.headers['X-Token'] = token
    }
    return config
  },
  error => {
    console.error('[charPpRequest] 请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器 — 标准 HTTP 状态码处理
charPpRequest.interceptors.response.use(
  response => {
    // 成功响应，恢复服务可用状态
    store.commit('app/SET_CHAR_PP_UNAVAILABLE', false)
    return response.data
  },
  error => {
    if (error.code === 'ECONNABORTED' || axios.isCancel(error)) {
      // 超时由调用方自行处理，不在此弹出全局提示
      return Promise.reject(error)
    }

    const status = error.response ? error.response.status : null

    // 503 或网络错误 → 标记服务不可用
    if (!status || status === 503) {
      store.commit('app/SET_CHAR_PP_UNAVAILABLE', true)
    }

    // 提取错误消息
    let message = HTTP_ERROR_MAP[status] || `请求失败（${status || '网络错误'}）`

    // 尝试从 char_pp 响应体中提取更具体的错误信息
    if (error.response && error.response.data) {
      const detail = error.response.data.detail
      if (typeof detail === 'string') {
        message = detail
      } else if (detail && typeof detail === 'object' && detail.message) {
        message = detail.message
      }
    }

    Message({
      message,
      type: 'error',
      duration: 5 * 1000
    })

    return Promise.reject(error)
  }
)

export default charPpRequest
