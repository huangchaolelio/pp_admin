<template>
  <div class="app-container">
    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="版本号" prop="version" width="140" />
      <el-table-column label="覆盖动作类型" min-width="200">
        <template slot-scope="{ row }">
          <el-tag
            v-for="t in row.action_types_covered"
            :key="t"
            size="small"
            style="margin-right: 4px; margin-bottom: 2px"
          >{{ actionTypeLabel(t) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="技术要点数" prop="point_count" width="110" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审批时间" width="180" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.approved_at) }}</template>
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

    <el-empty v-if="!listLoading && list.length === 0" description="暂无知识库版本数据" />
  </div>
</template>

<script>
import { listKnowledgeBaseVersions } from '@/api/knowledgeBase'

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

const STATUS_LABEL_MAP = {
  active: '已激活',
  draft: '草稿',
  archived: '已归档'
}

export default {
  name: 'KnowledgeBaseList',
  data() {
    return {
      list: [],
      listLoading: false,
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
      this.listLoading = true
      try {
        const { data } = await listKnowledgeBaseVersions()
        this.list = (data && data.versions) || []
      } catch (e) {
        this.list = []
      } finally {
        this.listLoading = false
      }
    },
    actionTypeLabel(key) {
      return ACTION_TYPE_LABEL_MAP[key] || key
    },
    statusLabel(key) {
      return STATUS_LABEL_MAP[key] || key
    },
    formatDate(isoStr) {
      if (!isoStr) return '—'
      return isoStr.replace('T', ' ').substring(0, 19)
    }
  }
}
</script>

<style scoped>
.filter-container { margin-bottom: 16px; }
</style>
