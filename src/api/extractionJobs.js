import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 知识库提取作业（Feature-014 DAG 流水线 + Feature-017）
// job_id 为 UUID
// ─────────────────────────────────────────────────────────────

// 分页列表（meta 含 page/page_size/total）
// params: { page?, page_size?, status? }
//   status: pending | running | success | failed
export function listExtractionJobs(params) {
  return request({ url: '/api/v1/extraction-jobs', method: 'get', params })
}

// 单作业详情（含 6 个子任务清单 + progress + conflict_count）
export function getExtractionJob(jobId) {
  return request({ url: `/api/v1/extraction-jobs/${jobId}`, method: 'get' })
}

// 重跑失败作业
// data: { force_from_scratch?: boolean }
export function rerunExtractionJob(jobId, data) {
  return request({
    url: `/api/v1/extraction-jobs/${jobId}/rerun`,
    method: 'post',
    data: data || {}
  })
}
