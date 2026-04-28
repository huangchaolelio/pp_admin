import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 任务通道管理（Feature-013 + Feature-016 + Feature-017）
// 契约：
//   GET   /api/v1/task-channels              —— 全部通道实时快照
//   GET   /api/v1/task-channels/{task_type}  —— 单通道实时快照
//   PATCH /api/v1/admin/channels/{task_type} —— 热更新容量/并发/启停
//                                               （需 X-Admin-Token 头，30s 生效）
//
// task_type 枚举：
//   video_classification | kb_extraction | athlete_diagnosis | video_preprocessing
//
// ChannelSnapshot 字段：
//   { task_type, queue_capacity, concurrency,
//     current_pending, current_processing, remaining_slots,
//     enabled, recent_completion_rate_per_min }
// ─────────────────────────────────────────────────────────────

export function listChannels(params) {
  return request({ url: '/api/v1/task-channels', method: 'get', params })
}

export function getChannel(taskType) {
  return request({ url: `/api/v1/task-channels/${taskType}`, method: 'get' })
}

// body: { queue_capacity?: int>0&<=10000,
//         concurrency?:    int>0&<=64,
//         enabled?:        bool }
// adminToken 通过 X-Admin-Token 头发送（服务端 constant-time 比较）
export function patchChannelConfig(taskType, data, adminToken) {
  return request({
    url: `/api/v1/admin/channels/${taskType}`,
    method: 'patch',
    data,
    headers: { 'X-Admin-Token': adminToken || '' }
  })
}
