import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 知识库版本管理 + 教学提示（Feature-006 / Feature-015 / Feature-017）
// ─────────────────────────────────────────────────────────────

// ── 知识库版本 ──

export function listKnowledgeBaseVersions(params) {
  return request({ url: '/api/v1/knowledge-base/versions', method: 'get', params })
}

export function getKnowledgeBaseVersion(version) {
  return request({ url: `/api/v1/knowledge-base/${version}`, method: 'get' })
}

export function approveKnowledgeBaseVersion(version, data) {
  return request({ url: `/api/v1/knowledge-base/${version}/approve`, method: 'post', data })
}

// ── 教学提示 ──
// tip_id 为 UUID

export function listTeachingTips(params) {
  return request({ url: '/api/v1/teaching-tips', method: 'get', params })
}

export function updateTeachingTip(tipId, data) {
  return request({ url: `/api/v1/teaching-tips/${tipId}`, method: 'patch', data })
}

export function deleteTeachingTip(tipId) {
  return request({ url: `/api/v1/teaching-tips/${tipId}`, method: 'delete' })
}

// 重新抽取某个专家视频任务的教学提示
export function extractTeachingTips(taskId) {
  return request({ url: `/api/v1/tasks/${taskId}/extract-tips`, method: 'post' })
}
