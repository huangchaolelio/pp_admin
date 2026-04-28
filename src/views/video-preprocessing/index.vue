<template>
  <div class="app-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">视频预处理</h2>
        <div class="page-desc">
          Feature-016 视频预处理流水线：下载 → probe → 转码 → 分段 → 上传 COS。分段产物供后续 KB 提取复用，避免 OOM 与重复计算。
        </div>
      </div>
    </div>

    <!-- 提交区 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">
        <span class="card-title">提交预处理任务</span>
        <span class="card-desc">单条或批量提交已分类的教练视频进入预处理通道。</span>
      </div>
      <el-tabs v-model="submitMode">
        <el-tab-pane label="单条提交" name="single">
          <el-form ref="singleForm" :model="singleForm" label-width="120px" @submit.native.prevent>
            <el-form-item
              label="COS 对象 Key"
              prop="cos_object_key"
              :rules="[{ required: true, message: '请输入 cos_object_key', trigger: 'blur' }]"
            >
              <el-input
                v-model="singleForm.cos_object_key"
                placeholder="如 charhuang/tt_video/xxx/正手攻球.mp4"
                clearable
              />
            </el-form-item>
            <el-form-item label="force 覆盖">
              <el-switch v-model="singleForm.force" />
              <span class="form-hint">true 时将旧 success 作业置为 superseded，并删除旧 COS 分段对象</span>
            </el-form-item>
            <el-form-item label="幂等 Key">
              <el-input v-model="singleForm.idempotency_key" placeholder="可选，UUID 推荐" clearable />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="submitting"
                :disabled="charPpUnavailable"
                @click="handleSubmitSingle"
              >提交预处理</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="批量提交" name="batch">
          <el-form label-width="120px">
            <el-form-item label="COS 对象 Keys">
              <el-input
                v-model="batchKeysText"
                type="textarea"
                :rows="8"
                placeholder="每行一个 cos_object_key"
              />
              <div class="form-hint">共 {{ parsedBatchKeys.length }} 条，单次最多 100 条</div>
            </el-form-item>
            <el-form-item label="统一 force">
              <el-switch v-model="batchForce" />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="batchSubmitting"
                :disabled="!parsedBatchKeys.length || charPpUnavailable"
                @click="handleSubmitBatch"
              >批量提交 ({{ parsedBatchKeys.length }})</el-button>
            </el-form-item>
          </el-form>

          <!-- 批量提交结果 -->
          <div v-if="batchResults" class="batch-result">
            <el-alert
              :title="`submitted=${batchResults.submitted} / reused=${batchResults.reused} / failed=${batchResults.failed}`"
              :type="batchResults.failed ? 'warning' : 'success'"
              :closable="false"
              show-icon
            />
            <el-table :data="batchResults.results" border size="small" class="batch-result-table">
              <el-table-column label="COS 对象 Key" min-width="260">
                <template slot-scope="{ row }">
                  <span class="cell-path">{{ row.cos_object_key }}</span>
                </template>
              </el-table-column>
              <el-table-column label="Job ID" width="280">
                <template slot-scope="{ row }">
                  <span v-if="row.job_id" class="mono">{{ row.job_id }}</span>
                  <span v-else style="color:#C0C4CC">—</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="90" align="center">
                <template slot-scope="{ row }">
                  <el-tag
                    v-if="row.status"
                    :type="row.status === 'success' ? 'success' : 'primary'"
                    size="mini"
                  >{{ row.status }}{{ row.reused ? ' · reused' : '' }}</el-tag>
                  <el-tag v-else type="danger" size="mini">failed</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="错误" min-width="180">
                <template slot-scope="{ row }">
                  <span v-if="row.error_code" class="err-msg">[{{ row.error_code }}] {{ row.error_message }}</span>
                  <span v-else style="color:#C0C4CC">—</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" align="center">
                <template slot-scope="{ row }">
                  <el-button v-if="row.job_id" type="text" size="mini" @click="handleQueryJob(row.job_id)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 单条提交结果 -->
    <el-card v-if="lastSingleResult" shadow="never" class="section-card">
      <div slot="header">
        <span class="card-title">最近单条提交结果</span>
      </div>
      <el-descriptions :column="2" size="small" border>
        <el-descriptions-item label="Job ID">
          <span class="mono">{{ lastSingleResult.job_id }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="lastSingleResult.status === 'success' ? 'success' : 'primary'" size="mini">
            {{ lastSingleResult.status }}{{ lastSingleResult.reused ? ' · reused' : '' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="视频路径" :span="2">
          <span class="cell-path">{{ lastSingleResult.cos_object_key }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="分段数">{{ lastSingleResult.segment_count || '—' }}</el-descriptions-item>
        <el-descriptions-item label="含音频">{{ lastSingleResult.has_audio == null ? '—' : (lastSingleResult.has_audio ? '是' : '否') }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatDate(lastSingleResult.started_at) }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ formatDate(lastSingleResult.completed_at) }}</el-descriptions-item>
      </el-descriptions>
      <div style="margin-top: 12px; text-align: right">
        <el-button size="mini" type="primary" @click="handleQueryJob(lastSingleResult.job_id)">查看作业详情</el-button>
      </div>
    </el-card>

    <!-- 作业查询 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">
        <span class="card-title">查询作业详情</span>
        <span class="card-desc">输入预处理 job_id，查看原视频元数据、标准化参数、分段列表和音频。</span>
      </div>
      <el-form :inline="true" label-width="80px" @submit.native.prevent>
        <el-form-item label="Job ID">
          <el-input v-model="queryJobId" placeholder="UUID" clearable style="width: 360px" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="queryLoading"
            :disabled="!queryJobId || charPpUnavailable"
            @click="handleQueryJob(queryJobId)"
          >查询</el-button>
        </el-form-item>
      </el-form>

      <div v-if="jobDetail" class="job-detail">
        <el-descriptions :column="3" size="small" border>
          <el-descriptions-item label="Job ID">
            <span class="mono">{{ jobDetail.job_id }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="jobStatusType(jobDetail.status)" size="mini">{{ jobDetail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="force">{{ jobDetail.force ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="视频路径" :span="3">
            <span class="cell-path">{{ jobDetail.cos_object_key }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDate(jobDetail.started_at) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatDate(jobDetail.completed_at) }}</el-descriptions-item>
          <el-descriptions-item label="耗时">{{ formatDuration(jobDetail.duration_ms) }}</el-descriptions-item>
          <el-descriptions-item label="分段数">{{ jobDetail.segment_count || '—' }}</el-descriptions-item>
          <el-descriptions-item label="含音频">{{ jobDetail.has_audio ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item v-if="jobDetail.error_message" label="错误" :span="3">
            <span class="err-msg">{{ jobDetail.error_message }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="jobDetail.original_meta" class="sub-section">
          <h4>原视频元数据</h4>
          <el-descriptions :column="4" size="small" border>
            <el-descriptions-item label="fps">{{ jobDetail.original_meta.fps || '—' }}</el-descriptions-item>
            <el-descriptions-item label="分辨率">
              {{ jobDetail.original_meta.width }}×{{ jobDetail.original_meta.height }}
            </el-descriptions-item>
            <el-descriptions-item label="时长">{{ formatDuration(jobDetail.original_meta.duration_ms) }}</el-descriptions-item>
            <el-descriptions-item label="编码">{{ jobDetail.original_meta.codec || '—' }}</el-descriptions-item>
            <el-descriptions-item label="文件大小">{{ formatSize(jobDetail.original_meta.size_bytes) }}</el-descriptions-item>
            <el-descriptions-item label="含音频">{{ jobDetail.original_meta.has_audio ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="jobDetail.target_standard" class="sub-section">
          <h4>标准化参数</h4>
          <el-descriptions :column="3" size="small" border>
            <el-descriptions-item label="目标 fps">{{ jobDetail.target_standard.target_fps }}</el-descriptions-item>
            <el-descriptions-item label="短边">{{ jobDetail.target_standard.target_short_side }}</el-descriptions-item>
            <el-descriptions-item label="分段时长(秒)">{{ jobDetail.target_standard.segment_duration_s }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="jobDetail.audio" class="sub-section">
          <h4>音频产物</h4>
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="COS Key">
              <span class="cell-path">{{ jobDetail.audio.cos_object_key }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="大小">{{ formatSize(jobDetail.audio.size_bytes) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="jobDetail.segments && jobDetail.segments.length" class="sub-section">
          <h4>分段列表（{{ jobDetail.segments.length }} 段）</h4>
          <el-table :data="jobDetail.segments" border size="small">
            <el-table-column label="#" prop="segment_index" width="60" align="center" />
            <el-table-column label="起始(ms)" prop="start_ms" width="120" align="right" />
            <el-table-column label="结束(ms)" prop="end_ms" width="120" align="right" />
            <el-table-column label="时长">
              <template slot-scope="{ row }">{{ formatDuration(row.end_ms - row.start_ms) }}</template>
            </el-table-column>
            <el-table-column label="大小" width="110" align="right">
              <template slot-scope="{ row }">{{ formatSize(row.size_bytes) }}</template>
            </el-table-column>
            <el-table-column label="COS Key" min-width="260">
              <template slot-scope="{ row }">
                <span class="cell-path">{{ row.cos_object_key }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  submitPreprocessing,
  submitPreprocessingBatch,
  getPreprocessingJob
} from '@/api/videoPreprocessing'

const JOB_STATUS_TYPE = {
  success: 'success',
  failed: 'danger',
  running: 'primary',
  superseded: 'info'
}

export default {
  name: 'VideoPreprocessingIndex',
  data() {
    return {
      submitMode: 'single',
      singleForm: { cos_object_key: '', force: false, idempotency_key: '' },
      submitting: false,
      lastSingleResult: null,
      batchKeysText: '',
      batchForce: false,
      batchSubmitting: false,
      batchResults: null,
      queryJobId: '',
      queryLoading: false,
      jobDetail: null
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable }),
    parsedBatchKeys() {
      return this.batchKeysText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }
  },
  methods: {
    async handleSubmitSingle() {
      this.$refs.singleForm.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            cos_object_key: this.singleForm.cos_object_key,
            force: this.singleForm.force
          }
          if (this.singleForm.idempotency_key) {
            payload.idempotency_key = this.singleForm.idempotency_key
          }
          const { data } = await submitPreprocessing(payload)
          this.lastSingleResult = data
          this.$message.success(data && data.reused ? '命中已有作业（reused）' : '提交成功')
        } catch (e) {
          // 拦截器已提示
        } finally {
          this.submitting = false
        }
      })
    },
    async handleSubmitBatch() {
      if (!this.parsedBatchKeys.length) return
      if (this.parsedBatchKeys.length > 100) {
        this.$message.warning('单批最多 100 条')
        return
      }
      this.batchSubmitting = true
      this.batchResults = null
      try {
        const payload = {
          items: this.parsedBatchKeys.map(k => ({
            cos_object_key: k,
            force: this.batchForce
          }))
        }
        const { data } = await submitPreprocessingBatch(payload)
        this.batchResults = data
        const submitted = (data && data.submitted) || 0
        const reused = (data && data.reused) || 0
        const failed = (data && data.failed) || 0
        this.$message.success(`已处理 ${submitted} 条（reused=${reused}, failed=${failed}）`)
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.batchSubmitting = false
      }
    },
    async handleQueryJob(jobId) {
      if (!jobId) return
      this.queryJobId = jobId
      this.queryLoading = true
      this.jobDetail = null
      try {
        const { data } = await getPreprocessingJob(jobId)
        this.jobDetail = data
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.queryLoading = false
      }
    },
    jobStatusType(status) {
      return JOB_STATUS_TYPE[status] || 'info'
    },
    formatDate(isoStr) {
      if (!isoStr) return '—'
      return isoStr.replace('T', ' ').substring(0, 19)
    },
    formatDuration(ms) {
      if (ms == null) return '—'
      if (ms < 1000) return `${ms}ms`
      const sec = ms / 1000
      if (sec < 60) return `${sec.toFixed(1)}s`
      const min = Math.floor(sec / 60)
      const remain = Math.round(sec % 60)
      return `${min}m${remain}s`
    },
    formatSize(bytes) {
      if (bytes == null) return '—'
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
      return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
    }
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.page-title {
  margin: 0 0 4px 0;
  font-size: 18px;
}
.page-desc {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
.section-card {
  margin-bottom: 16px;
}
.card-title {
  font-weight: 600;
  margin-right: 10px;
}
.card-desc {
  color: #909399;
  font-size: 12px;
}
.form-hint {
  color: #909399;
  font-size: 12px;
  margin-left: 8px;
}
.mono {
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}
.cell-path {
  display: block;
  word-break: break-all;
  line-height: 1.5;
  font-size: 12px;
  color: #606266;
}
.err-msg {
  color: #F56C6C;
  font-size: 12px;
  word-break: break-all;
}
.batch-result {
  margin-top: 16px;
}
.batch-result-table {
  margin-top: 10px;
}
.sub-section {
  margin-top: 16px;
}
.sub-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: #303133;
}
</style>
