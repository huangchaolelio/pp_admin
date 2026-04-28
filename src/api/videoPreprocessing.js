import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 视频预处理（Feature-016 + Feature-017）
// ─────────────────────────────────────────────────────────────

// 单条提交
// data: { cos_object_key: string, force?: boolean, idempotency_key?: string }
export function submitPreprocessing(data) {
  return request({ url: '/api/v1/tasks/preprocessing', method: 'post', data })
}

// 批量提交
// data: { items: [{ cos_object_key, force?, idempotency_key? }, ...] }
export function submitPreprocessingBatch(data) {
  return request({ url: '/api/v1/tasks/preprocessing/batch', method: 'post', data })
}

// 预处理作业元数据（原视频 + 标准化参数 + 分段列表 + 音频信息）
export function getPreprocessingJob(jobId) {
  return request({ url: `/api/v1/video-preprocessing/${jobId}`, method: 'get' })
}
