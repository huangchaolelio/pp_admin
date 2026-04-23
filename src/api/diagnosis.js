import request from '@/utils/charPpRequest'

export function submitDiagnosis(data) {
  return request({ url: '/api/v1/diagnosis', method: 'post', data, timeout: 65000 })
}
