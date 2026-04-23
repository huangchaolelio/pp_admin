import request from '@/utils/charPpRequest'

export function listStandards() {
  return request({ url: '/api/v1/standards', method: 'get' })
}

export function getStandard(techCategory) {
  return request({ url: `/api/v1/standards/${techCategory}`, method: 'get' })
}

export function buildStandard(data) {
  return request({ url: '/api/v1/standards/build', method: 'post', data })
}
