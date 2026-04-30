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
      <el-table-column label="操作" width="260" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button size="mini" type="primary" @click="handleViewDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === 'success' && row.analysis_task_id"
            size="mini"
            type="success"
            :loading="tipsExtractingId === row.analysis_task_id"
            icon="el-icon-magic-stick"
            @click="handleExtractTips(row)"
          >抽取教学提示</el-button>
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

        <h4 class="section-title">
          子任务（DAG）
          <span class="section-hint">作业执行概览，点击每行左侧箭头可展开查看该步骤的详细 output_summary</span>
        </h4>
        <el-table :data="detail.steps" border size="small" class="step-table">
          <el-table-column type="expand" width="36">
            <template slot-scope="{ row }">
              <div class="step-expand">
                <!-- 关键指标高亮条 -->
                <div v-if="row.output_summary" class="highlight-bar">
                  <span class="highlight-bar-label">关键指标：</span>
                  <el-tag
                    v-for="(m, idx) in stepHighlights(row)"
                    :key="idx"
                    size="mini"
                    type="info"
                    effect="plain"
                    class="highlight-tag"
                  >{{ m }}</el-tag>
                  <span v-if="!stepHighlights(row).length" style="color:#C0C4CC">—</span>
                </div>

                <!-- 基础信息 -->
                <el-descriptions :column="3" size="small" border class="step-desc">
                  <el-descriptions-item label="开始时间">{{ formatDate(row.started_at) }}</el-descriptions-item>
                  <el-descriptions-item label="完成时间">{{ formatDate(row.completed_at) }}</el-descriptions-item>
                  <el-descriptions-item label="重试次数">{{ row.retry_count || 0 }}</el-descriptions-item>
                  <el-descriptions-item label="artifact 路径" :span="3">
                    <span v-if="row.output_artifact_path" class="mono cell-path">{{ row.output_artifact_path }}</span>
                    <span v-else style="color:#C0C4CC">—</span>
                  </el-descriptions-item>
                  <el-descriptions-item v-if="row.error_message" label="错误信息" :span="3">
                    <span class="err-msg">{{ row.error_message }}</span>
                  </el-descriptions-item>
                </el-descriptions>

                <!-- output_summary 结构化展示 -->
                <div v-if="row.output_summary" class="summary-block">
                  <div class="summary-title">output_summary</div>

                  <!-- download_video -->
                  <el-descriptions
                    v-if="row.step_type === 'download_video'"
                    :column="3"
                    size="small"
                    border
                    class="summary-desc"
                  >
                    <el-descriptions-item label="视频预处理 Job">
                      <span v-if="row.output_summary.video_preprocessing_job_id" class="mono cell-path">
                        {{ row.output_summary.video_preprocessing_job_id }}
                      </span>
                      <span v-else style="color:#C0C4CC">—</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="分片总数">{{ row.output_summary.segments_total }}</el-descriptions-item>
                    <el-descriptions-item label="已下载分片">{{ row.output_summary.segments_downloaded }}</el-descriptions-item>
                    <el-descriptions-item label="本地缓存命中">{{ row.output_summary.local_cache_hits }}</el-descriptions-item>
                    <el-descriptions-item label="COS 下载数">{{ row.output_summary.cos_downloads }}</el-descriptions-item>
                    <el-descriptions-item label="音频已下载">
                      <el-tag :type="row.output_summary.audio_downloaded ? 'success' : 'info'" size="mini">
                        {{ row.output_summary.audio_downloaded ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                  </el-descriptions>

                  <!-- pose_analysis -->
                  <el-descriptions
                    v-else-if="row.step_type === 'pose_analysis'"
                    :column="3"
                    size="small"
                    border
                    class="summary-desc"
                  >
                    <el-descriptions-item label="引擎">{{ row.output_summary.backend }}</el-descriptions-item>
                    <el-descriptions-item label="分辨率">{{ row.output_summary.resolution }}</el-descriptions-item>
                    <el-descriptions-item label="FPS">{{ row.output_summary.fps }}</el-descriptions-item>
                    <el-descriptions-item label="视频时长(秒)">{{ row.output_summary.video_duration_sec }}</el-descriptions-item>
                    <el-descriptions-item label="关键点帧数">{{ row.output_summary.keypoints_frame_count }}</el-descriptions-item>
                    <el-descriptions-item label="已处理分片">{{ row.output_summary.segments_processed }}</el-descriptions-item>
                    <el-descriptions-item label="检出分片">{{ row.output_summary.detected_segments }}</el-descriptions-item>
                    <el-descriptions-item label="失败分片">
                      <el-tag :type="row.output_summary.segments_failed > 0 ? 'danger' : 'success'" size="mini">
                        {{ row.output_summary.segments_failed }}
                      </el-tag>
                    </el-descriptions-item>
                  </el-descriptions>

                  <!-- audio_transcription -->
                  <el-descriptions
                    v-else-if="row.step_type === 'audio_transcription'"
                    :column="3"
                    size="small"
                    border
                    class="summary-desc"
                  >
                    <el-descriptions-item label="Whisper 模型">{{ row.output_summary.whisper_model }}</el-descriptions-item>
                    <el-descriptions-item label="运行设备">{{ row.output_summary.whisper_device }}</el-descriptions-item>
                    <el-descriptions-item label="音频来源">{{ row.output_summary.audio_source }}</el-descriptions-item>
                    <el-descriptions-item label="检测语种">{{ row.output_summary.language_detected }}</el-descriptions-item>
                    <el-descriptions-item label="SNR(dB)">
                      {{ row.output_summary.snr_db != null ? row.output_summary.snr_db.toFixed(2) : '—' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="质量标志">
                      <el-tag :type="row.output_summary.quality_flag === 'ok' ? 'success' : 'warning'" size="mini">
                        {{ row.output_summary.quality_flag }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="句子数">{{ row.output_summary.sentences_count }}</el-descriptions-item>
                    <el-descriptions-item label="转写字符数">{{ row.output_summary.transcript_chars }}</el-descriptions-item>
                    <el-descriptions-item label="是否跳过">
                      <el-tag :type="row.output_summary.skipped ? 'warning' : 'success'" size="mini">
                        {{ row.output_summary.skipped ? `跳过: ${row.output_summary.skip_reason || '—'}` : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                  </el-descriptions>

                  <!-- audio_kb_extract / visual_kb_extract -->
                  <template v-else-if="row.step_type === 'audio_kb_extract' || row.step_type === 'visual_kb_extract'">
                    <el-descriptions :column="3" size="small" border class="summary-desc">
                      <el-descriptions-item label="来源类型">{{ row.output_summary.source_type }}</el-descriptions-item>
                      <el-descriptions-item label="KB 条目数">
                        <el-tag type="primary" size="mini">{{ row.output_summary.kb_items_count }}</el-tag>
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.tech_category" label="技术类别">
                        {{ row.output_summary.tech_category }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.llm_model" label="LLM 模型">
                        {{ row.output_summary.llm_model }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.llm_backend" label="LLM 后端">
                        {{ row.output_summary.llm_backend }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.backend" label="后端">
                        {{ row.output_summary.backend }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.parsed_segments_total != null" label="已解析段数">
                        {{ row.output_summary.parsed_segments_total }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.segments_processed != null" label="已处理分片">
                        {{ row.output_summary.segments_processed }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.segments_skipped_low_confidence != null" label="低置信度跳过">
                        {{ row.output_summary.segments_skipped_low_confidence }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.dropped_low_confidence != null" label="丢弃(低置信)">
                        {{ row.output_summary.dropped_low_confidence }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.dropped_reference_notes != null" label="丢弃(参考笔记)">
                        {{ row.output_summary.dropped_reference_notes }}
                      </el-descriptions-item>
                      <el-descriptions-item v-if="row.output_summary.classifier_disagreements != null" label="分类器分歧">
                        {{ row.output_summary.classifier_disagreements }}
                      </el-descriptions-item>
                    </el-descriptions>

                    <div
                      v-if="row.output_summary.kb_items && row.output_summary.kb_items.length"
                      class="kb-items-block"
                    >
                      <div class="kb-items-title">
                        KB 知识点（{{ row.output_summary.kb_items.length }} 条）
                      </div>
                      <el-table :data="row.output_summary.kb_items" border size="mini">
                        <el-table-column label="#" type="index" width="40" align="center" />
                        <el-table-column label="维度" prop="dimension" min-width="140">
                          <template slot-scope="scope">
                            <span class="mono">{{ scope.row.dimension }}</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="动作类型" prop="action_type" min-width="140">
                          <template slot-scope="scope">
                            <span class="mono">{{ scope.row.action_type }}</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="min" width="90" align="right">
                          <template slot-scope="scope">{{ formatNum(scope.row.param_min) }}</template>
                        </el-table-column>
                        <el-table-column label="ideal" width="90" align="right">
                          <template slot-scope="scope">{{ formatNum(scope.row.param_ideal) }}</template>
                        </el-table-column>
                        <el-table-column label="max" width="90" align="right">
                          <template slot-scope="scope">{{ formatNum(scope.row.param_max) }}</template>
                        </el-table-column>
                        <el-table-column label="单位" prop="unit" width="70" align="center" />
                        <el-table-column label="来源" prop="source_type" width="80" align="center" />
                        <el-table-column label="置信度" width="90" align="center">
                          <template slot-scope="scope">
                            <span :style="{ color: confidenceColor(scope.row.extraction_confidence) }">
                              {{ (scope.row.extraction_confidence * 100).toFixed(1) }}%
                            </span>
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                    <div v-else class="empty-kb">该步骤未产出 KB 条目</div>
                  </template>

                  <!-- merge_kb -->
                  <el-descriptions
                    v-else-if="row.step_type === 'merge_kb'"
                    :column="3"
                    size="small"
                    border
                    class="summary-desc"
                  >
                    <el-descriptions-item label="KB 版本">
                      <el-tag v-if="row.output_summary.kb_version" type="success" size="mini" class="mono">
                        {{ row.output_summary.kb_version }}
                      </el-tag>
                      <span v-else style="color:#C0C4CC">—</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="合并条目数">{{ row.output_summary.merged_items }}</el-descriptions-item>
                    <el-descriptions-item label="写入技术点">{{ row.output_summary.inserted_tech_points }}</el-descriptions-item>
                    <el-descriptions-item label="冲突条目">
                      <el-tag :type="row.output_summary.conflict_items > 0 ? 'warning' : 'info'" size="mini">
                        {{ row.output_summary.conflict_items }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="降级模式">
                      <el-tag :type="row.output_summary.degraded_mode ? 'warning' : 'success'" size="mini">
                        {{ row.output_summary.degraded_mode ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="KB 标志已设置">
                      <el-tag :type="row.output_summary.kb_extracted_flag_set ? 'success' : 'info'" size="mini">
                        {{ row.output_summary.kb_extracted_flag_set ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                  </el-descriptions>

                  <!-- 未知 step_type 兜底 -->
                  <pre v-else class="raw-json">{{ JSON.stringify(row.output_summary, null, 2) }}</pre>

                  <!-- 原始 JSON 折叠区 -->
                  <el-collapse class="raw-collapse">
                    <el-collapse-item title="查看原始 JSON" name="raw">
                      <pre class="raw-json">{{ JSON.stringify(row.output_summary, null, 2) }}</pre>
                    </el-collapse-item>
                  </el-collapse>
                </div>

                <div v-else class="no-summary">无 output_summary 数据</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="#" type="index" width="40" align="center" />
          <el-table-column label="step_type" prop="step_type" min-width="140">
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

        <div v-if="detail.status === 'success' && detail.analysis_task_id" class="rerun-actions">
          <el-divider />
          <el-button
            type="success"
            icon="el-icon-magic-stick"
            :loading="tipsExtractingId === detail.analysis_task_id"
            @click="handleExtractTips(detail)"
          >抽取教学提示</el-button>
          <span class="hint-text">
            基于此作业已产出的 KB 知识点异步生成教学提示，完成后在
            <el-link type="primary" @click="$router.push('/knowledge-base/teaching-tips')">教学提示</el-link>
            页面查看。
          </span>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listExtractionJobs, getExtractionJob, rerunExtractionJob } from '@/api/extractionJobs'
import { extractTeachingTips } from '@/api/tasks'

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
      rerunningJobId: '',
      tipsExtractingId: ''
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
    async handleExtractTips(row) {
      const taskId = row.analysis_task_id
      if (!taskId) {
        this.$message.warning('该作业缺少 analysis_task_id，无法抽取教学提示')
        return
      }
      try {
        await this.$confirm(
          `将基于此作业的 KB 知识点异步抽取教学提示，完成后可前往「教学提示」页面查看。是否继续？`,
          '确认抽取',
          { type: 'info', confirmButtonText: '开始抽取', cancelButtonText: '取消' }
        )
      } catch (e) {
        return
      }
      this.tipsExtractingId = taskId
      try {
        await extractTeachingTips(taskId)
        this.$message.success('已提交抽取任务，完成后请前往「教学提示」页面查看')
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.tipsExtractingId = ''
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
    },
    formatNum(v) {
      if (v == null) return '—'
      if (typeof v !== 'number' || isNaN(v)) return v
      if (Number.isInteger(v)) return v
      const abs = Math.abs(v)
      if (abs >= 100) return v.toFixed(1)
      if (abs >= 1) return v.toFixed(3)
      return v.toFixed(4)
    },
    confidenceColor(conf) {
      const v = conf || 0
      if (v >= 0.9) return '#67C23A'
      if (v >= 0.7) return '#E6A23C'
      return '#F56C6C'
    },
    stepHighlights(row) {
      const s = row.output_summary
      if (!s) return []
      const pick = []
      switch (row.step_type) {
        case 'download_video':
          if (s.segments_total != null) pick.push(`分片 ${s.segments_downloaded}/${s.segments_total}`)
          if (s.audio_downloaded) pick.push('音频✓')
          if (s.local_cache_hits != null) pick.push(`缓存命中 ${s.local_cache_hits}`)
          break
        case 'pose_analysis':
          if (s.keypoints_frame_count != null) pick.push(`关键点帧 ${s.keypoints_frame_count}`)
          if (s.video_duration_sec != null) pick.push(`${s.video_duration_sec}s`)
          if (s.backend) pick.push(s.backend)
          if (s.resolution) pick.push(s.resolution)
          break
        case 'audio_transcription':
          if (s.skipped) { pick.push(`跳过: ${s.skip_reason || '—'}`); break }
          if (s.sentences_count != null) pick.push(`${s.sentences_count} 句`)
          if (s.transcript_chars != null) pick.push(`${s.transcript_chars} 字`)
          if (s.whisper_model) pick.push(s.whisper_model)
          if (s.snr_db != null) pick.push(`SNR ${s.snr_db.toFixed(1)}dB`)
          break
        case 'audio_kb_extract':
        case 'visual_kb_extract':
          pick.push(`KB ${s.kb_items_count || 0} 条`)
          if (s.dropped_low_confidence) pick.push(`丢弃低置信 ${s.dropped_low_confidence}`)
          if (s.classifier_disagreements) pick.push(`分歧 ${s.classifier_disagreements}`)
          if (s.tech_category) pick.push(s.tech_category)
          break
        case 'merge_kb':
          if (s.kb_version) pick.push(`KB v${s.kb_version}`)
          if (s.merged_items != null) pick.push(`合并 ${s.merged_items}`)
          if (s.conflict_items) pick.push(`冲突 ${s.conflict_items}`)
          if (s.degraded_mode) pick.push('降级模式')
          break
        default:
          Object.entries(s).slice(0, 3).forEach(([k, v]) => {
            if (typeof v !== 'object') pick.push(`${k}: ${v}`)
          })
      }
      return pick
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
.section-hint {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
  font-weight: normal;
}
.highlight-tag {
  margin: 0 4px 4px 0;
}
.step-expand {
  padding: 8px 16px 12px 16px;
  background: #fafbfc;
}
.highlight-bar {
  padding: 6px 10px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 12px;
  line-height: 1.8;
}
.highlight-bar-label {
  color: #409EFF;
  font-weight: 600;
  margin-right: 6px;
}
.step-desc {
  margin-bottom: 12px;
}
.summary-block {
  margin-top: 8px;
}
.summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}
.summary-desc {
  margin-bottom: 10px;
}
.kb-items-block {
  margin-top: 10px;
}
.kb-items-title {
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}
.empty-kb {
  padding: 8px 0;
  font-size: 12px;
  color: #909399;
}
.no-summary {
  color: #909399;
  font-size: 12px;
  padding: 8px 0;
}
.raw-collapse {
  margin-top: 8px;
  border-top: 1px dashed #ebeef5;
}
.raw-json {
  max-height: 300px;
  overflow: auto;
  background: #f5f7fa;
  padding: 8px;
  font-size: 12px;
  margin: 0;
}
.rerun-actions {
  text-align: right;
}
.hint-text {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
