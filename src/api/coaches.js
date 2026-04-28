import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 教练 CRUD
// 契约：/api/v1/coaches（Feature-006 + Feature-017）
// id 为 UUID（字符串）
// ─────────────────────────────────────────────────────────────

export function listCoaches(params) {
  return request({ url: '/api/v1/coaches', method: 'get', params })
}

export function getCoach(coachId) {
  return request({ url: `/api/v1/coaches/${coachId}`, method: 'get' })
}

export function createCoach(data) {
  return request({ url: '/api/v1/coaches', method: 'post', data })
}

export function updateCoach(coachId, data) {
  return request({ url: `/api/v1/coaches/${coachId}`, method: 'patch', data })
}

export function deleteCoach(coachId) {
  return request({ url: `/api/v1/coaches/${coachId}`, method: 'delete' })
}
