<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filterCategory" placeholder="按技术类别过滤" clearable style="width: 200px" @change="fetchList">
        <el-option label="正手拉球" value="forehand_topspin" />
        <el-option label="反手推挡" value="backhand_push" />
      </el-select>
    </div>

    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row style="width: 100%">
      <el-table-column label="技术类别" width="130">
        <template slot-scope="{ row }">
          <el-tag>{{ techCategoryLabel(row.tech_category) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提示内容" min-width="280">
        <template slot-scope="{ row }">
          <span style="white-space: pre-wrap; line-height: 1.6">{{ row.content }}</span>
        </template>
      </el-table-column>
      <el-table-column label="来源视频片段" min-width="200">
        <template slot-scope="{ row }">
          <el-tooltip :content="row.source_clip" placement="top-start">
            <span class="cell-truncate">{{ row.source_clip }}</span>
          </el-tooltip>
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
    </el-table>

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
      filterCategory: ''
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.listLoading = true
      const params = this.filterCategory ? { tech_category: this.filterCategory } : {}
      try {
        const res = await listTeachingTips(params)
        this.list = res.data || res || []
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.listLoading = false
      }
    },
    techCategoryLabel(key) {
      const map = { forehand_topspin: '正手拉球', backhand_push: '反手推挡' }
      return map[key] || key
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
.cell-truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}
</style>
