<template>
  <div class="app-container">
    <div class="filter-container">
      <el-select v-model="filter.coach_name" placeholder="教练" clearable style="width: 130px" @change="fetchList" @clear="fetchList">
        <el-option v-for="c in coachOptions" :key="c.name" :label="c.name" :value="c.name" />
      </el-select>
      <el-select v-model="filter.tech_category" placeholder="技术类别" clearable style="width: 160px" @change="fetchList" @clear="fetchList">
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
      <el-select v-model="filter.video_type" placeholder="视频类型" clearable style="width: 130px" @change="fetchList" @clear="fetchList">
        <el-option label="教学视频" value="tutorial" />
        <el-option label="训练视频" value="training" />
      </el-select>
      <el-checkbox v-model="filter.manual_only" @change="handleManualOnlyChange">只看手动覆盖</el-checkbox>
      <el-button :loading="refreshLoading" :disabled="charPpUnavailable" @click="handleRefresh">重新扫描分类</el-button>
      <el-button type="primary" :disabled="charPpUnavailable" @click="showBatchSubmitDialog">批量知识库提取</el-button>
    </div>

    <el-table v-loading="listLoading" :data="pagedList" border fit highlight-current-row style="width: 100%">
      <el-table-column label="视频路径" min-width="180">
        <template slot-scope="{ row }">
          <span class="cell-path">{{ row.cos_object_key }}</span>
        </template>
      </el-table-column>
      <el-table-column label="教练" prop="coach_name" width="90" align="center">
        <template slot-scope="{ row }">{{ row.coach_name || '—' }}</template>
      </el-table-column>
      <el-table-column label="技术类别" prop="tech_category" width="110" align="center" />
      <el-table-column label="技术子类别" prop="tech_sub_category" width="110" align="center">
        <template slot-scope="{ row }">{{ row.tech_sub_category || '—' }}</template>
      </el-table-column>
      <el-table-column label="技术细节" prop="tech_detail" width="120" align="center">
        <template slot-scope="{ row }">{{ row.tech_detail || '—' }}</template>
      </el-table-column>
      <el-table-column label="动作类型" width="110" align="center">
        <template slot-scope="{ row }">{{ actionTypeLabel(row.action_type) }}</template>
      </el-table-column>
      <el-table-column label="视频类型" width="80" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.video_type === 'tutorial' ? 'primary' : 'success'" size="small">
            {{ row.video_type === 'tutorial' ? '教学' : '训练' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="置信度" width="75" align="center">
        <template slot-scope="{ row }">
          {{ row.classification_confidence != null ? (row.classification_confidence * 100).toFixed(0) + '%' : '—' }}
        </template>
      </el-table-column>
      <el-table-column label="手动覆盖" width="85" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.manually_overridden" type="warning" size="small">已覆盖</el-tag>
          <span v-else style="color:#C0C4CC">—</span>
        </template>
      </el-table-column>
      <el-table-column label="覆盖原因" min-width="120">
        <template slot-scope="{ row }">{{ row.override_reason || '—' }}</template>
      </el-table-column>
      <el-table-column label="分类时间" width="160" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.classified_at) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="160" align="center">
        <template slot-scope="{ row }">{{ formatDate(row.updated_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button class="action-btn" size="mini" type="primary" :disabled="charPpUnavailable" @click="handleEdit(row)">更新视频分类</el-button>
          <el-tooltip
            :disabled="!extractDisabledReason(row)"
            :content="extractDisabledReason(row) || ''"
            placement="top"
          >
            <span class="btn-wrapper">
              <el-button
                class="action-btn"
                size="mini"
                type="success"
                :disabled="!!extractDisabledReason(row)"
                :loading="submittingRowKey === row.cos_object_key"
                @click="handleSubmitSingle(row)"
              >知识库提取</el-button>
            </span>
          </el-tooltip>
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
    <el-dialog title="更新视频分类" :visible.sync="editDialogVisible" width="560px">
      <el-form ref="editForm" :model="editForm" label-width="100px">
        <el-form-item label="视频路径">
          <span class="form-readonly">{{ editForm.cos_object_key }}</span>
        </el-form-item>
        <el-form-item label="技术类别">
          <el-select v-model="editForm.tech_category" style="width: 100%" clearable>
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
        <el-form-item label="技术子类别">
          <el-input v-model="editForm.tech_sub_category" placeholder="可选，如：正手弧圈、反手拨球等" clearable />
        </el-form-item>
        <el-form-item label="技术细节">
          <el-input v-model="editForm.tech_detail" type="textarea" :rows="2" placeholder="可选，具体动作细节描述" />
        </el-form-item>
        <el-form-item label="动作类型">
          <el-select v-model="editForm.action_type" style="width: 100%" clearable filterable placeholder="可选">
            <el-option v-for="(label, key) in actionTypeOptions" :key="key" :label="label" :value="key" />
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
        <el-form-item label="覆盖原因">
          <el-input v-model="editForm.override_reason" type="textarea" :rows="2" placeholder="可选，说明覆盖原因" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitLoading" @click="submitEdit">确认覆盖</el-button>
      </span>
    </el-dialog>

    <!-- 批量提交范围选择 Dialog -->
    <el-dialog title="批量知识库提取" :visible.sync="batchScopeDialogVisible" width="500px">
      <div style="line-height:1.8">
        <p>请选择提交范围：</p>
        <p>
          <strong>当前筛选结果</strong>：共 <b>{{ filteredTutorialCount }}</b> 条教学视频
          <span style="color:#909399;font-size:12px">（按当前页筛选出的视频逐条精确提交）</span>
        </p>
        <p v-if="filter.manual_only" style="color:#909399;font-size:12px;margin-left:12px">
          已应用「只看手动覆盖」前端筛选
        </p>
        <p><strong>全量教学视频</strong>：不限筛选条件，由后端查询并提交所有教学视频</p>
      </div>
      <span slot="footer">
        <el-button :disabled="batchSubmitting" @click="batchScopeDialogVisible = false">取消</el-button>
        <el-button :loading="batchSubmitting" :disabled="!filteredTutorialCount || batchSubmitting" @click="handleBatchSubmit('filtered')">提交筛选结果（{{ filteredTutorialCount }} 条）</el-button>
        <el-button type="primary" :loading="batchSubmitting" :disabled="batchSubmitting" @click="handleBatchSubmit('all')">提交全量</el-button>
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
  batchSubmitKnowledgeExtraction,
  submitExpertVideo
} from '@/api/videoClassifications'
import { listCoaches } from '@/api/coaches'
import TaskIdListDialog from '@/components/TaskIdListDialog'

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
  forehand_loop_underspin: '正手拉下旋弧圈',
  forehand_backhand_transition: '正反手转换',
  backhand_topspin: '反手拉球',
  backhand_push: '反手推挡',
  backhand_flick: '反手挑球',
  backhand_general: '反手综合'
}

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
      editForm: {
        cos_object_key: '',
        tech_category: '',
        tech_sub_category: '',
        tech_detail: '',
        action_type: '',
        video_type: '',
        coach_name: '',
        override_reason: ''
      },
      editSubmitLoading: false,
      taskDialogVisible: false,
      submittedTaskIds: [],
      batchScopeDialogVisible: false,
      batchSubmitting: false,
      submittingRowKey: ''
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable }),
    actionTypeOptions() {
      return ACTION_TYPE_LABEL_MAP
    },
    hasFilter() {
      return !!(this.filter.coach_name || this.filter.tech_category || this.filter.video_type || this.filter.manual_only)
    },
    filteredList() {
      let result = this.list
      if (this.filter.manual_only) result = result.filter(v => v.manually_overridden)
      return result
    },
    filteredTutorialCount() {
      return this.filteredList.filter(v => v.video_type === 'tutorial').length
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
    actionTypeLabel(key) {
      return ACTION_TYPE_LABEL_MAP[key] || key || '—'
    },
    extractDisabledReason(row) {
      if (this.charPpUnavailable) return 'char_pp 服务当前不可用，无法提交'
      if (row.video_type !== 'tutorial') return '仅支持「教学视频」类型提交知识库提取'
      return ''
    },
    coachIdByName(name) {
      if (!name) return undefined
      const hit = this.coachOptions.find(c => c.name === name)
      return hit ? hit.id : undefined
    },
    formatDate(isoStr) {
      if (!isoStr) return '—'
      return isoStr.replace('T', ' ').substring(0, 19)
    },
    handleEdit(row) {
      this.editForm = {
        cos_object_key: row.cos_object_key,
        tech_category: row.tech_category || '',
        tech_sub_category: row.tech_sub_category || '',
        tech_detail: row.tech_detail || '',
        action_type: row.action_type || '',
        video_type: row.video_type || '',
        coach_name: row.coach_name || '',
        override_reason: row.override_reason || ''
      }
      this.editDialogVisible = true
    },
    async submitEdit() {
      this.editSubmitLoading = true
      try {
        await overrideClassification(this.editForm.cos_object_key, {
          tech_category: this.editForm.tech_category || undefined,
          tech_sub_category: this.editForm.tech_sub_category || undefined,
          tech_detail: this.editForm.tech_detail || undefined,
          action_type: this.editForm.action_type || undefined,
          video_type: this.editForm.video_type || undefined,
          coach_name: this.editForm.coach_name || undefined,
          override_reason: this.editForm.override_reason || undefined
        })
        this.$message.success('分类已更新')
        this.editDialogVisible = false
        this.fetchList()
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.editSubmitLoading = false
      }
    },
    showBatchSubmitDialog() {
      this.batchScopeDialogVisible = true
    },
    async handleRefresh() {
      await this.$confirm(
        '将对 COS 中所有视频重新扫描并分类（已手动覆盖的记录不受影响），此操作为全量扫描，确认继续？',
        '重新扫描分类',
        { type: 'warning', confirmButtonText: '全量扫描', cancelButtonText: '取消' }
      ).catch(() => { throw new Error('cancel') })
      this.refreshLoading = true
      try {
        const res = await refreshClassifications()
        const data = res.data || res
        this.$alert(
          `扫描完成：重新分类 ${data.refreshed} 条，跳过 ${data.skipped} 条（手动覆盖），共扫描 ${data.total_scanned} 条`,
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
    async handleSubmitSingle(row) {
      try {
        await this.$confirm(
          `将提交该视频进行知识提取，确认继续？\n${row.cos_object_key}`,
          '确认提交',
          { type: 'info', confirmButtonText: '确认', cancelButtonText: '取消' }
        )
      } catch (e) {
        return
      }
      this.submittingRowKey = row.cos_object_key
      try {
        const res = await submitExpertVideo({
          cos_object_key: row.cos_object_key,
          coach_id: this.coachIdByName(row.coach_name),
          enable_audio_analysis: true,
          audio_language: 'zh'
        })
        const data = res.data || res
        const taskId = data.task_id || data.id
        this.$message.success(taskId ? `已提交任务：${taskId}` : '已提交')
      } catch (e) {
        // 错误由拦截器处理
      } finally {
        this.submittingRowKey = ''
      }
    },
    async handleBatchSubmit(scope) {
      if (scope === 'filtered') {
        // 按 key 精确提交前端筛选到的每一条（避免 batch-submit 按条件匹配扩大范围）
        const rows = this.filteredList.filter(v => v.video_type === 'tutorial')
        if (!rows.length) {
          this.$message.warning('当前筛选结果中没有教学视频')
          return
        }
        try {
          await this.$confirm(
            `将按当前筛选结果精确提交 ${rows.length} 条教学视频，确认继续？`,
            '确认批量提交',
            { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
          )
        } catch (e) {
          return
        }
        this.batchSubmitting = true
        const taskIds = []
        let okCount = 0
        let failCount = 0
        try {
          for (const row of rows) {
            try {
              const res = await submitExpertVideo({
                cos_object_key: row.cos_object_key,
                coach_id: this.coachIdByName(row.coach_name),
                enable_audio_analysis: true,
                audio_language: 'zh'
              })
              const data = res.data || res
              const tid = data.task_id || data.id
              if (tid) taskIds.push(tid)
              okCount++
            } catch (e) {
              failCount++
            }
          }
          this.submittedTaskIds = taskIds
          this.batchScopeDialogVisible = false
          if (okCount === 0) {
            this.$alert('全部提交失败，请检查服务状态', '提交完成', { type: 'error' })
            return
          }
          const msg = failCount
            ? `成功 ${okCount} 条，失败 ${failCount} 条`
            : `已提交 ${okCount} 个知识提取任务`
          this.$message.success(msg)
          this.taskDialogVisible = true
        } finally {
          this.batchSubmitting = false
        }
      } else {
        // 全量：走后端 batch-submit（按 video_type=tutorial）
        try {
          await this.$confirm(
            '将提交全量教学视频进行知识提取，确认继续？',
            '确认批量提交',
            { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
          )
        } catch (e) {
          return
        }
        this.batchSubmitting = true
        try {
          const res = await batchSubmitKnowledgeExtraction({ video_type: 'tutorial' })
          const data = res.data || res
          this.submittedTaskIds = data.task_ids || []
          const submitted = data.submitted != null ? data.submitted : this.submittedTaskIds.length
          this.batchScopeDialogVisible = false
          if (submitted === 0) {
            this.$alert('后端未匹配到待提交的教学视频', '提交完成', { type: 'warning' })
            return
          }
          this.$message.success(`已提交 ${submitted} 个知识提取任务`)
          this.taskDialogVisible = true
        } catch (e) {
          // 错误由拦截器处理
        } finally {
          this.batchSubmitting = false
        }
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
.action-btn {
  width: 92px;
  padding-left: 0;
  padding-right: 0;
  margin: 2px 0;
}
.action-btn + .action-btn {
  margin-left: 0;
}
.btn-wrapper {
  display: inline-block;
}
.btn-wrapper > .el-button.is-disabled {
  pointer-events: auto;
}
.form-readonly {
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}
</style>
