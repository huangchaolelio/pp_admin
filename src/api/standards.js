import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 技术标准（Feature-010 / Feature-017）
// ─────────────────────────────────────────────────────────────

export function listStandards(params) {
  return request({ url: '/api/v1/standards', method: 'get', params })
}

export function getStandard(techCategory) {
  return request({ url: `/api/v1/standards/${encodeURIComponent(techCategory)}`, method: 'get' })
}

// 触发基于当前 KB 的新一轮技术标准构建（异步）
export function buildStandard(data) {
  return request({ url: '/api/v1/standards/build', method: 'post', data })
}
