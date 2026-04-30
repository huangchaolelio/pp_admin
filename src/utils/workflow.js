// ─────────────────────────────────────────────────────────────
// 业务阶段 / 业务步骤 单一事实源
//
// 与后端 specs/018-workflow-standardization 的 BusinessPhase / BusinessStep
// 严格对齐，同时镜像 docs/business-workflow.md § 2（三阶段）与 § 3–§ 5 八步骤。
//
// 任何涉及 business_phase / business_step 的 UI 展示、下拉选项、tag 颜色、
// 跨阶段矛盾校验，都必须从这里导入；禁止在业务页面里散落硬编码。
//
// 对应后端：
//   - GET /api/v1/business-workflow/overview      (返回 TRAINING/STANDARDIZATION/INFERENCE 三阶段)
//   - GET /api/v1/tasks?business_phase=...&business_step=...
//   - GET /api/v1/extraction-jobs?business_phase=...
//   - GET /api/v1/knowledge-base/versions?business_phase=...
// ─────────────────────────────────────────────────────────────

// ── 三阶段枚举 ──────────────────────────────────────────────
export const PHASE_TRAINING = 'TRAINING'
export const PHASE_STANDARDIZATION = 'STANDARDIZATION'
export const PHASE_INFERENCE = 'INFERENCE'

export const BUSINESS_PHASES = [
  {
    value: PHASE_TRAINING,
    label: '训练',
    shortLabel: '训练',
    color: '#409EFF',
    tagType: 'primary',
    icon: 'el-icon-video-camera',
    desc: '专家视频 → 知识库草稿（冷链路，可重跑）'
  },
  {
    value: PHASE_STANDARDIZATION,
    label: '建立标准',
    shortLabel: '建标',
    color: '#8e57e8',
    tagType: '', // 默认 tag 用主题色
    icon: 'el-icon-data-analysis',
    desc: '草稿 → 正式（门控：人审 + 规则把关）'
  },
  {
    value: PHASE_INFERENCE,
    label: '诊断',
    shortLabel: '诊断',
    color: '#E6A23C',
    tagType: 'warning',
    icon: 'el-icon-cpu',
    desc: '学员视频 → 诊断报告（热链路，只读低延迟）'
  }
]

const PHASE_META = BUSINESS_PHASES.reduce((m, p) => { m[p.value] = p; return m }, {})

// ── 八步骤枚举（与 § 5.1 完全对齐，generate_report 不独立）────────────
export const STEP_SCAN_COS_VIDEOS = 'scan_cos_videos'
export const STEP_PREPROCESS_VIDEO = 'preprocess_video'
export const STEP_CLASSIFY_VIDEO = 'classify_video'
export const STEP_EXTRACT_KB = 'extract_kb'
export const STEP_REVIEW_CONFLICTS = 'review_conflicts'
export const STEP_KB_VERSION_ACTIVATE = 'kb_version_activate'
export const STEP_BUILD_STANDARDS = 'build_standards'
export const STEP_DIAGNOSE_ATHLETE = 'diagnose_athlete'

export const BUSINESS_STEPS = [
  { value: STEP_SCAN_COS_VIDEOS, label: '素材归集', phase: PHASE_TRAINING, ordinal: 1 },
  { value: STEP_PREPROCESS_VIDEO, label: '视频预处理', phase: PHASE_TRAINING, ordinal: 2 },
  { value: STEP_CLASSIFY_VIDEO, label: '技术分类', phase: PHASE_TRAINING, ordinal: 3 },
  { value: STEP_EXTRACT_KB, label: '知识库抽取', phase: PHASE_TRAINING, ordinal: 4 },
  { value: STEP_REVIEW_CONFLICTS, label: '冲突审阅', phase: PHASE_STANDARDIZATION, ordinal: 5 },
  { value: STEP_KB_VERSION_ACTIVATE, label: 'KB 版本激活', phase: PHASE_STANDARDIZATION, ordinal: 6 },
  { value: STEP_BUILD_STANDARDS, label: '技术标准构建', phase: PHASE_STANDARDIZATION, ordinal: 7 },
  { value: STEP_DIAGNOSE_ATHLETE, label: '学员诊断', phase: PHASE_INFERENCE, ordinal: 8 }
]

const STEP_META = BUSINESS_STEPS.reduce((m, s) => { m[s.value] = s; return m }, {})

// ── 阶段 → 步骤列表索引 ────────────────────────────────────
export const PHASE_STEP_MAP = BUSINESS_PHASES.reduce((m, p) => {
  m[p.value] = BUSINESS_STEPS.filter(s => s.phase === p.value)
  return m
}, {})

// ── task_type → (phase, step) 静态映射，与 FR-002 迁移回填规则一致 ──
// 注：scan_cos_videos 与 classify_video 都对应 task_type=video_classification，
//     后端由 parent_scan_task_id 区分；前端只用作"弱提示"，真正值以后端返回为准。
export const TASK_TYPE_PHASE_STEP = {
  video_classification: { phase: PHASE_TRAINING, step: STEP_CLASSIFY_VIDEO }, // 大多数（子任务）
  video_preprocessing: { phase: PHASE_TRAINING, step: STEP_PREPROCESS_VIDEO },
  kb_extraction: { phase: PHASE_TRAINING, step: STEP_EXTRACT_KB },
  athlete_diagnosis: { phase: PHASE_INFERENCE, step: STEP_DIAGNOSE_ATHLETE }
}

// ── API：标签与颜色 ───────────────────────────────────────
export function phaseLabel(phase) {
  return (PHASE_META[phase] && PHASE_META[phase].label) || phase || '—'
}
export function phaseShortLabel(phase) {
  return (PHASE_META[phase] && PHASE_META[phase].shortLabel) || phase || '—'
}
export function phaseTagType(phase) {
  return (PHASE_META[phase] && PHASE_META[phase].tagType) || ''
}
export function phaseColor(phase) {
  return (PHASE_META[phase] && PHASE_META[phase].color) || '#909399'
}
export function phaseIcon(phase) {
  return (PHASE_META[phase] && PHASE_META[phase].icon) || 'el-icon-s-operation'
}
export function stepLabel(step) {
  return (STEP_META[step] && STEP_META[step].label) || step || '—'
}
export function stepOrdinal(step) {
  return (STEP_META[step] && STEP_META[step].ordinal) || 0
}

// ── phase/step 合法性 + 组合校验（对应 § 边界情况 INVALID_PHASE_STEP_COMBO）──
export function isValidPhase(phase) {
  return !!PHASE_META[phase]
}
export function isValidStep(step) {
  return !!STEP_META[step]
}
export function isValidPhaseStepCombo(phase, step) {
  if (!step) return true
  if (!STEP_META[step]) return false
  if (!phase) return true
  return STEP_META[step].phase === phase
}

// ── 组合筛选参数组装（交给 API 层）──────────────────────────
export function buildPhaseStepParams({ phase, step } = {}) {
  const params = {}
  if (phase) params.business_phase = phase
  if (step) params.business_step = step
  return params
}

// ── 阶段级下拉 option（Element Select 直接消费）────────────
export const PHASE_OPTIONS = BUSINESS_PHASES.map(p => ({ value: p.value, label: p.label }))

// 根据阶段动态收敛出步骤下拉；不传 phase 时返回全部 8 步
export function stepOptionsByPhase(phase) {
  if (!phase) return BUSINESS_STEPS.map(s => ({ value: s.value, label: `${s.ordinal}. ${s.label}` }))
  return (PHASE_STEP_MAP[phase] || []).map(s => ({ value: s.value, label: `${s.ordinal}. ${s.label}` }))
}
