import request from '@/utils/charPpRequest'

export function listKnowledgeBase(params) {
  return request({ url: '/api/v1/knowledge_base', method: 'get', params })
}

export function listTeachingTips(params) {
  return request({ url: '/api/v1/teaching_tips', method: 'get', params })
}
