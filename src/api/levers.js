import request from '@/utils/charPpRequest'

// ─────────────────────────────────────────────────────────────
// 优化杠杆台账（Feature-018 US3）
// 契约（docs/business-workflow.md § 9 三类杠杆）：
//   GET /api/v1/admin/levers?phase=TRAINING|STANDARDIZATION|INFERENCE
//   需 X-Admin-Token 头（与 /admin/channels 一致）
//
// 响应 data 结构：
//   {
//     runtime_params:    [ { key, current_value, source, effective_in_seconds,
//                            restart_scope, last_changed_at, last_changed_by,
//                            business_phase: string[], is_configured?, sensitive? }, ... ],
//     algorithm_models:  [ ... ],
//     rules_prompts:     [ ... ]
//   }
//
// 敏感项（VENUS_TOKEN / OPENAI_API_KEY / COS_SECRET_KEY / POSTGRES_PASSWORD）：
//   不返回 current_value，仅返回 is_configured: bool。
// ─────────────────────────────────────────────────────────────

export function listLevers(params, adminToken) {
  return request({
    url: '/api/v1/admin/levers',
    method: 'get',
    params,
    headers: adminToken ? { 'X-Admin-Token': adminToken } : undefined
  })
}
