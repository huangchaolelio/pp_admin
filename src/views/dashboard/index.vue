<template>
  <div class="char-pp-dashboard">
    <!-- 顶部标题 + 窗口选择 -->
    <div class="hello-bar">
      <div>
        <div class="title">乒乓 AI · 业务总览</div>
        <div class="sub">
          基于后端 <b>GET /api/v1/business-workflow/overview</b> 聚合：
          <el-tag size="mini" effect="plain" type="primary">TRAINING</el-tag>
          专家视频 → 知识库草稿 →
          <el-tag size="mini" effect="plain">STANDARDIZATION</el-tag>
          草稿 → 正式 →
          <el-tag size="mini" effect="plain" type="warning">INFERENCE</el-tag>
          标准落地给学员
        </div>
      </div>
      <div class="right-ops">
        <el-tag v-if="charPpUnavailable" type="danger" size="small">char_pp 服务不可用</el-tag>
        <el-tag v-else type="success" size="small">char_pp 在线</el-tag>
        <el-select v-model="windowHours" size="small" style="width:120px; margin:0 8px" @change="loadOverview">
          <el-option v-for="opt in WINDOW_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button size="small" icon="el-icon-refresh" :loading="overviewLoading" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <!-- 降级提示 -->
    <el-alert
      v-if="overviewMeta && overviewMeta.degraded"
      type="warning"
      show-icon
      :closable="false"
      title="聚合已降级：后端数据规模超阈值，已省略 P50 / P95 耗时字段"
      :description="`degraded_reason=${overviewMeta.degraded_reason || 'row_count_exceeds_latency_budget'}；性能目标：P95 ≤ 1s / P99 ≤ 2s`"
      style="margin-bottom:12px"
    />
    <el-alert
      v-if="overviewError"
      type="info"
      show-icon
      :closable="false"
      title="业务总览接口暂不可用，已回退到基础指标视图"
      :description="overviewError"
      style="margin-bottom:12px"
    />

    <!-- 三阶段卡片 -->
    <el-row v-loading="overviewLoading" :gutter="16" class="phase-row">
      <el-col v-for="p in BUSINESS_PHASES" :key="p.value" :xs="24" :md="8">
        <el-card class="phase-card" shadow="never" :body-style="{padding: 0}">
          <div class="phase-head" :style="{ background: p.color }" @click="goPhase(p.value)">
            <div class="phase-head-left">
              <i :class="p.icon" />
              <div>
                <div class="phase-name">{{ p.label }}</div>
                <div class="phase-code">{{ p.value }}</div>
              </div>
            </div>
            <div class="phase-head-right">
              <div class="phase-total">{{ formatInt(phaseTotals[p.value].total) }}</div>
              <div class="phase-total-hint">{{ windowHours }}h 累计</div>
            </div>
          </div>
          <div class="phase-counters">
            <div class="counter pending">
              <span class="n">{{ formatInt(phaseTotals[p.value].pending) }}</span><span class="l">待处理</span>
            </div>
            <div class="counter processing">
              <span class="n">{{ formatInt(phaseTotals[p.value].processing) }}</span><span class="l">处理中</span>
            </div>
            <div class="counter success">
              <span class="n">{{ formatInt(phaseTotals[p.value].success) }}</span><span class="l">已完成</span>
            </div>
            <div class="counter failed">
              <span class="n">{{ formatInt(phaseTotals[p.value].failed) }}</span><span class="l">失败</span>
            </div>
          </div>
          <div class="phase-steps">
            <div
              v-for="s in PHASE_STEP_MAP[p.value]"
              :key="s.value"
              class="step-row"
              @click="goStep(p.value, s.value)"
            >
              <div class="step-name">
                <span class="step-ord">{{ s.ordinal }}</span>
                <span>{{ s.label }}</span>
                <span class="step-code">{{ s.value }}</span>
              </div>
              <div class="step-metrics">
                <el-tooltip content="待处理" placement="top"><span class="badge pending">{{ formatInt(stepCounts(p.value, s.value).pending) }}</span></el-tooltip>
                <el-tooltip content="处理中" placement="top"><span class="badge processing">{{ formatInt(stepCounts(p.value, s.value).processing) }}</span></el-tooltip>
                <el-tooltip content="已完成" placement="top"><span class="badge success">{{ formatInt(stepCounts(p.value, s.value).success) }}</span></el-tooltip>
                <el-tooltip content="失败" placement="top"><span class="badge failed">{{ formatInt(stepCounts(p.value, s.value).failed) }}</span></el-tooltip>
                <el-tooltip v-if="stepCounts(p.value, s.value).p95_seconds != null" :content="`P50 ${formatSec(stepCounts(p.value, s.value).p50_seconds)} · P95 ${formatSec(stepCounts(p.value, s.value).p95_seconds)}`" placement="top">
                  <span class="badge p95">P95 {{ formatSec(stepCounts(p.value, s.value).p95_seconds) }}</span>
                </el-tooltip>
                <el-tooltip content="最近 24h 完成数" placement="top">
                  <span class="badge r24">24h {{ formatInt(stepCounts(p.value, s.value).recent_24h_completed) }}</span>
                </el-tooltip>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近任务 + 快捷入口 -->
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :xs="24" :lg="14">
        <el-card class="panel-card" shadow="never">
          <div slot="header" class="panel-header">
            <span>最近任务</span>
            <el-button type="text" @click="go('/tasks')">前往任务监控</el-button>
          </div>
          <el-table v-loading="recentTasksLoading" :data="recentTasks" size="small" :show-header="false">
            <el-table-column width="90">
              <template slot-scope="{ row }">
                <el-tag size="mini" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column width="100">
              <template slot-scope="{ row }">
                <el-tag size="mini" :type="phaseTagType(rowPhase(row))" effect="plain">{{ phaseShortLabel(rowPhase(row)) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column>
              <template slot-scope="{ row }">
                <span class="mono">{{ taskTypeLabel(row.task_type) }}</span>
                <span class="task-video">{{ row.cos_object_key || row.video_path || '' }}</span>
              </template>
            </el-table-column>
            <el-table-column width="110" align="right">
              <template slot-scope="{ row }">
                <span class="task-time">{{ formatRel(row.created_at) }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!recentTasks.length && !recentTasksLoading" class="empty-tip">暂无任务</div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card class="panel-card" shadow="never">
          <div slot="header" class="panel-header">
            <span>快捷入口</span>
          </div>
          <el-row :gutter="10">
            <el-col v-for="link in quickLinks" :key="link.path" :xs="12" :sm="8">
              <div class="quick-link" @click="go(link.path)">
                <i :class="link.icon" />
                <span>{{ link.title }}</span>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listTasks } from '@/api/tasks'
import { getWorkflowOverview } from '@/api/businessWorkflow'
import {
  BUSINESS_PHASES,
  PHASE_STEP_MAP,
  TASK_TYPE_PHASE_STEP,
  phaseTagType,
  phaseShortLabel
} from '@/utils/workflow'

const STATUS_TAG = {
  pending: 'info',
  processing: 'warning',
  success: 'success',
  partial_success: 'primary',
  failed: 'danger',
  rejected: 'danger'
}
const STATUS_LABEL = {
  pending: '待处理',
  processing: '处理中',
  success: '已完成',
  partial_success: '部分完成',
  failed: '失败',
  rejected: '已拒绝'
}
const TASK_TYPE_LABEL = {
  video_classification: '视频分类',
  kb_extraction: '知识库提取',
  athlete_diagnosis: '动作诊断',
  video_preprocessing: '视频预处理'
}
const WINDOW_OPTIONS = [
  { value: 1, label: '最近 1 小时' },
  { value: 6, label: '最近 6 小时' },
  { value: 24, label: '最近 24 小时' },
  { value: 72, label: '最近 3 天' },
  { value: 168, label: '最近 7 天' }
]

function emptyStep() {
  return { total: 0, pending: 0, processing: 0, success: 0, failed: 0, p50_seconds: null, p95_seconds: null, recent_24h_completed: 0 }
}

export default {
  name: 'Dashboard',
  data() {
    return {
      BUSINESS_PHASES,
      PHASE_STEP_MAP,
      WINDOW_OPTIONS,
      windowHours: 24,

      overview: null, // 后端返回的三阶段结构
      overviewMeta: null,
      overviewLoading: false,
      overviewError: '',

      recentTasks: [],
      recentTasksLoading: false,

      quickLinks: [
        { title: '教练管理', path: '/coaches', icon: 'el-icon-trophy' },
        { title: '视频分类', path: '/classifications', icon: 'el-icon-s-order' },
        { title: '视频预处理', path: '/video-preprocessing', icon: 'el-icon-film' },
        { title: 'KB 提取作业', path: '/extraction-jobs', icon: 'el-icon-share' },
        { title: '知识库版本', path: '/knowledge-base/list', icon: 'el-icon-collection' },
        { title: '教学提示', path: '/knowledge-base/teaching-tips', icon: 'el-icon-chat-line-round' },
        { title: '技术标准', path: '/standards', icon: 'el-icon-medal' },
        { title: '动作诊断', path: '/diagnosis', icon: 'el-icon-aim' },
        { title: '任务监控', path: '/tasks', icon: 'el-icon-time' },
        { title: '通道管理', path: '/channels', icon: 'el-icon-connection' },
        { title: '杠杆台账', path: '/levers', icon: 'el-icon-s-tools' }
      ]
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable }),
    // 每阶段的累计总数（用于卡片头部）
    phaseTotals() {
      const res = {}
      for (const p of BUSINESS_PHASES) {
        const steps = PHASE_STEP_MAP[p.value] || []
        const agg = { total: 0, pending: 0, processing: 0, success: 0, failed: 0 }
        for (const s of steps) {
          const c = this.stepCounts(p.value, s.value)
          agg.total += c.total || 0
          agg.pending += c.pending || 0
          agg.processing += c.processing || 0
          agg.success += c.success || 0
          agg.failed += c.failed || 0
        }
        res[p.value] = agg
      }
      return res
    }
  },
  mounted() {
    this.loadAll()
  },
  methods: {
    phaseTagType,
    phaseShortLabel,
    stepCounts(phase, step) {
      const node = this.overview && this.overview[phase] && this.overview[phase].steps && this.overview[phase].steps[step]
      if (!node) return emptyStep()
      return {
        total: node.total || 0,
        pending: node.pending || 0,
        processing: node.processing || 0,
        success: node.success || 0,
        failed: node.failed || 0,
        p50_seconds: node.p50_seconds,
        p95_seconds: node.p95_seconds,
        recent_24h_completed: node.recent_24h_completed || 0
      }
    },
    rowPhase(row) {
      if (row && row.business_phase) return row.business_phase
      const m = TASK_TYPE_PHASE_STEP[row && row.task_type]
      return m && m.phase
    },
    async loadAll() {
      this.loadOverview()
      this.loadTasks()
    },
    async loadOverview() {
      this.overviewLoading = true
      this.overviewError = ''
      try {
        const res = await getWorkflowOverview({ window_hours: this.windowHours })
        this.overview = res.data || null
        this.overviewMeta = res.meta || null
      } catch (e) {
        this.overview = null
        this.overviewMeta = null
        // 后端未部署 018 时不打扰用户，仅轻提示
        const msg = (e && e.message) || ''
        if (msg && !/canceled|aborted/i.test(msg)) {
          this.overviewError = '业务总览接口调用失败：' + msg
        }
      } finally {
        this.overviewLoading = false
      }
    },
    async loadTasks() {
      this.recentTasksLoading = true
      try {
        const { data } = await listTasks({ page: 1, page_size: 8, sort_by: 'created_at', order: 'desc' })
        this.recentTasks = data || []
      } catch (e) {
        this.recentTasks = []
      } finally {
        this.recentTasksLoading = false
      }
    },
    go(path) {
      this.$router.push(path).catch(() => {})
    },
    goPhase(phase) {
      this.$router.push({ path: '/tasks', query: { business_phase: phase }}).catch(() => {})
    },
    goStep(phase, step) {
      this.$router.push({ path: '/tasks', query: { business_phase: phase, business_step: step }}).catch(() => {})
    },
    statusTagType(s) { return STATUS_TAG[s] || 'info' },
    statusLabel(s) { return STATUS_LABEL[s] || s },
    taskTypeLabel(t) { return TASK_TYPE_LABEL[t] || t || '—' },
    formatInt(n) { return (n || 0).toLocaleString() },
    formatSec(v) {
      if (v == null) return '—'
      if (v < 1) return `${(v * 1000).toFixed(0)}ms`
      if (v < 60) return `${v.toFixed(1)}s`
      const m = Math.floor(v / 60); const s = Math.round(v % 60)
      return `${m}m${s}s`
    },
    formatRel(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      const diff = Date.now() - d.getTime()
      const min = Math.floor(diff / 60000)
      if (min < 1) return '刚刚'
      if (min < 60) return `${min} 分钟前`
      const hr = Math.floor(min / 60)
      if (hr < 24) return `${hr} 小时前`
      return iso.replace('T', ' ').substring(0, 16)
    }
  }
}
</script>

<style lang="scss" scoped>
.char-pp-dashboard {
  padding: 16px 20px;
}
.hello-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 14px;

  .title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
  .sub {
    color: #909399;
    font-size: 13px;
    margin-top: 4px;
  }
  .right-ops {
    display: flex;
    align-items: center;
  }
}

.phase-row {
  // 防 12 栅格错位时卡片下沉
}
.phase-card {
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}
.phase-head {
  color: #fff;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover { filter: brightness(1.06); }

  .phase-head-left {
    display: flex;
    align-items: center;

    i {
      font-size: 28px;
      margin-right: 12px;
      opacity: 0.9;
    }
    .phase-name { font-size: 16px; font-weight: 600; line-height: 1.2; }
    .phase-code { font-size: 11px; opacity: 0.75; margin-top: 2px; font-family: 'Menlo', monospace; }
  }
  .phase-head-right {
    text-align: right;
    .phase-total { font-size: 24px; font-weight: 600; line-height: 1; }
    .phase-total-hint { font-size: 11px; opacity: 0.8; margin-top: 4px; }
  }
}
.phase-counters {
  display: flex;
  background: #fafbfc;
  border-bottom: 1px solid #ebeef5;

  .counter {
    flex: 1;
    text-align: center;
    padding: 10px 0;
    border-right: 1px solid #ebeef5;

    &:last-child { border-right: none; }

    .n { display: block; font-size: 18px; font-weight: 600; line-height: 1; }
    .l { display: block; font-size: 11px; color: #909399; margin-top: 3px; }

    &.pending .n { color: #909399; }
    &.processing .n { color: #409EFF; }
    &.success .n { color: #67C23A; }
    &.failed .n { color: #F56C6C; }
  }
}
.phase-steps {
  padding: 6px 0 10px;

  .step-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    cursor: pointer;
    transition: background 0.12s ease;

    &:hover { background: #f5f7fa; }

    .step-name {
      display: flex;
      align-items: center;
      color: #303133;
      font-size: 13px;

      .step-ord {
        display: inline-block;
        width: 20px; height: 20px; line-height: 20px;
        text-align: center;
        background: #e8eefc;
        color: #409EFF;
        font-weight: 600;
        font-size: 11px;
        border-radius: 50%;
        margin-right: 8px;
      }
      .step-code {
        color: #C0C4CC;
        font-size: 11px;
        margin-left: 8px;
        font-family: 'Menlo', monospace;
      }
    }

    .step-metrics {
      .badge {
        display: inline-block;
        min-width: 24px;
        padding: 2px 7px;
        text-align: center;
        background: #f4f4f5;
        color: #606266;
        font-size: 11px;
        border-radius: 3px;
        margin-left: 4px;
        font-family: 'Menlo', monospace;
      }
      .badge.pending { color: #909399; }
      .badge.processing { color: #409EFF; }
      .badge.success { color: #67C23A; }
      .badge.failed { color: #F56C6C; background: #fef0f0; }
      .badge.p95 { background: #ecf5ff; color: #409EFF; }
      .badge.r24 { background: #f0f9eb; color: #67C23A; }
    }
  }
}

.panel-card { border-radius: 6px; }
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.mono {
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  margin-right: 6px;
  color: #606266;
}
.task-video { color: #909399; font-size: 12px; }
.task-time { color: #C0C4CC; font-size: 12px; }
.empty-tip { color: #C0C4CC; text-align: center; padding: 20px 0; font-size: 13px; }
.quick-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 6px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  margin-bottom: 8px;
  font-size: 13px;
  transition: background 0.15s ease, color 0.15s ease;

  i { font-size: 18px; margin-right: 6px; }
  &:hover { background: #409EFF; color: #fff; }
}
</style>
