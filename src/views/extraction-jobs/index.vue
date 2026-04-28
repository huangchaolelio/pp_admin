<template>
  <div class="app-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">KB 提取作业</h2>
        <div class="page-desc">Feature-014 知识库提取 DAG 流水线作业列表；每个作业含 6 个子任务（视频下载 / 姿态分析 / 音频转写 / 视觉提炼 / 音频提炼 / 合并落库）。</div>
      </div>
      <div>
        <el-button icon="el-icon-refresh" :disabled="charPpUnavailable" @click="fetchList">刷新</el-button>
      </div>
    </div>

    <div class="filter-container">
      <el-select
        v-model="filter.status"
        placeholder="作业状态"
        clearable
        style="width: 160px"
        @change="handleFilterChange"
      >
        <el-option label="全部" value="" />
        <el-option label="pending" value="pending" />
        <el-option label="running" value="running" />
        <el-option label="success" value="success" />
        <el-option label="failed" value="failed" />
      </el-select>
    </div>

    <el-table
      v-loading="listLoading"
      :data="list"
      border
      fit
      highlight-current-row
      style="width: 100%"
    >
      <el-table-column label="Job ID" min-width="280">
        <template slot-scope="{ row }">
          <span class="mono">{{ row.job_id }}</span>
        </template>
      </el-table-column>
      <el-table-column label="视频路径" min-width="220">
        <template slot-scope="{ row }">
          <span class="cell-path">{{ row.cos_object_key }}</span>
        </template>
      </el-table-column>
      <el-table-column label="技术类别" prop="tech_category" width="120" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="冲突数" width="80" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.conflict_count > 0" type="warning" size="small">{{ row.conflict_count }}</el-tag>
          <span v-else style="color:#C0C4CC">—</span>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="耗时" width="100" align="center">
        <template slot-scope="{ row }">{{ formatDuration(row.duration_ms) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button size="mini" type="primary" @click="handleViewDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === 'failed'"
            size="mini"
            type="warning"
            :loading="rerunningJobId === row.job_id"
            @click="handleRerun(row)"
          >重跑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; text-align: right"
      :current-page="currentPage"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handlePageChange"
      @size-change="handlePageSizeChange"
    />

    <!-- 作业详情 Drawer -->
    <el-drawer
      title="作业详情"
      :visible.sync="detailVisible"
      size="760px"
      direction="rtl"
    >
      <div v-if="detail" class="detail-content">
        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="Job ID"><span class="mono">{{ detail.job_id }}</span></el-descriptions-item>
          <el-descriptions-item label="Task ID"><span class="mono">{{ detail.analysis_task_id }}</span></el-descriptions-item>
          <el-descriptions-item label="视频路径" :span="2">
            <span class="cell-path">{{ detail.cos_object_key }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="技术类别">{{ detail.tech_category }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(detail.status)" size="small">{{ detail.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="启用音频">{{ detail.enable_audio_analysis ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="音频语言">{{ detail.audio_language }}</el-descriptions-item>
          <el-descriptions-item label="force">{{ detail.force ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="Worker">{{ detail.worker_hostname || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detail.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDate(detail.started_at) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ formatDate(detail.completed_at) }}</el-descriptions-item>
          <el-descriptions-item label="冲突数">{{ detail.conflict_count }}</el-descriptions-item>
          <el-descriptions-item label="中间结果清理时间">{{ formatDate(detail.intermediate_cleanup_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.error_message" label="错误信息" :span="2">
            <span class="err-msg">{{ detail.error_message }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="progress-block">
          <div class="progress-header">
            <span>整体进度</span>
            <span class="progress-counts">
              success <b>{{ detail.progress.success_steps }}</b> /
              failed <b>{{ detail.progress.failed_steps }}</b> /
              skipped <b>{{ detail.progress.skipped_steps }}</b> /
              running <b>{{ detail.progress.running_steps }}</b> /
              pending <b>{{ detail.progress.pending_steps }}</b>
              共 {{ detail.progress.total_steps }}
            </span>
          </div>
          <el-progress
            :percentage="Math.round((detail.progress.percent || 0) * 100)"
            :status="detail.status === 'failed' ? 'exception' : (detail.status === 'success' ? 'success' : null)"
          />
        </div>

        <h4 class="section-title">子任务（DAG）</h4>
        <el-table :data="detail.steps" border size="small" class="step-table">
          <el-table-column label="#" type="index" width="40" align="center" />
          <el-table-column label="step_type" prop="step_type" min-width="150">
            <template slot-scope="{ row }">
              <span class="mono">{{ row.step_type }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="stepStatusType(row.status)" size="mini">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="依赖" min-width="140">
            <template slot-scope="{ row }">
              <span v-if="!row.depends_on || !row.depends_on.length" style="color:#C0C4CC">—</span>
              <el-tag
                v-for="dep in row.depends_on"
                :key="dep"
                type="info"
                size="mini"
                style="margin-right: 4px"
              >{{ dep }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="重试" prop="retry_count" width="60" align="center" />
          <el-table-column label="耗时" width="90" align="center">
            <template slot-scope="{ row }">{{ formatDuration(row.duration_ms) }}</template>
          </el-table-column>
          <el-table-column label="错误" min-width="180">
            <template slot-scope="{ row }">
              <span v-if="row.error_message" class="err-msg">{{ row.error_message }}</span>
              <span v-else style="color:#C0C4CC">—</span>
            </template>
          </el-table-column>
          <el-table-column label="输出" width="80" align="center">
            <template slot-scope="{ row }">
              <el-popover
                v-if="row.output_summary || row.output_artifact_path"
                placement="left"
                width="400"
                trigger="click"
              >
                <div class="output-pop">
                  <div v-if="row.output_artifact_path">
                    <b>artifact:</b> <span class="mono">{{ row.output_artifact_path }}</span>
                  </div>
                  <pre v-if="row.output_summary">{{ JSON.stringify(row.output_summary, null, 2) }}</pre>
                </div>
                <el-button slot="reference" type="text" size="mini">查看</el-button>
              </el-popover>
              <span v-else style="color:#C0C4CC">—</span>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="detail.status === 'failed'" class="rerun-actions">
          <el-divider />
          <el-button
            type="warning"
            :loading="rerunningJobId === detail.job_id"
            @click="handleRerun(detail)"
          >重跑（仅 failed+skipped）</el-button>
          <el-button
            type="danger"
            plain
            :loading="rerunningJobId === detail.job_id"
            @click="handleRerun(detail, true)"
          >从头重跑（force_from_scratch）</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listExtractionJobs, getExtractionJob, rerunExtractionJob } from '@/api/extractionJobs'

const STEP_STATUS_TYPE = {
  success: 'success',
  failed: 'danger',
  running: 'primary',
  pending: 'info',
  skipped: 'warning'
}

const JOB_STATUS_TYPE = {
  success: 'success',
  failed: 'danger',
  running: 'primary',
  pending: 'info'
}

export default {
  name: 'ExtractionJobsIndex',
  data() {
    return {
      list: [],
      total: 0,
      listLoading: false,
      currentPage: 1,
      pageSize: 20,
      filter: { status: '' },
      detailVisible: false,
      detail: null,
      rerunningJobId: ''
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable })
  },
  created() {
    this.fetchList().then(() => {
      // 支持通过 ?job=<uuid> 直接打开详情（从知识库版本页跳转）
      const jobId = this.$route.query.job
      if (jobId) this.handleViewDetail({ job_id: jobId })
    })
  },
  methods: {
    async fetchList() {
      this.listLoading = true
      const params = {
        page: this.currentPage,
        page_size: this.pageSize
      }
      if (this.filter.status) params.status = this.filter.status
      try {
        const { data, meta } = await listExtractionJobs(params)
        this.list = data || []
        this.total = (meta && meta.total) || 0
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.listLoading = false
      }
    },
    handleFilterChange() {
      this.currentPage = 1
      this.fetchList()
    },
    handlePageChange(val) {
      this.currentPage = val
      this.fetchList()
    },
    handlePageSizeChange(val) {
      this.pageSize = val
      this.currentPage = 1
      this.fetchList()
    },
    async handleViewDetail(row) {
      this.detail = null
      this.detailVisible = true
      try {
        const { data } = await getExtractionJob(row.job_id)
        this.detail = data
      } catch (e) {
        this.detailVisible = false
      }
    },
    async handleRerun(row, forceFromScratch = false) {
      const jobId = row.job_id
      const confirmMsg = forceFromScratch
        ? '将从头重跑整个作业（重置所有子任务为 pending），确认继续？'
        : '将重跑失败 + skipped 的子任务（保留已成功步骤的中间结果），确认继续？'
      try {
        await this.$confirm(confirmMsg, '确认重跑', {
          type: 'warning',
          confirmButtonText: '确认重跑',
          cancelButtonText: '取消'
        })
      } catch (e) {
        return
      }
      this.rerunningJobId = jobId
      try {
        const res = await rerunExtractionJob(jobId, {
          force_from_scratch: !!forceFromScratch
        })
        const resetCount = (res && res.reset_steps && res.reset_steps.length) || 0
        this.$message.success(`重跑已入队，重置 ${resetCount} 个子任务`)
        this.detailVisible = false
        this.fetchList()
      } catch (e) {
        // 409 等由拦截器提示
      } finally {
        this.rerunningJobId = ''
      }
    },
    statusTagType(status) {
      return JOB_STATUS_TYPE[status] || 'info'
    },
    stepStatusType(status) {
      return STEP_STATUS_TYPE[status] || 'info'
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
    }
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
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
.filter-container {
  margin-bottom: 12px;
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
.detail-content {
  padding: 0 16px 24px 16px;
}
.detail-desc {
  margin-bottom: 20px;
}
.progress-block {
  margin-bottom: 20px;
}
.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
  color: #606266;
}
.progress-counts b {
  color: #303133;
  margin: 0 2px;
}
.section-title {
  margin: 16px 0 8px;
  font-size: 14px;
  color: #303133;
}
.step-table {
  margin-bottom: 16px;
}
.output-pop pre {
  max-height: 300px;
  overflow: auto;
  background: #f5f7fa;
  padding: 8px;
  font-size: 12px;
}
.rerun-actions {
  text-align: right;
}
</style>
