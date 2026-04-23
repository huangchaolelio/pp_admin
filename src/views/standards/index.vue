<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button type="primary" :disabled="charPpUnavailable" @click="handleBuild">重建标准</el-button>
    </div>

    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="技术类别" width="160">
        <template slot-scope="{ row }">
          <el-link type="primary" @click="handleDetail(row)">{{ techCategoryLabel(row.tech_category) }}</el-link>
        </template>
      </el-table-column>
      <el-table-column label="版本" prop="version" width="80" align="center" />
      <el-table-column label="质量类型" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.quality_type === 'high' ? 'success' : 'warning'">{{ row.quality_type || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="教练数" prop="coach_count" width="90" align="center" />
      <el-table-column label="维度数" prop="dimension_count" width="90" align="center" />
      <el-table-column label="构建时间" width="180" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.built_at) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="!row.version" type="danger" size="small">缺少标准</el-tag>
          <el-tag v-else type="success" size="small">正常</el-tag>
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

    <!-- 标准详情 Dialog -->
    <el-dialog :title="`技术标准详情 — ${detailCategory}`" :visible.sync="detailDialogVisible" width="700px">
      <el-table v-if="detailData" :data="detailData.dimensions" border size="small">
        <el-table-column label="维度" prop="name" width="140" />
        <el-table-column label="单位" prop="unit" width="80" align="center" />
        <el-table-column label="理想值" prop="ideal" width="90" align="center" />
        <el-table-column label="最小值" prop="min" width="90" align="center" />
        <el-table-column label="最大值" prop="max" width="90" align="center" />
        <el-table-column label="样本数" prop="sample_count" width="90" align="center" />
      </el-table>
      <span slot="footer"><el-button @click="detailDialogVisible = false">关闭</el-button></span>
    </el-dialog>

    <!-- 重建标准 Dialog -->
    <el-dialog title="重建技术标准" :visible.sync="buildDialogVisible" width="420px">
      <el-form label-width="110px">
        <el-form-item label="技术类别">
          <el-select v-model="buildCategory" placeholder="不选则全量重建" clearable style="width: 100%">
            <el-option label="正手拉球 (forehand_topspin)" value="forehand_topspin" />
            <el-option label="反手推挡 (backhand_push)" value="backhand_push" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="buildDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="buildLoading" @click="submitBuild">确认重建</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listStandards, getStandard, buildStandard } from '@/api/standards'

export default {
  name: 'StandardsIndex',
  data() {
    return {
      list: [],
      listLoading: false,
      currentPage: 1,
      pageSize: 20,
      detailDialogVisible: false,
      detailData: null,
      detailCategory: '',
      buildDialogVisible: false,
      buildCategory: '',
      buildLoading: false
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable }),
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
        const res = await listStandards()
        this.list = Array.isArray(res) ? res : (res.standards || [])
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.listLoading = false
      }
    },
    async handleDetail(row) {
      this.detailCategory = this.techCategoryLabel(row.tech_category)
      this.detailData = null
      this.detailDialogVisible = true
      try {
        const res = await getStandard(row.tech_category)
        this.detailData = res.data || res
      } catch (e) {
        this.detailDialogVisible = false
      }
    },
    handleBuild() {
      this.buildCategory = ''
      this.buildDialogVisible = true
    },
    async submitBuild() {
      this.buildLoading = true
      try {
        const data = this.buildCategory ? { tech_category: this.buildCategory } : {}
        const res = await buildStandard(data)
        const result = res.data || res
        this.$message.success(result.message || `标准重建完成：成功 ${result.success} 个，跳过 ${result.skipped} 个，失败 ${result.failed} 个`)
        this.buildDialogVisible = false
        this.fetchList()
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.buildLoading = false
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
