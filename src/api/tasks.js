import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 任务管理（Feature-013 / Feature-016 / Feature-017）
// 契约：/api/v1/tasks/*
// ─────────────────────────────────────────────────────────────

// 任务列表（分页，meta 包含 page/page_size/total）
// params: { page?, page_size?, task_type?, status?, coach_name?, sort_by?, order? }
export function listTasks(params) {
  return request({ url: '/api/v1/tasks', method: 'get', params })
}

export function getTaskDetail(taskId) {
  return request({ url: `/api/v1/tasks/${taskId}`, method: 'get' })
}

export function getTaskResult(taskId) {
  return request({ url: `/api/v1/tasks/${taskId}/result`, method: 'get' })
}

export function deleteTask(taskId) {
  return request({ url: `/api/v1/tasks/${taskId}`, method: 'delete' })
}

export function listCosVideos(params) {
  return request({ url: '/api/v1/tasks/cos-videos', method: 'get', params })
}

// ── Feature-013：分通道任务提交（单条 + 批量） ──

// 视频分类（coach video）
export function submitClassification(data) {
  return request({ url: '/api/v1/tasks/classification', method: 'post', data })
}
export function submitClassificationBatch(data) {
  return request({ url: '/api/v1/tasks/classification/batch', method: 'post', data })
}

// 知识库提取（Feature-014 扩展：支持 force）
export function submitKbExtraction(data) {
  return request({ url: '/api/v1/tasks/kb-extraction', method: 'post', data })
}
export function submitKbExtractionBatch(data) {
  return request({ url: '/api/v1/tasks/kb-extraction/batch', method: 'post', data })
}

// 运动员动作诊断（异步，替代旧的同步 /api/v1/diagnosis）
export function submitDiagnosisTask(data) {
  return request({ url: '/api/v1/tasks/diagnosis', method: 'post', data })
}
export function submitDiagnosisBatch(data) {
  return request({ url: '/api/v1/tasks/diagnosis/batch', method: 'post', data })
}

// ── Feature-015：教学提示抽取 ──
export function extractTeachingTips(taskId) {
  return request({ url: `/api/v1/tasks/${taskId}/extract-tips`, method: 'post' })
}

// ── 教练关联 ──
export function assignCoachToTask(taskId, data) {
  return request({ url: `/api/v1/tasks/${taskId}/coach`, method: 'patch', data })
}

// ── Feature-016：视频预处理端点见 api/videoPreprocessing.js ──
