<template>
  <div class="app-container">
    <el-table v-loading="listLoading" :data="list" border fit highlight-current-row style="width: 100%">
      <el-table-column label="版本 ID" prop="version" min-width="160" />
      <el-table-column label="覆盖动作类型" min-width="200">
        <template slot-scope="{ row }">
          <el-tag
            v-for="t in row.action_types_covered"
            :key="t"
            size="small"
            style="margin-right: 4px"
          >{{ t }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="技术要点数" prop="point_count" width="110" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审批时间" width="180" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.approved_at) }}</template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!listLoading && list.length === 0" description="暂无知识库版本数据" />
  </div>
</template>

<script>
import { listKnowledgeBaseVersions } from '@/api/knowledgeBase'

export default {
  name: 'KnowledgeBaseList',
  data() {
    return {
      list: [],
      listLoading: false
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.listLoading = true
      try {
        const res = await listKnowledgeBaseVersions()
        this.list = Array.isArray(res) ? res : (res.versions || [])
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.listLoading = false
      }
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
