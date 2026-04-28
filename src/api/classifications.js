import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 视频分类（Feature-008，Feature-017 统一信封）
// 契约：/api/v1/classifications
// ─────────────────────────────────────────────────────────────

// 分页列表
// params: { page?, page_size?, tech_category?, kb_extracted?, coach_name?, course_series? ... }
export function listClassifications(params) {
  return request({ url: '/api/v1/classifications', method: 'get', params })
}

// 统计摘要（按 tech_category 聚合）
export function getClassificationsSummary(params) {
  return request({ url: '/api/v1/classifications/summary', method: 'get', params })
}

// 触发全量扫描 COS（异步，返回 scan task_id）
export function scanClassifications(data) {
  return request({ url: '/api/v1/classifications/scan', method: 'post', data: data || {}})
}

// 查询扫描任务进度
export function getScanStatus(taskId) {
  return request({ url: `/api/v1/classifications/scan/${taskId}`, method: 'get' })
}

// 修改单条分类（⚠️ 路径参数改为记录 id，不再是 cos_object_key）
export function updateClassification(classificationId, data) {
  return request({
    url: `/api/v1/classifications/${classificationId}`,
    method: 'patch',
    data
  })
}
