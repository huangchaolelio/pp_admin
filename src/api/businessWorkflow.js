import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 业务流程总览（Feature-018 US1）
// 契约（docs/business-workflow.md § 7.6）：
//   GET /api/v1/business-workflow/overview?window_hours=1..168
//
// 响应信封 data 结构：
//   {
//     TRAINING:         { phase, steps: { scan_cos_videos: {...}, preprocess_video: {...}, ... } },
//     STANDARDIZATION:  { phase, steps: { review_conflicts: {...}, kb_version_activate: {...}, ... } },
//     INFERENCE:        { phase, steps: { diagnose_athlete: {...} } }
//   }
//
// 每个 step 对象字段：
//   { total, pending, processing, success, failed,
//     p50_seconds?, p95_seconds?,   // 降级档会省略
//     recent_24h_completed }
//
// meta 信封字段：
//   { generated_at, window_hours, degraded, degraded_reason? }
// ─────────────────────────────────────────────────────────────

export function getWorkflowOverview(params) {
  return request({
    url: '/api/v1/business-workflow/overview',
    method: 'get',
    params
  })
}
