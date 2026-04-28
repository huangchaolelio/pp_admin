<template>
  <div class="app-container">
    <el-row :gutter="24">
      <!-- 诊断表单 -->
      <el-col :span="10">
        <el-card>
          <div slot="header"><span>提交动作诊断</span></div>
          <el-form ref="diagForm" :model="form" :rules="rules" label-width="110px">
            <el-form-item label="视频路径" prop="video_storage_uri">
              <el-input v-model="form.video_storage_uri" placeholder="COS 对象键，例如 pytest/xxx.mp4" />
            </el-form-item>
            <el-form-item label="知识库版本">
              <el-input v-model="form.knowledge_base_version" placeholder="可选，留空使用最新版本" />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="submitting || polling"
                :disabled="charPpUnavailable"
                @click="handleSubmit"
              >提交诊断</el-button>
              <el-button v-if="taskId" @click="handleReset">重置</el-button>
            </el-form-item>
            <el-alert
              v-if="taskId && polling"
              type="info"
              :title="`任务已提交：${taskId.substring(0,8)}… 正在后台处理（每 3s 轮询一次）`"
              show-icon
              :closable="false"
              style="margin-top: 8px"
            />
            <el-alert
              v-if="errorText"
              type="error"
              :title="errorText"
              show-icon
              :closable="false"
              style="margin-top: 8px"
            />
          </el-form>
        </el-card>
      </el-col>

      <!-- 诊断报告 -->
      <el-col :span="14">
        <el-card v-if="report">
          <div slot="header">
            <span>诊断报告</span>
            <el-tag v-if="report.tech_category" style="margin-left:12px" type="primary">
              {{ report.tech_category }}
            </el-tag>
          </div>

          <!-- 综合评分 -->
          <div v-if="report.overall_score != null" class="score-section">
            <el-progress
              type="circle"
              :percentage="Math.round(report.overall_score)"
              :color="scoreColor(report.overall_score)"
              :width="100"
            />
            <span class="score-label">综合评分</span>
          </div>

          <!-- 各维度 -->
          <div v-if="report.dimensions && report.dimensions.length" class="dimensions-section">
            <p class="section-title">各维度分析</p>
            <el-row :gutter="12">
              <el-col v-for="dim in report.dimensions" :key="dim.name" :span="12" style="margin-bottom:12px">
                <el-card shadow="hover" class="dim-card">
                  <div class="dim-header">
                    <span class="dim-name">{{ dim.name }}</span>
                    <el-tag :type="deviationTagType(dim.deviation_level)" size="small">
                      {{ deviationLabel(dim.deviation_level) }}
                    </el-tag>
                  </div>
                  <el-table :data="dimTableData(dim)" border size="mini" style="margin-top:8px">
                    <el-table-column label="测量值" prop="measured" />
                    <el-table-column label="理想值" prop="ideal" />
                    <el-table-column label="范围" prop="range" />
                  </el-table>
                  <p v-if="dim.suggestion" class="dim-suggestion">💡 {{ dim.suggestion }}</p>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 优点 -->
          <div v-if="report.strengths && report.strengths.length" class="section">
            <p class="section-title">优点</p>
            <el-tag v-for="s in report.strengths" :key="s" type="success" style="margin:0 8px 8px 0">{{ s }}</el-tag>
          </div>

          <!-- 建议 -->
          <div v-if="report.improvements && report.improvements.length" class="section">
            <p class="section-title">总体改进建议</p>
            <el-alert
              v-for="(imp, i) in report.improvements"
              :key="i"
              :title="imp"
              type="info"
              show-icon
              :closable="false"
              style="margin-bottom:8px"
            />
          </div>
        </el-card>
        <el-empty v-else-if="!submitting && !polling" description="提交诊断后将在此展示报告" />
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { submitDiagnosisTask, getTaskDetail, getTaskResult } from '@/api/tasks'

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 10 * 60 * 1000 // 最多轮询 10 分钟

export default {
  name: 'DiagnosisIndex',
  data() {
    return {
      form: { video_storage_uri: '', knowledge_base_version: '' },
      rules: {
        video_storage_uri: [{ required: true, message: '请输入视频路径', trigger: 'blur' }]
      },
      submitting: false,
      polling: false,
      taskId: '',
      errorText: '',
      report: null,
      pollTimer: null,
      pollStartedAt: 0
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable })
  },
  beforeDestroy() {
    this.stopPolling()
  },
  methods: {
    handleReset() {
      this.stopPolling()
      this.taskId = ''
      this.report = null
      this.errorText = ''
    },
    stopPolling() {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer)
        this.pollTimer = null
      }
      this.polling = false
    },

    handleSubmit() {
      this.$refs.diagForm.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        this.errorText = ''
        this.report = null
        this.taskId = ''
        try {
          const { data } = await submitDiagnosisTask({
            video_storage_uri: this.form.video_storage_uri,
            knowledge_base_version: this.form.knowledge_base_version || null
          })
          // 批量接口返回 items[0]；单条接口可能直接返回；兼容两种
          const item = (data && data.items && data.items[0]) || data || {}
          const tid = item.task_id || item.existing_task_id
          if (!tid) {
            this.errorText = item.rejection_message || '未能提交：未获取到 task_id'
            return
          }
          this.taskId = tid
          this.startPolling()
        } catch (e) {
          // 拦截器已提示
        } finally {
          this.submitting = false
        }
      })
    },

    startPolling() {
      this.polling = true
      this.pollStartedAt = Date.now()
      this.pollOnce()
    },

    async pollOnce() {
      if (!this.taskId || !this.polling) return
      if (Date.now() - this.pollStartedAt > POLL_TIMEOUT_MS) {
        this.errorText = '诊断超时（>10 分钟），请到任务监控页查看详情'
        this.stopPolling()
        return
      }
      try {
        const { data: detail } = await getTaskDetail(this.taskId)
        const status = detail && detail.status
        if (status === 'success' || status === 'partial_success') {
          const { data: result } = await getTaskResult(this.taskId)
          this.report = result || {}
          this.stopPolling()
          return
        }
        if (status === 'failed' || status === 'rejected') {
          this.errorText = (detail && (detail.error_message || detail.rejection_reason)) ||
            `任务状态：${status}`
          this.stopPolling()
          return
        }
      } catch (e) {
        // 拦截器已提示；继续轮询（可能是临时网络抖动）
      }
      this.pollTimer = setTimeout(() => this.pollOnce(), POLL_INTERVAL_MS)
    },

    scoreColor(score) {
      if (score >= 80) return '#67C23A'
      if (score >= 60) return '#E6A23C'
      return '#F56C6C'
    },
    deviationTagType(level) {
      return ({ normal: 'success', minor: 'warning', significant: 'danger' })[level] || 'info'
    },
    deviationLabel(level) {
      return ({ normal: '正常', minor: '轻度偏差', significant: '明显偏差' })[level] || level
    },
    dimTableData(dim) {
      return [{
        measured: `${dim.measured_value != null ? dim.measured_value : '—'}`,
        ideal: `${dim.ideal != null ? dim.ideal : '—'}`,
        range: `${dim.min != null ? dim.min : '—'} ~ ${dim.max != null ? dim.max : '—'}`
      }]
    }
  }
}
</script>

<style scoped>
.score-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.score-label { font-size: 16px; color: #606266; }
.section-title { font-size: 14px; font-weight: 600; color: #303133; margin: 0 0 12px; }
.section { margin-bottom: 16px; }
.dim-card { height: 100%; }
.dim-header { display: flex; justify-content: space-between; align-items: center; }
.dim-name { font-weight: 600; font-size: 13px; }
.dim-suggestion { margin: 8px 0 0; font-size: 12px; color: #E6A23C; line-height: 1.5; }
.dimensions-section { margin-bottom: 16px; }
</style>
