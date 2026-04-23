<template>
  <div class="app-container">
    <el-row :gutter="24">
      <!-- 诊断表单 -->
      <el-col :span="10">
        <el-card>
          <div slot="header"><span>提交动作诊断</span></div>
          <el-form ref="diagForm" :model="form" :rules="rules" label-width="90px">
            <el-form-item label="视频路径" prop="video_path">
              <el-input v-model="form.video_path" placeholder="请输入视频在 COS 中的路径" />
            </el-form-item>
            <el-form-item label="技术类别" prop="tech_category">
              <el-select v-model="form.tech_category" style="width: 100%">
                <el-option label="正手拉球 (forehand_topspin)" value="forehand_topspin" />
                <el-option label="反手推挡 (backhand_push)" value="backhand_push" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="diagLoading"
                :disabled="charPpUnavailable"
                @click="submitDiagnosis"
              >提交诊断</el-button>
              <el-button v-if="isTimeout" type="warning" @click="retryDiagnosis">点击重试</el-button>
            </el-form-item>
            <el-alert
              v-if="isTimeout"
              type="warning"
              title="请求超时（>60s），请检查视频是否有效后重试"
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
            <el-tag style="margin-left: 12px" type="primary">{{ techCategoryLabel(report.tech_category) }}</el-tag>
          </div>

          <!-- 综合评分 -->
          <div class="score-section">
            <el-progress
              type="circle"
              :percentage="report.overall_score"
              :color="scoreColor(report.overall_score)"
              :width="100"
            />
            <span class="score-label">综合评分</span>
          </div>

          <!-- 维度卡片 -->
          <div class="dimensions-section">
            <p class="section-title">各维度分析</p>
            <el-row :gutter="12">
              <el-col v-for="dim in report.dimensions" :key="dim.name" :span="12" style="margin-bottom: 12px">
                <el-card shadow="hover" class="dim-card">
                  <div class="dim-header">
                    <span class="dim-name">{{ dim.name }}</span>
                    <el-tag :type="deviationTagType(dim.deviation_level)" size="small">
                      {{ deviationLabel(dim.deviation_level) }}
                    </el-tag>
                  </div>
                  <el-table :data="dimTableData(dim)" border size="mini" style="margin-top: 8px">
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
          <div v-if="report.strengths && report.strengths.length" class="strengths-section">
            <p class="section-title">优点</p>
            <el-tag
              v-for="s in report.strengths"
              :key="s"
              type="success"
              style="margin: 0 8px 8px 0"
            >{{ s }}</el-tag>
          </div>

          <!-- 改进建议 -->
          <div v-if="report.improvements && report.improvements.length" class="improvements-section">
            <p class="section-title">总体改进建议</p>
            <el-alert
              v-for="(imp, i) in report.improvements"
              :key="i"
              :title="imp"
              type="info"
              show-icon
              :closable="false"
              style="margin-bottom: 8px"
            />
          </div>
        </el-card>

        <el-empty v-else-if="!diagLoading" description="提交诊断后将在此展示报告" />
      </el-col>
    </el-row>

    <!-- 全屏加载遮罩 -->
    <div v-if="diagLoading" v-loading="true" element-loading-text="正在分析动作，请稍候（最长约 60 秒）..." element-loading-background="rgba(0,0,0,0.6)" class="fullscreen-loading" />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { submitDiagnosis } from '@/api/diagnosis'
import axios from 'axios'

export default {
  name: 'DiagnosisIndex',
  data() {
    return {
      form: { video_path: '', tech_category: '' },
      rules: {
        video_path: [{ required: true, message: '请输入视频路径', trigger: 'blur' }],
        tech_category: [{ required: true, message: '请选择技术类别', trigger: 'change' }]
      },
      diagLoading: false,
      isTimeout: false,
      report: null
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable })
  },
  methods: {
    submitDiagnosis() {
      this.$refs.diagForm.validate(async(valid) => {
        if (!valid) return
        this.diagLoading = true
        this.isTimeout = false
        this.report = null
        try {
          const res = await submitDiagnosis({
            video_path: this.form.video_path,
            tech_category: this.form.tech_category
          })
          this.report = res.data || res
        } catch (e) {
          if (e.code === 'ECONNABORTED' || axios.isCancel(e)) {
            // 超时：保留表单输入
            this.isTimeout = true
          }
          // 其他错误已在拦截器中提示，表单不清空
        } finally {
          this.diagLoading = false
        }
      })
    },
    retryDiagnosis() {
      this.isTimeout = false
      this.submitDiagnosis()
    },
    scoreColor(score) {
      if (score >= 80) return '#67C23A'
      if (score >= 60) return '#E6A23C'
      return '#F56C6C'
    },
    deviationTagType(level) {
      const map = { normal: 'success', minor: 'warning', significant: 'danger' }
      return map[level] || 'info'
    },
    deviationLabel(level) {
      const map = { normal: '正常', minor: '轻度偏差', significant: '明显偏差' }
      return map[level] || level
    },
    techCategoryLabel(key) {
      const map = { forehand_topspin: '正手拉球', backhand_push: '反手推挡' }
      return map[key] || key
    },
    dimTableData(dim) {
      return [{
        measured: `${dim.measured_value}`,
        ideal: `${dim.ideal}`,
        range: `${dim.min} ~ ${dim.max}`
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
.score-label {
  font-size: 16px;
  color: #606266;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
}
.dim-card {
  height: 100%;
}
.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.dim-name {
  font-weight: 600;
  font-size: 13px;
}
.dim-suggestion {
  margin: 8px 0 0;
  font-size: 12px;
  color: #E6A23C;
  line-height: 1.5;
}
.dimensions-section { margin-bottom: 16px; }
.strengths-section { margin-bottom: 16px; }
.improvements-section { margin-bottom: 8px; }
.fullscreen-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
}
</style>
