<template>
  <div class="app-container">
    <el-alert
      v-if="!listLoading && list.length === 0 && !filterActionType"
      title="教学提示需要从 KB 提取作业触发"
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    >
      <div>
        KB 提取流水线暂不会自动产出教学提示。请前往
        <el-link type="primary" @click="$router.push('/extraction-jobs')">KB 提取作业</el-link>
        页面，在 <b>success</b> 状态的作业行点击「抽取教学提示」按钮即可。
      </div>
    </el-alert>

    <div class="filter-container">
      <el-select v-model="filterActionType" placeholder="按动作类型过滤" clearable size="small" style="width: 200px" @change="onFilterChange" @clear="onFilterChange">
        <el-option v-for="opt in actionTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
      <el-button size="small" icon="el-icon-refresh" @click="fetchList">刷新</el-button>
      <span class="summary-hint">共 <b>{{ total }}</b> 条教学提示</span>
      <el-button type="primary" size="small" icon="el-icon-magic-stick" style="margin-left: auto" @click="$router.push('/extraction-jobs')">去 KB 作业抽取</el-button>
    </div>

    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row style="width: 100%">
      <el-table-column label="动作类型" width="130" align="center">
        <template slot-scope="{ row }">{{ actionTypeLabel(row.action_type) }}</template>
      </el-table-column>
      <el-table-column label="技术阶段" prop="tech_phase" width="100" align="center">
        <template slot-scope="{ row }">{{ techPhaseLabel(row.tech_phase) }}</template>
      </el-table-column>
      <el-table-column label="提示内容" min-width="280">
        <template slot-scope="{ row }">
          <span style="white-space: pre-wrap; line-height: 1.6">{{ row.tip_text }}</span>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="130" align="center">
        <template slot-scope="{ row }">
          <el-progress
            :percentage="Math.round((row.confidence || 0) * 100)"
            :color="confidenceColor(row.confidence)"
            :show-text="false"
            style="width: 70px; display: inline-block; vertical-align: middle"
          />
          <span style="margin-left: 4px; font-size: 12px">{{ ((row.confidence || 0) * 100).toFixed(0) }}%</span>
        </template>
      </el-table-column>
      <el-table-column label="教练" width="100" align="center">
        <template slot-scope="{ row }">{{ row.coach_name || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template slot-scope="{ row }">
          <el-button size="mini" type="text" style="color: #f56c6c" @click="onDelete(row)">删除</el-button>
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

    <el-empty v-if="!listLoading && list.length === 0 && filterActionType" description="此动作类型暂无教学提示" />
  </div>
</template>

<script>
import { listTeachingTips, deleteTeachingTip } from '@/api/knowledgeBase'

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

const TECH_PHASE_LABEL_MAP = {
  preparation: '准备阶段',
  contact: '击球阶段',
  follow_through: '随挥阶段',
  footwork: '步法',
  general: '综合'
}

export default {
  name: 'TeachingTips',
  data() {
    return {
      list: [],
      total: 0,
      listLoading: false,
      filterActionType: '',
      currentPage: 1,
      pageSize: 20,
      actionTypeOptions: ACTION_TYPE_OPTIONS
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.listLoading = true
      const params = { page: this.currentPage, page_size: this.pageSize }
      if (this.filterActionType) params.action_type = this.filterActionType
      try {
        const { data, meta } = await listTeachingTips(params)
        let arr = []
        if (Array.isArray(data)) arr = data
        else if (data && Array.isArray(data.items)) arr = data.items
        this.list = arr
        this.total = (meta && meta.total) || (data && data.total) || arr.length
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
    async onDelete(row) {
      try {
        await this.$confirm(`确认删除此教学提示？`, '提示', { type: 'warning' })
      } catch { return }
      try {
        await deleteTeachingTip(row.id || row.tip_id)
        this.$message.success('已删除')
        this.fetchList()
      } catch (e) { /* 拦截器已提示 */ }
    },
    actionTypeLabel(key) { return ACTION_TYPE_LABEL_MAP[key] || key },
    techPhaseLabel(key) { return TECH_PHASE_LABEL_MAP[key] || key || '—' },
    confidenceColor(conf) {
      const v = conf || 0
      if (v >= 0.9) return '#67C23A'
      if (v >= 0.7) return '#E6A23C'
      return '#F56C6C'
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-container .summary-hint { color: #606266; font-size: 13px; }
code { background: #f4f4f5; padding: 1px 4px; border-radius: 2px; font-size: 12px; }
</style>
