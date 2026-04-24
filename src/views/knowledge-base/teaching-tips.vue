<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filterActionType" placeholder="按动作类型过滤" clearable style="width: 200px" @change="fetchList" @clear="fetchList">
        <el-option label="正手攻球" value="forehand_attack" />
        <el-option label="正手拉球" value="forehand_topspin" />
        <el-option label="正手拉下旋" value="forehand_topspin_backspin" />
        <el-option label="正手反带" value="forehand_counter" />
        <el-option label="正手挑球" value="forehand_flick" />
        <el-option label="正手推长" value="forehand_push_long" />
        <el-option label="正手削长" value="forehand_chop_long" />
        <el-option label="正手综合" value="forehand_general" />
        <el-option label="正手站位" value="forehand_position" />
        <el-option label="正反手转换" value="forehand_backhand_transition" />
        <el-option label="反手拉球" value="backhand_topspin" />
        <el-option label="反手推挡" value="backhand_push" />
        <el-option label="反手挑球" value="backhand_flick" />
        <el-option label="反手综合" value="backhand_general" />
      </el-select>
    </div>

    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="动作类型" width="150" align="center">
        <template slot-scope="{ row }">{{ actionTypeLabel(row.action_type) }}</template>
      </el-table-column>
      <el-table-column label="技术阶段" prop="tech_phase" width="110" align="center">
        <template slot-scope="{ row }">{{ techPhaseLabel(row.tech_phase) }}</template>
      </el-table-column>
      <el-table-column label="提示内容" min-width="280">
        <template slot-scope="{ row }">
          <span style="white-space: pre-wrap; line-height: 1.6">{{ row.tip_text }}</span>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="100" align="center">
        <template slot-scope="{ row }">
          <el-progress
            :percentage="Math.round(row.confidence * 100)"
            :color="confidenceColor(row.confidence)"
            :show-text="false"
            style="width: 70px; display: inline-block"
          />
          <span style="margin-left: 4px; font-size: 12px">{{ (row.confidence * 100).toFixed(0) }}%</span>
        </template>
      </el-table-column>
      <el-table-column label="教练" width="100" align="center">
        <template slot-scope="{ row }">{{ row.coach_name || '—' }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; text-align: right"
      :current-page.sync="currentPage"
      :page-sizes="[10, 20, 50]"
      :page-size.sync="pageSize"
      :total="list.length"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="val => { currentPage = val }"
      @size-change="val => { pageSize = val; currentPage = 1 }"
    />

    <el-empty v-if="!listLoading && list.length === 0" description="暂无教学提示数据" />
  </div>
</template>

<script>
import { listTeachingTips } from '@/api/knowledgeBase'

const ACTION_TYPE_LABEL_MAP = {
  forehand_attack: '正手攻球',
  forehand_topspin: '正手拉球',
  forehand_topspin_backspin: '正手拉下旋',
  forehand_counter: '正手反带',
  forehand_flick: '正手挑球',
  forehand_push_long: '正手推长',
  forehand_chop_long: '正手削长',
  forehand_general: '正手综合',
  forehand_position: '正手站位',
  forehand_backhand_transition: '正反手转换',
  backhand_topspin: '反手拉球',
  backhand_push: '反手推挡',
  backhand_flick: '反手挑球',
  backhand_general: '反手综合'
}

const TECH_PHASE_LABEL_MAP = {
  preparation: '准备阶段',
  backswing: '引拍阶段',
  contact: '击球阶段',
  follow_through: '随挥阶段',
  recovery: '还原阶段'
}

export default {
  name: 'TeachingTips',
  data() {
    return {
      list: [],
      listLoading: false,
      filterActionType: '',
      currentPage: 1,
      pageSize: 20
    }
  },
  computed: {
    pagedList() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.list.slice(start, start + this.pageSize)
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.currentPage = 1
      this.listLoading = true
      const params = this.filterActionType ? { action_type: this.filterActionType } : {}
      try {
        const res = await listTeachingTips(params)
        this.list = Array.isArray(res) ? res : (res.items || res.data || [])
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.listLoading = false
      }
    },
    actionTypeLabel(key) {
      return ACTION_TYPE_LABEL_MAP[key] || key
    },
    techPhaseLabel(key) {
      return TECH_PHASE_LABEL_MAP[key] || key || '—'
    },
    confidenceColor(conf) {
      if (conf >= 0.9) return '#67C23A'
      if (conf >= 0.7) return '#E6A23C'
      return '#F56C6C'
    }
  }
}
</script>

<style scoped>
.filter-container { margin-bottom: 16px; }
</style>
