<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filterCategory" placeholder="按技术类别过滤" clearable style="width: 200px" @change="fetchList">
        <el-option label="正手拉球" value="forehand_topspin" />
        <el-option label="反手推挡" value="backhand_push" />
      </el-select>
    </div>

    <el-collapse v-model="activeCategories" v-loading="listLoading">
      <el-collapse-item
        v-for="(items, category) in groupedList"
        :key="category"
        :title="`${techCategoryLabel(category)}（${items.length} 个版本）`"
        :name="category"
      >
        <el-table :data="items" border size="small" style="width: 100%">
          <el-table-column label="版本" prop="version" width="80" align="center" />
          <el-table-column label="技术要点数量" prop="tech_point_count" width="130" align="center" />
          <el-table-column label="来源教练数量" prop="coach_count" width="130" align="center" />
          <el-table-column label="构建时间" width="180" align="center">
            <template slot-scope="{ row }">{{ formatDate(row.built_at) }}</template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>

    <el-empty v-if="!listLoading && list.length === 0" description="暂无知识库数据" />
  </div>
</template>

<script>
import { listKnowledgeBase } from '@/api/knowledgeBase'

export default {
  name: 'KnowledgeBaseList',
  data() {
    return {
      list: [],
      listLoading: false,
      filterCategory: '',
      activeCategories: []
    }
  },
  computed: {
    groupedList() {
      const groups = {}
      this.list.forEach(item => {
        if (!groups[item.tech_category]) groups[item.tech_category] = []
        groups[item.tech_category].push(item)
      })
      return groups
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
        const res = await listKnowledgeBase(params)
        this.list = res.data || res || []
        this.activeCategories = Object.keys(this.groupedList)
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
