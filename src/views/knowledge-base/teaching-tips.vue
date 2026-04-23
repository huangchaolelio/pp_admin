<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filterCategory" placeholder="按动作类型过滤" clearable style="width: 200px" @change="fetchList">
        <el-option label="正手拉球" value="forehand_topspin" />
        <el-option label="反手推挡" value="backhand_push" />
      </el-select>
    </div>

    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="动作类型" width="150" prop="action_type" />
      <el-table-column label="提示内容" min-width="280">
        <template slot-scope="{ row }">
          <span style="white-space: pre-wrap; line-height: 1.6">{{ row.tip_text }}</span>
        </template>
      </el-table-column>
      <el-table-column label="技术阶段" prop="tech_phase" width="110" />
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

export default {
  name: 'TeachingTips',
  data() {
    return {
      list: [],
      listLoading: false,
      filterCategory: '',
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
      const params = this.filterCategory ? { action_type: this.filterCategory } : {}
      try {
        const res = await listTeachingTips(params)
        this.list = Array.isArray(res) ? res : (res.items || [])
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.listLoading = false
      }
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
