import request from '@/utils/charPpRequest'

export function listKnowledgeBaseVersions(params) {
  return request({ url: '/api/v1/knowledge-base/versions', method: 'get', params })
}

export function listTeachingTips(params) {
  return request({ url: '/api/v1/teaching-tips', method: 'get', params })
}
