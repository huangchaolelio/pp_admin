<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filter.coach_name" placeholder="教练" clearable style="width: 130px; margin-right: 8px" @change="fetchList" @clear="fetchList">
        <el-option v-for="c in coachOptions" :key="c.name" :label="c.name" :value="c.name" />
      </el-select>
      <el-select v-model="filter.tech_category" placeholder="技术类别" clearable style="width: 160px; margin-right: 8px" @change="fetchList" @clear="fetchList">
        <el-option label="正手技术" value="正手技术" />
        <el-option label="反手技术" value="反手技术" />
        <el-option label="发球" value="发球" />
        <el-option label="接发球" value="接发球" />
        <el-option label="搓球与摆短" value="搓球与摆短" />
        <el-option label="步法与衔接" value="步法与衔接" />
        <el-option label="综合技术" value="综合技术" />
        <el-option label="防守与保障" value="防守与保障" />
        <el-option label="握拍与姿态" value="握拍与姿态" />
        <el-option label="体能与辅助" value="体能与辅助" />
        <el-option label="其他" value="其他" />
      </el-select>
      <el-select v-model="filter.video_type" placeholder="视频类型" clearable style="width: 140px; margin-right: 8px" @change="fetchList" @clear="fetchList">
        <el-option label="教学视频" value="tutorial" />
        <el-option label="训练视频" value="training" />
      </el-select>
      <el-checkbox v-model="filter.manual_only" style="margin-right: 16px" @change="handleManualOnlyChange">只看手动覆盖</el-checkbox>
      <el-button :loading="refreshLoading" :disabled="charPpUnavailable" @click="handleRefresh">重新扫描分类</el-button>
      <el-button type="primary" :disabled="charPpUnavailable" @click="handleBatchSubmit">批量提交知识提取</el-button>
    </div>

    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="视频路径" min-width="320">
        <template slot-scope="{ row }">
          <span class="cell-path">{{ row.cos_object_key }}</span>
        </template>
      </el-table-column>
      <el-table-column label="教练名" prop="coach_name" width="100">
        <template slot-scope="{ row }"><span>{{ row.coach_name || '—' }}</span></template>
      </el-table-column>
      <el-table-column label="技术类别" prop="tech_category" width="120" />
      <el-table-column label="视频类型" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.video_type === 'tutorial' ? 'primary' : 'success'" size="small">
            {{ row.video_type === 'tutorial' ? '教学' : '训练' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="80" align="center">
        <template slot-scope="{ row }">
          {{ row.classification_confidence != null ? (row.classification_confidence * 100).toFixed(0) + '%' : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="手动覆盖" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.manually_overridden" type="warning" size="small">已覆盖</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
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
            <el-option label="正手技术" value="正手技术" />
            <el-option label="反手技术" value="反手技术" />
            <el-option label="发球" value="发球" />
            <el-option label="接发球" value="接发球" />
            <el-option label="搓球与摆短" value="搓球与摆短" />
            <el-option label="步法与衔接" value="步法与衔接" />
            <el-option label="综合技术" value="综合技术" />
            <el-option label="防守与保障" value="防守与保障" />
            <el-option label="握拍与姿态" value="握拍与姿态" />
            <el-option label="体能与辅助" value="体能与辅助" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item label="视频类型">
          <el-select v-model="editForm.video_type" style="width: 100%">
            <el-option label="教学视频" value="tutorial" />
            <el-option label="训练视频" value="training" />
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
import { listCoaches } from '@/api/coaches'
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
      coachOptions: [],
      filter: { coach_name: '', tech_category: '', video_type: '', manual_only: false },
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
    this.fetchCoaches()
    this.fetchList()
  },
  methods: {
    async fetchCoaches() {
      try {
        const res = await listCoaches({ include_inactive: false })
        const data = res.data !== undefined ? res.data : res
        this.coachOptions = Array.isArray(data) ? data : []
      } catch (e) {
        // 教练列表加载失败不影响主流程
      }
    },
    async fetchList() {
      this.currentPage = 1
      this.listLoading = true
      const params = {}
      if (this.filter.coach_name) params.coach_name = this.filter.coach_name
      if (this.filter.tech_category) params.tech_category = this.filter.tech_category
      if (this.filter.video_type) params.video_type = this.filter.video_type
      try {
        const res = await listClassifications(params)
        this.list = res.items || res.data || []
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
      await this.$confirm('将为当前筛选结果中的教学视频批量提交知识提取任务，确认继续？', '批量提交', { type: 'info' })
        .catch(() => { throw new Error('cancel') })
      try {
        const tutorialKeys = this.filteredList
          .filter(v => v.video_type === 'tutorial')
          .map(v => v.cos_object_key)
        if (!tutorialKeys.length) {
          this.$message.warning('当前筛选结果中无教学视频')
          return
        }
        const res = await batchSubmitKnowledgeExtraction({ cos_object_keys: tutorialKeys })
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
.cell-path {
  display: block;
  word-break: break-all;
  line-height: 1.5;
  font-size: 12px;
  color: #606266;
}
.form-readonly {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}
</style>
