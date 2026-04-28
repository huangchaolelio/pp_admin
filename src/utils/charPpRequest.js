import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// ─────────────────────────────────────────────────────────────
// 统一响应信封（Feature-017）适配
// 契约：specs/017-api-standardization/contracts/response-envelope.schema.json
//   成功：{ success:true,  data: <业务载荷>, meta: {page,page_size,total}|null }
//   失败：{ success:false, error: { code, message, details: object|null } }
// ─────────────────────────────────────────────────────────────

// 204 No Content：DELETE /coaches/{id}、DELETE /teaching-tips/{tip_id}
// 这两个端点根据 Feature-017 migration-notes 明确不套信封，需在此单独处理。

// HTTP 状态码兜底消息（仅当 error.message 缺失时使用）
const HTTP_FALLBACK = {
  400: '请求参数有误',
  401: '未授权，请重新登录',
  403: '无权限访问该资源',
  404: '请求的资源不存在',
  409: '数据冲突',
  410: '资源已失效',
  422: '请求参数校验失败',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误',
  502: '上游服务失败',
  503: '服务暂不可用，请稍后重试',
  504: '网关超时'
}

// 已知错误码的用户友好文案覆盖（不在此列的直接用后端 message）
const CODE_FRIENDLY = {
  ENDPOINT_RETIRED: '该接口已下线，请联系前端开发者更新调用',
  DB_UPSTREAM_FAILED: '数据库暂不可用，请稍后重试',
  LLM_UPSTREAM_FAILED: 'LLM 服务暂不可用，请稍后重试',
  COS_UPSTREAM_FAILED: '对象存储暂不可用，请稍后重试',
  WHISPER_UPSTREAM_FAILED: '语音转写服务暂不可用，请稍后重试',
  CHANNEL_QUEUE_FULL: '任务通道队列已满，请稍后再试',
  CHANNEL_DISABLED: '任务通道已停用'
}

// 业务代码层面可识别的错误类
export class ApiError extends Error {
  constructor(code, message, details, status) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details || null
    this.status = status
  }
}

const instance = axios.create({
  baseURL: process.env.VUE_APP_CHAR_PP_API,
  timeout: 65000
})

// 请求拦截器：注入 Token
instance.interceptors.request.use(
  config => {
    const token = getToken()
    if (token) config.headers['X-Token'] = token
    return config
  },
  err => Promise.reject(err)
)

// 响应拦截器：解析统一信封
instance.interceptors.response.use(
  response => {
    // 恢复服务可用标记
    store.commit('app/SET_CHAR_PP_UNAVAILABLE', false)

    // 204 No Content（DELETE 端点）—— 按约定无信封
    if (response.status === 204) return { data: null, meta: null }

    const body = response.data

    // 非 JSON / 未套信封的豁免（原则上不会命中，兜底即可）
    if (!body || typeof body !== 'object' || !('success' in body)) {
      return { data: body, meta: null }
    }

    if (body.success === true) {
      return { data: body.data, meta: body.meta || null }
    }

    // success=false 也带 200 返回几乎不可能；若发生按错误流走
    const err = body.error || {}
    return Promise.reject(buildApiError(err.code, err.message, err.details, response.status))
  },
  error => {
    // 请求被取消或超时
    if (axios.isCancel(error)) return Promise.reject(error)
    if (error.code === 'ECONNABORTED') {
      Message({ message: '请求超时，请稍后再试', type: 'error', duration: 5000 })
      return Promise.reject(error)
    }

    const status = error.response ? error.response.status : null
    const body = error.response ? error.response.data : null

    // 标记服务不可用（网络错误 / 503 / DB 上游失败）
    if (!status || status === 503 || (body && body.error && body.error.code === 'DB_UPSTREAM_FAILED')) {
      store.commit('app/SET_CHAR_PP_UNAVAILABLE', true)
    }

    // 标准错误信封
    let code, msg, details
    if (body && typeof body === 'object' && body.success === false && body.error) {
      code = body.error.code
      msg = body.error.message
      details = body.error.details
    } else if (body && typeof body === 'object' && body.detail) {
      // 罕见的 FastAPI 原生 detail（理论上不应命中，017 已统一）
      if (typeof body.detail === 'string') {
        msg = body.detail
      } else if (Array.isArray(body.detail)) {
        // 422 Pydantic 校验
        code = 'VALIDATION_FAILED'
        msg = body.detail.map(d => d.msg).join('；')
        details = body.detail
      }
    }

    const friendly = (code && CODE_FRIENDLY[code]) || msg || HTTP_FALLBACK[status] || `请求失败（${status || '网络错误'}）`

    // ENDPOINT_RETIRED：详细显示后继路径
    if (code === 'ENDPOINT_RETIRED') {
      const suc = details && details.successor
      const sucText = Array.isArray(suc) ? suc.join(' + ') : (suc || '')
      Message({
        message: `接口已下线${sucText ? '，请改用 ' + sucText : ''}`,
        type: 'warning',
        duration: 8000
      })
    } else {
      Message({ message: friendly, type: 'error', duration: 5000 })
    }

    return Promise.reject(buildApiError(code, msg || friendly, details, status))
  }
)

function buildApiError(code, message, details, status) {
  return new ApiError(code || 'UNKNOWN', message || '未知错误', details, status)
}

export default instance
