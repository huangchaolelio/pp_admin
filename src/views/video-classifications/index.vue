<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filter.tech_category" placeholder="技术类别" clearable style="width: 160px; margin-right: 8px" @change="fetchList">
        <el-option label="正手拉球" value="forehand_topspin" />
        <el-option label="反手推挡" value="backhand_push" />
      </el-select>
      <el-select v-model="filter.video_type" placeholder="视频类型" clearable style="width: 140px; margin-right: 8px" @change="fetchList">
        <el-option label="专家视频" value="expert" />
        <el-option label="运动员视频" value="athlete" />
      </el-select>
      <el-checkbox v-model="filter.manual_only" style="margin-right: 16px" @change="handleManualOnlyChange">只看手动覆盖</el-checkbox>
      <el-button :loading="refreshLoading" :disabled="charPpUnavailable" @click="handleRefresh">重新扫描分类</el-button>
      <el-button type="primary" :disabled="charPpUnavailable" @click="handleBatchSubmit">批量提交知识提取</el-button>
    </div>

    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="视频路径" min-width="220">
        <template slot-scope="{ row }">
          <el-tooltip :content="row.cos_object_key" placement="top-start">
            <span class="cell-truncate">{{ row.cos_object_key }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="教练名" prop="coach_name" width="100">
        <template slot-scope="{ row }"><span>{{ row.coach_name || '—' }}</span></template>
      </el-table-column>
      <el-table-column label="技术类别" prop="tech_category" width="120" />
      <el-table-column label="视频类型" width="110" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.video_type === 'expert' ? 'primary' : 'success'">
            {{ row.video_type === 'expert' ? '专家' : '运动员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="100" align="center">
        <template slot-scope="{ row }">
          {{ row.confidence != null ? (row.confidence * 100).toFixed(0) + '%' : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="手动覆盖" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.manually_overridden" type="warning" size="small">已覆盖</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" align="center">
        <template slot-scope="{ row }">
          <el-button size="mini" type="primary" :disabled="charPpUnavailable" @click="handleEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top: 16px; text-align: right"
      :current-page.sync="currentPage"
      :page-sizes="[10, 20, 50]"
      :page-size.sync="pageSize"
      :total="filteredList.length"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="val => { currentPage = val }"
      @size-change="val => { pageSize = val; currentPage = 1 }"
    />

    <!-- 编辑覆盖 Dialog -->
    <el-dialog title="手动覆盖分类" :visible.sync="editDialogVisible" width="500px">
      <el-form ref="editForm" :model="editForm" label-width="100px">
        <el-form-item label="视频路径">
          <span class="form-readonly">{{ editForm.cos_object_key }}</span>
        </el-form-item>
        <el-form-item label="技术类别">
          <el-select v-model="editForm.tech_category" style="width: 100%">
            <el-option label="正手拉球" value="forehand_topspin" />
            <el-option label="反手推挡" value="backhand_push" />
          </el-select>
        </el-form-item>
        <el-form-item label="视频类型">
          <el-select v-model="editForm.video_type" style="width: 100%">
            <el-option label="专家视频" value="expert" />
            <el-option label="运动员视频" value="athlete" />
          </el-select>
        </el-form-item>
        <el-form-item label="教练名">
          <el-input v-model="editForm.coach_name" placeholder="可选" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitLoading" @click="submitEdit">确认覆盖</el-button>
      </span>
    </el-dialog>

    <!-- 批量提交结果 Dialog -->
    <task-id-list-dialog :visible.sync="taskDialogVisible" :task-ids="submittedTaskIds" />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  listClassifications,
  overrideClassification,
  refreshClassifications,
  batchSubmitKnowledgeExtraction
} from '@/api/videoClassifications'
import TaskIdListDialog from '@/components/TaskIdListDialog'

export default {
  name: 'VideoClassificationsIndex',
  components: { TaskIdListDialog },
  data() {
    return {
      list: [],
      lastLoadedList: [],
      listLoading: false,
      refreshLoading: false,
      filter: { tech_category: '', video_type: '', manual_only: false },
      currentPage: 1,
      pageSize: 20,
      editDialogVisible: false,
      editForm: { cos_object_key: '', tech_category: '', video_type: '', coach_name: '' },
      editSubmitLoading: false,
      taskDialogVisible: false,
      submittedTaskIds: []
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable }),
    filteredList() {
      let result = this.list
      if (this.filter.manual_only) result = result.filter(v => v.manually_overridden)
      return result
    },
    pagedList() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.filteredList.slice(start, start + this.pageSize)
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    async fetchList() {
      this.currentPage = 1
      this.listLoading = true
      const params = {}
      if (this.filter.tech_category) params.tech_category = this.filter.tech_category
      if (this.filter.video_type) params.video_type = this.filter.video_type
      try {
        const res = await listClassifications(params)
        this.list = Array.isArray(res) ? res : (res.items || [])
        this.lastLoadedList = [...this.list]
      } catch (e) {
        if (this.lastLoadedList.length) this.list = [...this.lastLoadedList]
      } finally {
        this.listLoading = false
      }
    },
    handleManualOnlyChange() {
      this.currentPage = 1
    },
    handleEdit(row) {
      this.editForm = {
        cos_object_key: row.cos_object_key,
        tech_category: row.tech_category || '',
        video_type: row.video_type || '',
        coach_name: row.coach_name || ''
      }
      this.editDialogVisible = true
    },
    async submitEdit() {
      this.editSubmitLoading = true
      try {
        await overrideClassification(this.editForm.cos_object_key, {
          tech_category: this.editForm.tech_category,
          video_type: this.editForm.video_type,
          coach_name: this.editForm.coach_name || undefined
        })
        this.$message.success('分类已手动覆盖')
        this.editDialogVisible = false
        this.fetchList()
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.editSubmitLoading = false
      }
    },
    async handleRefresh() {
      await this.$confirm('将重新扫描所有未手动覆盖的视频分类，确认继续？', '重新扫描', { type: 'warning' })
        .catch(() => { throw new Error('cancel') })
      this.refreshLoading = true
      try {
        const res = await refreshClassifications()
        const data = res.data || res
        this.$alert(
          `扫描完成：重新分类 ${data.reclassified} 条，跳过 ${data.skipped} 条（手动覆盖），共扫描 ${data.total_scanned} 条`,
          '扫描结果',
          { type: 'success' }
        )
        this.fetchList()
      } catch (e) {
        if (e.message === 'cancel') return
      } finally {
        this.refreshLoading = false
      }
    },
    async handleBatchSubmit() {
      await this.$confirm('将为当前筛选结果中的专家视频批量提交知识提取任务，确认继续？', '批量提交', { type: 'info' })
        .catch(() => { throw new Error('cancel') })
      try {
        const expertKeys = this.filteredList
          .filter(v => v.video_type === 'expert')
          .map(v => v.cos_object_key)
        if (!expertKeys.length) {
          this.$message.warning('当前筛选结果中无专家视频')
          return
        }
        const res = await batchSubmitKnowledgeExtraction({ cos_object_keys: expertKeys })
        const data = res.data || res
        this.submittedTaskIds = data.task_ids || []
        this.taskDialogVisible = true
      } catch (e) {
        if (e.message === 'cancel') return
      }
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.cell-truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.form-readonly {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}
</style>
