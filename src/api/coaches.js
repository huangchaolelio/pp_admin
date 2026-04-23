import request from '@/utils/charPpRequest'

export function listCoaches(params) {
  return request({ url: '/api/v1/coaches', method: 'get', params })
}

export function createCoach(data) {
  return request({ url: '/api/v1/coaches', method: 'post', data })
}

export function updateCoach(id, data) {
  return request({ url: `/api/v1/coaches/${id}`, method: 'patch', data })
}

export function deleteCoach(id) {
  return request({ url: `/api/v1/coaches/${id}`, method: 'delete' })
}

export function assignCoachToTask(taskId, data) {
  return request({ url: `/api/v1/tasks/${taskId}/coach`, method: 'patch', data })
}
