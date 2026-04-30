<template>
  <div class="app-container">
    <div class="phase-head-tag">
      <el-tag size="mini" effect="plain" style="margin-right:6px">STANDARDIZATION / kb_version_activate</el-tag>
      <span class="phase-head-desc">
        知识库草稿 → 激活 → 归档（单 active 约束 + 冲突门控，见
        <code>docs/business-workflow.md § 4</code>）。
      </span>
    </div>
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="按状态过滤" clearable size="small" style="width: 140px" @change="onFilterChange" @clear="onFilterChange">
        <el-option label="草稿" value="draft" />
        <el-option label="已激活" value="active" />
        <el-option label="已归档" value="archived" />
      </el-select>
      <el-select v-model="filterTechCategory" placeholder="按原始动作分类过滤" clearable filterable size="small" style="width: 200px" @change="onFilterChange" @clear="onFilterChange">
        <el-option v-for="opt in techCategoryOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
      <el-button size="small" icon="el-icon-refresh" @click="fetchList">刷新</el-button>
      <span class="summary-hint">
        共 <b>{{ total }}</b> 个版本
        <template v-if="activeCount > 0">· <el-tag size="mini" type="success">{{ activeCount }} 个已激活</el-tag></template>
        <template v-if="draftCount > 0">· <el-tag size="mini" type="info">{{ draftCount }} 个草稿</el-tag></template>
      </span>
    </div>

    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row style="width: 100%">
      <el-table-column label="版本号" prop="version" width="140">
        <template slot-scope="{ row }">
          <el-link type="primary" @click="openDetail(row)">{{ row.version }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="原始动作分类" width="130" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.tech_category" size="small" type="warning" effect="plain">{{ actionTypeLabel(row.tech_category) }}</el-tag>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="识别动作（KB 提取）" min-width="200">
        <template slot-scope="{ row }">
          <el-tag
            v-for="t in row.action_types_covered"
            :key="t"
            size="small"
            style="margin-right: 4px; margin-bottom: 2px"
          >{{ actionTypeLabel(t) }}</el-tag>
          <span v-if="!row.action_types_covered || row.action_types_covered.length === 0" class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="来源作业" width="110" align="center">
        <template slot-scope="{ row }">
          <el-link v-if="row.job_id" type="primary" class="mono" @click="gotoJob(row.job_id)">{{ shortId(row.job_id) }}</el-link>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="技术点数" prop="point_count" width="90" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审批时间" width="170" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.approved_at) }}</template>
      </el-table-column>
      <el-table-column label="审批人" width="120" align="center">
        <template slot-scope="{ row }">
          <span :class="{ muted: !row.approved_by }">{{ row.approved_by || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" align="center">
        <template slot-scope="{ row }">
          <el-button size="mini" type="text" @click="openDetail(row)">详情</el-button>
          <el-button v-if="row.job_id" size="mini" type="text" @click="gotoJob(row.job_id)">作业</el-button>
          <el-button
            v-if="row.status === 'draft'"
            size="mini"
            type="text"
            style="color: #67c23a"
            @click="onApprove(row)"
          >激活</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; text-align: right"
      :current-page.sync="currentPage"
      :page-sizes="[10, 20, 50]"
      :page-size.sync="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <el-empty v-if="!listLoading && list.length === 0" description="暂无知识库版本。每次 KB 提取作业成功后会自动生成一个 draft 版本。" />

    <!-- 版本详情抽屉 -->
    <el-drawer :visible.sync="detailVisible" :title="detail ? `知识库版本 ${detail.version}` : '版本详情'" size="640px" direction="rtl">
      <div v-loading="detailLoading" class="detail-panel">
        <template v-if="detail">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="版本号">{{ detail.version }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(detail.status)" size="small">{{ statusLabel(detail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="原始动作分类">
              <el-tag v-if="detail.tech_category" size="mini" type="warning" effect="plain">{{ actionTypeLabel(detail.tech_category) }}</el-tag>
              <span v-else class="muted">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="来源作业">
              <el-link v-if="detail.job_id" type="primary" class="mono" @click="gotoJob(detail.job_id)">{{ shortId(detail.job_id) }}</el-link>
              <span v-else class="muted">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="技术点数">{{ detail.point_count }}</el-descriptions-item>
            <el-descriptions-item label="识别动作（KB 提取）">
              <el-tag v-for="t in detail.action_types_covered" :key="t" size="mini" style="margin-right: 4px">{{ actionTypeLabel(t) }}</el-tag>
              <span v-if="!detail.action_types_covered || detail.action_types_covered.length === 0" class="muted">—</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(detail.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="审批时间">{{ formatDate(detail.approved_at) }}</el-descriptions-item>
            <el-descriptions-item label="审批人" :span="2">{{ detail.approved_by || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.notes" label="备注" :span="2">
              <span style="white-space: pre-wrap; color: #606266; font-size: 12px">{{ detail.notes }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <h4 class="section-title">技术点 ({{ (detail.tech_points || []).length }})</h4>
          <el-table :data="detail.tech_points || []" size="mini" border>
            <el-table-column label="动作" width="120">
              <template slot-scope="{ row }">{{ actionTypeLabel(row.action_type) }}</template>
            </el-table-column>
            <el-table-column label="维度" prop="dimension" width="140">
              <template slot-scope="{ row }">{{ dimensionLabel(row.dimension) }}</template>
            </el-table-column>
            <el-table-column label="区间" align="center" width="140">
              <template slot-scope="{ row }">
                <span>{{ fmtNum(row.param_min) }} ~ {{ fmtNum(row.param_max) }}</span>
                <span class="unit">{{ row.unit }}</span>
              </template>
            </el-table-column>
            <el-table-column label="理想值" align="center" width="100">
              <template slot-scope="{ row }">
                <b>{{ fmtNum(row.param_ideal) }}</b>
                <span class="unit">{{ row.unit }}</span>
              </template>
            </el-table-column>
            <el-table-column label="置信度" align="center" width="100">
              <template slot-scope="{ row }">
                <el-tag size="mini" :type="confTagType(row.extraction_confidence)">
                  {{ ((row.extraction_confidence || 0) * 100).toFixed(0) }}%
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="detail.status === 'draft'" style="margin-top: 16px; text-align: right">
            <el-button type="success" size="small" @click="onApprove(detail)">
              <i class="el-icon-check" /> 审批激活此版本
            </el-button>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { listKnowledgeBaseVersions, getKnowledgeBaseVersion, approveKnowledgeBaseVersion } from '@/api/knowledgeBase'

const ACTION_TYPE_OPTIONS = [
  { value: 'forehand_attack', label: '正手攻球' },
  { value: 'forehand_topspin', label: '正手拉球' },
  { value: 'forehand_topspin_backspin', label: '正手拉下旋' },
  { value: 'forehand_counter', label: '正手反带' },
  { value: 'forehand_flick', label: '正手挑球' },
  { value: 'forehand_push_long', label: '正手推长' },
  { value: 'forehand_chop_long', label: '正手削长' },
  { value: 'forehand_general', label: '正手综合' },
  { value: 'forehand_position', label: '正手站位' },
  { value: 'forehand_backhand_transition', label: '正反手转换' },
  { value: 'backhand_topspin', label: '反手拉球' },
  { value: 'backhand_push', label: '反手推挡' },
  { value: 'backhand_flick', label: '反手挑球' },
  { value: 'backhand_general', label: '反手综合' }
]
const ACTION_TYPE_LABEL_MAP = ACTION_TYPE_OPTIONS.reduce((m, o) => { m[o.value] = o.label; return m }, {})

const DIMENSION_LABEL_MAP = {
  elbow_angle: '肘关节角度',
  contact_timing: '击球时机',
  swing_trajectory: '挥拍轨迹',
  weight_transfer: '重心转移',
  wrist_angle: '手腕角度',
  shoulder_rotation: '肩部转动',
  footwork: '步法',
  racket_angle: '拍面角度'
}

const STATUS_LABEL_MAP = { active: '已激活', draft: '草稿', archived: '已归档' }

export default {
  name: 'KnowledgeBaseVersions',
  data() {
    return {
      list: [],
      total: 0,
      activeCount: 0,
      draftCount: 0,
      listLoading: false,
      filterStatus: '',
      filterTechCategory: '',
      currentPage: 1,
      pageSize: 20,
      techCategoryOptions: ACTION_TYPE_OPTIONS,

      detailVisible: false,
      detailLoading: false,
      detail: null
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.listLoading = true
      try {
        const params = { page: this.currentPage, page_size: this.pageSize }
        if (this.filterStatus) params.status = this.filterStatus
        if (this.filterTechCategory) params.tech_category = this.filterTechCategory
        const { data, meta } = await listKnowledgeBaseVersions(params)
        // 兼容：后端当前直接返回数组；历史版本返回 { versions: [...] }
        let arr = []
        if (Array.isArray(data)) {
          arr = data
        } else if (data && Array.isArray(data.versions)) {
          arr = data.versions
        } else if (data && Array.isArray(data.items)) {
          arr = data.items
        }
        // 后端若未支持 tech_category query 参数，则前端本地过滤一次以保障效果
        if (this.filterTechCategory) {
          arr = arr.filter(v => v.tech_category === this.filterTechCategory)
        }
        this.list = arr
        this.total = (meta && meta.total) || arr.length
        this.activeCount = arr.filter(v => v.status === 'active').length
        this.draftCount = arr.filter(v => v.status === 'draft').length
      } catch (e) {
        this.list = []
        this.total = 0
      } finally {
        this.listLoading = false
      }
    },
    onPageChange(p) { this.currentPage = p; this.fetchList() },
    onSizeChange(s) { this.pageSize = s; this.currentPage = 1; this.fetchList() },
    onFilterChange() { this.currentPage = 1; this.fetchList() },
    async openDetail(row) {
      this.detailVisible = true
      this.detailLoading = true
      this.detail = null
      try {
        const { data } = await getKnowledgeBaseVersion(row.version)
        this.detail = data || null
      } catch (e) {
        this.detail = null
      } finally {
        this.detailLoading = false
      }
    },
    async onApprove(row) {
      try {
        await this.$confirm(`确认激活知识库版本 ${row.version}？当前已激活版本将被置为归档。`, '审批确认', {
          type: 'warning', confirmButtonText: '确认激活', cancelButtonText: '取消'
        })
      } catch { return }
      try {
        await approveKnowledgeBaseVersion(row.version, {})
        this.$message.success(`已激活：${row.version}`)
        this.detailVisible = false
        this.fetchList()
      } catch (e) {
        // 拦截器已提示
      }
    },
    actionTypeLabel(key) { return ACTION_TYPE_LABEL_MAP[key] || key },
    dimensionLabel(key) { return DIMENSION_LABEL_MAP[key] || key },
    statusLabel(key) { return STATUS_LABEL_MAP[key] || key },
    statusTagType(s) { return s === 'active' ? 'success' : s === 'archived' ? 'info' : '' },
    shortId(id) { return id ? String(id).slice(0, 8) : '—' },
    gotoJob(jobId) {
      if (!jobId) return
      this.$router.push({ path: '/extraction-jobs', query: { job: jobId }})
    },
    confTagType(c) {
      const v = c || 0
      if (v >= 0.9) return 'success'
      if (v >= 0.7) return 'warning'
      return 'danger'
    },
    fmtNum(n) {
      if (n === null || n === undefined) return '—'
      return Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(3)
    },
    formatDate(isoStr) {
      if (!isoStr) return '—'
      return isoStr.replace('T', ' ').substring(0, 19)
    }
  }
}
</script>

<style scoped>
.phase-head-tag {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  font-size: 13px;
}
.phase-head-tag .phase-head-desc { color: #606266; }
.phase-head-tag code {
  background: #f4f4f5;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.filter-bar .summary-hint { color: #606266; font-size: 13px; margin-left: auto; }
.muted { color: #c0c4cc; }
.mono { font-family: Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 12px; }
.detail-panel { padding: 0 20px 20px; }
.section-title { margin: 20px 0 10px; font-size: 14px; color: #303133; }
.unit { margin-left: 3px; color: #909399; font-size: 11px; }
</style>
