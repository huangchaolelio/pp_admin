<template>
  <div class="app-container">
    <!-- 筛选栏 -->
    <el-card class="filter-bar">
      <el-form :inline="true" @submit.native.prevent="handleSearch">
        <el-form-item label="教练">
          <el-select v-model="filter.coach_name" clearable placeholder="全部" style="width:150px">
            <el-option v-for="c in coachOptions" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="技术类别">
          <el-select v-model="filter.tech_category" clearable placeholder="全部" style="width:160px">
            <el-option v-for="opt in TECH_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="KB 提取">
          <el-select v-model="filter.kb_extracted" clearable placeholder="全部" style="width:110px">
            <el-option label="已提取" :value="true" />
            <el-option label="未提取" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div>
        <el-button :loading="scanLoading" :disabled="charPpUnavailable" @click="handleScan">
          <i class="el-icon-refresh-right" /> 重新扫描 COS
        </el-button>
        <el-button :loading="preprocessLoading" :disabled="charPpUnavailable || !list.length" @click="handleBatchPreprocess">
          <i class="el-icon-film" /> 批量预处理
        </el-button>
        <el-button type="primary" :loading="kbLoading" :disabled="charPpUnavailable || !list.length" @click="handleBatchKb">
          <i class="el-icon-share" /> 批量 KB 提取
        </el-button>
      </div>
      <el-button icon="el-icon-refresh" circle :loading="listLoading" title="刷新" @click="fetchList" />
    </div>

    <!-- 数据表 -->
    <el-table v-loading="listLoading" :data="list" border style="width:100%;margin-top:8px">
      <el-table-column label="COS 路径" min-width="220">
        <template slot-scope="{ row }">
          <el-tooltip :content="row.cos_object_key" placement="top">
            <span class="path-cell">{{ row.filename || row.cos_object_key }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="教练" prop="coach_name" width="110">
        <template slot-scope="{ row }">{{ row.coach_name || '—' }}</template>
      </el-table-column>
      <el-table-column label="技术类别" prop="tech_category" width="130" />
      <el-table-column label="课程系列" prop="course_series" width="140">
        <template slot-scope="{ row }">{{ row.course_series || '—' }}</template>
      </el-table-column>
      <el-table-column label="标签" width="140">
        <template slot-scope="{ row }">
          <el-tag v-for="t in (row.tech_tags || [])" :key="t" size="mini" style="margin:1px">{{ t }}</el-tag>
          <span v-if="!row.tech_tags || !row.tech_tags.length">—</span>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="80" align="center">
        <template slot-scope="{ row }">
          {{ row.confidence != null ? (row.confidence * 100).toFixed(0) + '%' : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="来源" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.classification_source === 'manual'" type="warning" size="mini">手动</el-tag>
          <el-tag v-else type="info" size="mini">{{ row.classification_source || 'llm' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="KB 提取" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.kb_extracted ? 'success' : 'info'" size="mini">
            {{ row.kb_extracted ? '已提取' : '未提取' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="160">
        <template slot-scope="{ row }">{{ formatDate(row.updated_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template slot-scope="{ row }">
          <el-button size="mini" :disabled="charPpUnavailable" @click="handleEdit(row)">编辑</el-button>
          <el-button size="mini" type="primary" :disabled="charPpUnavailable" :loading="submittingId === row.id" @click="handleSubmitPreprocess(row)">预处理</el-button>
          <el-button size="mini" type="primary" :disabled="charPpUnavailable" :loading="submittingId === row.id" @click="handleSubmitKb(row)">KB 提取</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top:16px;text-align:right"
      :current-page.sync="page"
      :page-sizes="[10, 20, 50, 100]"
      :page-size.sync="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <!-- 编辑分类 -->
    <el-dialog title="更新分类" :visible.sync="editVisible" width="520px">
      <el-form ref="editForm" :model="editForm" label-width="100px">
        <el-form-item label="COS 路径">
          <span class="readonly">{{ editForm.cos_object_key }}</span>
        </el-form-item>
        <el-form-item label="教练">
          <span class="readonly">{{ editForm.coach_name || '—' }}</span>
        </el-form-item>
        <el-form-item label="技术类别" required>
          <el-select v-model="editForm.tech_category" style="width:100%">
            <el-option v-for="opt in TECH_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="技术标签">
          <el-input v-model="editForm.tagsText" placeholder="逗号分隔，如：forehand,topspin" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="submitEdit">保存</el-button>
      </span>
    </el-dialog>

    <!-- 任务 ID 列表 -->
    <task-id-list-dialog :visible.sync="taskDialogVisible" :task-ids="submittedTaskIds" />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  listClassifications,
  updateClassification,
  scanClassifications
} from '@/api/classifications'
import { submitKbExtraction, submitKbExtractionBatch } from '@/api/tasks'
import { submitPreprocessing, submitPreprocessingBatch } from '@/api/videoPreprocessing'
import { listCoaches } from '@/api/coaches'
import TaskIdListDialog from '@/components/TaskIdListDialog'

const TECH_CATEGORY_OPTIONS = [
  'forehand_attack', 'forehand_topspin', 'forehand_flick', 'forehand_push',
  'backhand_topspin', 'backhand_push', 'backhand_flick',
  'serve', 'receive', 'footwork', 'stance_grip', 'physical', 'other'
]

const BATCH_MAX = 50

export default {
  name: 'ClassificationsIndex',
  components: { TaskIdListDialog },
  data() {
    return {
      TECH_CATEGORY_OPTIONS,
      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
      listLoading: false,
      scanLoading: false,
      preprocessLoading: false,
      kbLoading: false,
      submittingId: '',
      coachOptions: [],
      filter: {
        coach_name: '',
        tech_category: '',
        kb_extracted: ''
      },
      editVisible: false,
      editLoading: false,
      editForm: {
        id: '',
        cos_object_key: '',
        coach_name: '',
        tech_category: '',
        tagsText: ''
      },
      taskDialogVisible: false,
      submittedTaskIds: []
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable })
  },
  created() {
    this.fetchCoaches()
    this.fetchList()
  },
  methods: {
    async fetchCoaches() {
      try {
        const { data } = await listCoaches()
        this.coachOptions = data || []
      } catch (e) {
        this.coachOptions = []
      }
    },
    buildParams() {
      const params = { page: this.page, page_size: this.pageSize }
      if (this.filter.coach_name) params.coach_name = this.filter.coach_name
      if (this.filter.tech_category) params.tech_category = this.filter.tech_category
      if (this.filter.kb_extracted !== '') params.kb_extracted = this.filter.kb_extracted
      return params
    },
    async fetchList() {
      this.listLoading = true
      try {
        const { data, meta } = await listClassifications(this.buildParams())
        this.list = data || []
        this.total = (meta && meta.total) || 0
      } catch (e) {
        this.list = []
        this.total = 0
      } finally {
        this.listLoading = false
      }
    },
    handleSearch() {
      this.page = 1
      this.fetchList()
    },
    handleReset() {
      this.filter = { coach_name: '', tech_category: '', kb_extracted: '' }
      this.page = 1
      this.fetchList()
    },
    onPageChange(p) { this.page = p; this.fetchList() },
    onSizeChange(s) { this.pageSize = s; this.page = 1; this.fetchList() },

    formatDate(iso) {
      if (!iso) return '—'
      return iso.replace('T', ' ').substring(0, 19)
    },

    // 编辑单条分类
    handleEdit(row) {
      this.editForm = {
        id: row.id,
        cos_object_key: row.cos_object_key,
        coach_name: row.coach_name || '',
        tech_category: row.tech_category || '',
        tagsText: (row.tech_tags || []).join(',')
      }
      this.editVisible = true
    },
    async submitEdit() {
      if (!this.editForm.tech_category) {
        this.$message.warning('技术类别为必填')
        return
      }
      this.editLoading = true
      try {
        // PATCH 只接受 tech_category（必填） + tech_tags（可选）
        const payload = { tech_category: this.editForm.tech_category }
        if (this.editForm.tagsText) {
          payload.tech_tags = this.editForm.tagsText
            .split(',').map(s => s.trim()).filter(Boolean)
        }
        await updateClassification(this.editForm.id, payload)
        this.$message.success('已更新')
        this.editVisible = false
        this.fetchList()
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.editLoading = false
      }
    },

    // 扫描 COS（异步任务）
    async handleScan() {
      try {
        await this.$confirm('将全量扫描 COS 并更新分类（Celery 异步任务），确认继续？', '重新扫描', {
          type: 'warning', confirmButtonText: '开始扫描', cancelButtonText: '取消'
        })
      } catch { return }
      this.scanLoading = true
      try {
        const { data } = await scanClassifications({ scan_mode: 'full' })
        const tid = (data && data.task_id) || ''
        this.$message.success(tid ? `扫描任务已提交：${tid.substring(0, 8)}…` : '扫描任务已提交')
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.scanLoading = false
      }
    },

    // 单条 KB 提取
    async handleSubmitKb(row) {
      try {
        await this.$confirm(`将提交 KB 提取任务\n${row.cos_object_key}`, '确认', { type: 'info' })
      } catch { return }
      this.submittingId = row.id
      try {
        const { data } = await submitKbExtraction({
          cos_object_key: row.cos_object_key,
          enable_audio_analysis: true,
          audio_language: 'zh'
        })
        const item = (data && data.items && data.items[0]) || data || {}
        const tid = item.task_id || item.existing_task_id
        if (item.accepted !== false && tid) {
          this.$message.success(`已提交：${tid.substring(0, 8)}…`)
        } else if (item.rejection_code === 'DUPLICATE_TASK' && tid) {
          this.$message.warning(`已存在活跃任务：${tid.substring(0, 8)}…`)
        } else {
          this.$message.warning(item.rejection_message || '提交被拒绝')
        }
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.submittingId = ''
      }
    },

    // 批量 KB 提取（基于当前页的 list）
    async handleBatchKb() {
      const items = this.list.filter(v => !v.kb_extracted)
      if (!items.length) {
        this.$message.warning('当前页没有待提取的记录')
        return
      }
      try {
        await this.$confirm(`将对当前页 ${items.length} 条未提取记录批量提交，确认继续？`, '批量 KB 提取', {
          type: 'warning', confirmButtonText: '提交', cancelButtonText: '取消'
        })
      } catch { return }
      this.kbLoading = true
      try {
        const taskIds = []
        let accepted = 0
        let rejected = 0
        for (let i = 0; i < items.length; i += BATCH_MAX) {
          const chunk = items.slice(i, i + BATCH_MAX)
          const payload = {
            items: chunk.map(r => ({
              cos_object_key: r.cos_object_key,
              enable_audio_analysis: true,
              audio_language: 'zh'
            }))
          }
          try {
            const { data } = await submitKbExtractionBatch(payload)
            accepted += data.accepted || 0
            rejected += data.rejected || 0
            for (const it of (data.items || [])) {
              const tid = it.task_id || it.existing_task_id
              if (tid) taskIds.push(tid)
            }
          } catch (e) {
            rejected += chunk.length
          }
        }
        this.submittedTaskIds = taskIds
        this.$alert(`accepted=${accepted} · rejected=${rejected}`, '批量 KB 提取完成', {
          type: rejected ? 'warning' : 'success'
        })
        if (taskIds.length) this.taskDialogVisible = true
      } finally {
        this.kbLoading = false
      }
    },

    // 批量预处理（基于当前页）
    async handleBatchPreprocess() {
      const items = this.list
      if (!items.length) return
      try {
        await this.$confirm(`将对当前页 ${items.length} 条记录提交预处理，确认继续？`, '批量预处理', {
          type: 'warning', confirmButtonText: '提交', cancelButtonText: '取消'
        })
      } catch { return }
      this.preprocessLoading = true
      try {
        let submitted = 0
        let reused = 0
        let failed = 0
        for (let i = 0; i < items.length; i += BATCH_MAX) {
          const chunk = items.slice(i, i + BATCH_MAX)
          try {
            const { data } = await submitPreprocessingBatch({
              items: chunk.map(r => ({ cos_object_key: r.cos_object_key, force: false }))
            })
            submitted += data.submitted || 0
            reused += data.reused || 0
            failed += data.failed || 0
          } catch (e) {
            failed += chunk.length
          }
        }
        this.$alert(
          `submitted=${submitted} · reused=${reused} · failed=${failed}`,
          '批量预处理完成',
          { type: failed ? 'warning' : 'success' }
        )
      } finally {
        this.preprocessLoading = false
      }
    },

    // 单条预处理
    async handleSubmitPreprocess(row) {
      try {
        await this.$confirm(`将提交预处理任务\n${row.cos_object_key}`, '确认', { type: 'info' })
      } catch { return }
      this.submittingId = row.id
      try {
        const { data } = await submitPreprocessing({
          cos_object_key: row.cos_object_key,
          force: false
        })
        const tid = (data && data.task_id) || ''
        if (tid) {
          this.$message.success(`已提交：${tid.substring(0, 8)}…`)
        } else {
          this.$message.warning('提交失败')
        }
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.submittingId = ''
      }
    }
  }
}
</script>

<style scoped>
.filter-bar { margin-bottom: 12px; }
.filter-bar .el-form { padding: 4px 0; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.path-cell {
  display: inline-block;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  color: #606266;
  font-size: 12px;
}
.readonly {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}
</style>
