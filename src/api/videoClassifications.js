import request from '@/utils/charPpRequest'

export function listClassifications(params) {
  return request({ url: '/api/v1/videos/classifications', method: 'get', params })
}

export function overrideClassification(cosObjectKey, data) {
  return request({
    url: `/api/v1/videos/classifications/${encodeURIComponent(cosObjectKey)}`,
    method: 'patch',
    data
  })
}

export function refreshClassifications() {
  return request({ url: '/api/v1/videos/classifications/refresh', method: 'post' })
}

export function batchSubmitKnowledgeExtraction(data) {
  return request({ url: '/api/v1/videos/classifications/batch-submit', method: 'post', data })
}
