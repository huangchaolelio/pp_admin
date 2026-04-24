import request from '@/utils/charPpRequest'

export function listTasks(params) {
  return request({ url: '/api/v1/tasks', method: 'get', params })
}

export function getTaskDetail(taskId) {
  return request({ url: `/api/v1/tasks/${taskId}`, method: 'get' })
}
