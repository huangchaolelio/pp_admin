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
          <el-tag :type="jobStatusType(lastSingleResult.status)" size="mini">
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

    <!-- 作业列表 -->
    <el-card shadow="never" class="section-card">
      <div slot="header" class="list-header">
        <div>
          <span class="card-title">预处理作业列表</span>
          <span class="card-desc">按时间倒序浏览全部预处理 job，可按状态 / COS key 过滤。</span>
        </div>
        <div>
          <el-switch
            v-model="autoRefresh"
            active-text="自动刷新(10s)"
            @change="onAutoRefreshChange"
          />
          <el-button
            style="margin-left: 12px"
            icon="el-icon-refresh"
            size="small"
            :loading="listLoading"
            @click="fetchList"
          >刷新</el-button>
        </div>
      </div>

      <!-- 过滤条件 -->
      <el-form :inline="true" size="small" class="filter-form" @submit.native.prevent>
        <el-form-item label="状态">
          <el-select v-model="listQuery.status" clearable placeholder="全部" style="width:140px" @change="handleFilterChange">
            <el-option label="running" value="running" />
            <el-option label="success" value="success" />
            <el-option label="failed" value="failed" />
            <el-option label="superseded" value="superseded" />
          </el-select>
        </el-form-item>
        <el-form-item label="COS Key">
          <el-input
            v-model="listQuery.cos_object_key"
            placeholder="精确匹配"
            clearable
            style="width: 320px"
            @clear="handleFilterChange"
            @keyup.enter.native="handleFilterChange"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-select v-model="listQuery.sort_by" style="width:140px" @change="handleFilterChange">
            <el-option label="开始时间" value="started_at" />
            <el-option label="完成时间" value="completed_at" />
            <el-option label="创建时间" value="created_at" />
          </el-select>
          <el-select v-model="listQuery.order" style="width:90px; margin-left:6px" @change="handleFilterChange">
            <el-option label="倒序" value="desc" />
            <el-option label="正序" value="asc" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="small" @click="handleFilterChange">查询</el-button>
          <el-button size="small" @click="handleResetFilter">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 状态统计小胶囊 -->
      <div class="stats-row">
        <el-tag size="mini">共 {{ listTotal }} 条</el-tag>
        <el-tag v-if="statusCount.running" type="primary" size="mini">running {{ statusCount.running }}</el-tag>
        <el-tag v-if="statusCount.success" type="success" size="mini">success {{ statusCount.success }}</el-tag>
        <el-tag v-if="statusCount.failed" type="danger" size="mini">failed {{ statusCount.failed }}</el-tag>
        <el-tag v-if="statusCount.superseded" type="info" size="mini">superseded {{ statusCount.superseded }}</el-tag>
      </div>

      <el-table
        v-loading="listLoading"
        :data="jobList"
        border
        size="small"
        style="margin-top: 8px"
        :row-class-name="rowClassName"
      >
        <el-table-column label="Job ID" width="110">
          <template slot-scope="{ row }">
            <el-tooltip :content="row.job_id" placement="top">
              <span class="mono">{{ row.job_id.substring(0, 8) }}…</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="jobStatusType(row.status)" size="mini">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="视频文件" min-width="260">
          <template slot-scope="{ row }">
            <el-tooltip :content="row.cos_object_key" placement="top-start">
              <span class="cell-path">{{ shortCosKey(row.cos_object_key) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="分段" width="70" align="center">
          <template slot-scope="{ row }">{{ row.segment_count == null ? '—' : row.segment_count }}</template>
        </el-table-column>
        <el-table-column label="音频" width="70" align="center">
          <template slot-scope="{ row }">
            <i v-if="row.has_audio" class="el-icon-check" style="color:#67C23A" />
            <i v-else class="el-icon-close" style="color:#C0C4CC" />
          </template>
        </el-table-column>
        <el-table-column label="耗时" width="90" align="right">
          <template slot-scope="{ row }">{{ formatDuration(row.duration_ms) }}</template>
        </el-table-column>
        <el-table-column label="force" width="70" align="center">
          <template slot-scope="{ row }">
            <el-tag v-if="row.force" size="mini" type="warning">force</el-tag>
            <span v-else style="color:#C0C4CC">—</span>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" width="160">
          <template slot-scope="{ row }">{{ formatDate(row.started_at) }}</template>
        </el-table-column>
        <el-table-column label="完成时间" width="160">
          <template slot-scope="{ row }">{{ formatDate(row.completed_at) }}</template>
        </el-table-column>
        <el-table-column label="错误" min-width="180">
          <template slot-scope="{ row }">
            <el-tooltip v-if="row.error_message" :content="row.error_message" placement="top-start">
              <span class="err-msg">{{ shortError(row.error_message) }}</span>
            </el-tooltip>
            <span v-else style="color:#C0C4CC">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="handleQueryJob(row.job_id)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 12px; text-align: right"
        :current-page.sync="listQuery.page"
        :page-size.sync="listQuery.page_size"
        :page-sizes="[10, 20, 50, 100]"
        :total="listTotal"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="fetchList"
        @size-change="fetchList"
      />
    </el-card>

    <!-- 作业详情 -->
    <el-card shadow="never" class="section-card">
      <div slot="header">
        <span class="card-title">作业详情</span>
        <span class="card-desc">点击列表中的"详情"或手动输入 job_id。</span>
      </div>
      <el-form :inline="true" size="small" label-width="80px" @submit.native.prevent>
        <el-form-item label="Job ID">
          <el-input v-model="queryJobId" placeholder="UUID" clearable style="width: 360px" />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="small"
            :loading="queryLoading"
            :disabled="!queryJobId || charPpUnavailable"
            @click="handleQueryJob(queryJobId)"
          >查询</el-button>
          <el-button v-if="jobDetail" size="small" @click="jobDetail = null">清除</el-button>
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
  getPreprocessingJob,
  listPreprocessingJobs
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

      // 列表
      jobList: [],
      listTotal: 0,
      listLoading: false,
      listQuery: {
        page: 1,
        page_size: 20,
        status: '',
        cos_object_key: '',
        sort_by: 'started_at',
        order: 'desc'
      },
      autoRefresh: false,
      refreshTimer: null,

      // 详情
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
    },
    statusCount() {
      const counter = { running: 0, success: 0, failed: 0, superseded: 0 }
      this.jobList.forEach(j => {
        if (counter[j.status] != null) counter[j.status] += 1
      })
      return counter
    }
  },
  created() {
    this.fetchList()
  },
  beforeDestroy() {
    this.stopAutoRefresh()
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
          // 刷新列表
          this.fetchList()
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
        // 刷新列表
        this.fetchList()
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.batchSubmitting = false
      }
    },

    // 列表加载
    async fetchList() {
      this.listLoading = true
      try {
        const params = {
          page: this.listQuery.page,
          page_size: this.listQuery.page_size,
          sort_by: this.listQuery.sort_by,
          order: this.listQuery.order
        }
        if (this.listQuery.status) params.status = this.listQuery.status
        if (this.listQuery.cos_object_key) params.cos_object_key = this.listQuery.cos_object_key
        const { data, meta } = await listPreprocessingJobs(params)
        this.jobList = data || []
        this.listTotal = (meta && meta.total) || 0
      } catch (e) {
        this.jobList = []
        this.listTotal = 0
      } finally {
        this.listLoading = false
      }
    },
    handleFilterChange() {
      this.listQuery.page = 1
      this.fetchList()
    },
    handleResetFilter() {
      this.listQuery = {
        page: 1,
        page_size: this.listQuery.page_size,
        status: '',
        cos_object_key: '',
        sort_by: 'started_at',
        order: 'desc'
      }
      this.fetchList()
    },
    onAutoRefreshChange(val) {
      if (val) {
        this.refreshTimer = setInterval(() => {
          // 仅当未在加载时才触发
          if (!this.listLoading) this.fetchList()
        }, 10000)
      } else {
        this.stopAutoRefresh()
      }
    },
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },
    rowClassName({ row }) {
      if (row.status === 'failed') return 'row-failed'
      if (row.status === 'running') return 'row-running'
      return ''
    },
    shortCosKey(key) {
      if (!key) return '—'
      // 取最后两级路径展示
      const parts = key.split('/')
      if (parts.length <= 2) return key
      return '…/' + parts.slice(-2).join('/')
    },
    shortError(msg) {
      if (!msg) return ''
      return msg.length > 60 ? msg.substring(0, 60) + '…' : msg
    },

    // 详情
    async handleQueryJob(jobId) {
      if (!jobId) return
      this.queryJobId = jobId
      this.queryLoading = true
      this.jobDetail = null
      try {
        const { data } = await getPreprocessingJob(jobId)
        this.jobDetail = data
        // 滚动到详情区
        this.$nextTick(() => {
          const el = document.querySelector('.job-detail')
          if (el && el.scrollIntoView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        })
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
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filter-form {
  padding: 8px 0 0;
}
.stats-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.stats-row .el-tag {
  margin-right: 0;
}
</style>

<style>
/* 行高亮（非 scoped，保证作用于 el-table 内部） */
.el-table .row-failed td {
  background: #fef0f0 !important;
}
.el-table .row-running td {
  background: #ecf5ff !important;
}
</style>
