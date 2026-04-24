<template>
  <div class="app-container">
    <!-- 筛选栏 -->
    <el-card class="filter-bar">
      <el-form :inline="true" @submit.native.prevent="handleSearch">
        <el-form-item label="状态">
          <el-select v-model="filter.status" clearable placeholder="全部状态" style="width:130px">
            <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务类型">
          <el-select v-model="filter.taskType" clearable placeholder="全部类型" style="width:130px">
            <el-option v-for="opt in TASK_TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="教练">
          <el-select
            v-model="filter.coachId"
            clearable
            filterable
            placeholder="全部教练"
            :loading="coachLoading"
            style="width:150px"
          >
            <el-option v-for="opt in coachOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="filter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="yyyy-MM-ddTHH:mm:ssZ"
            style="width:260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="sort-controls">
        <span class="sort-label">排序：</span>
        <el-select v-model="sortBy" style="width:130px" @change="onSortChange">
          <el-option label="按创建时间" value="created_at" />
          <el-option label="按完成时间" value="completed_at" />
        </el-select>
        <el-select v-model="order" style="width:90px;margin-left:8px" @change="onSortChange">
          <el-option label="倒序" value="desc" />
          <el-option label="正序" value="asc" />
        </el-select>
      </div>
      <el-button
        icon="el-icon-refresh"
        circle
        :loading="loading"
        title="刷新"
        @click="handleRefresh"
      />
    </div>

    <!-- 任务列表 -->
    <el-table v-loading="loading" :data="list" border style="width:100%;margin-top:8px">
      <el-table-column label="任务 ID" width="200">
        <template slot-scope="{ row }">
          <el-tooltip :content="row.task_id" placement="top">
            <span class="task-id-cell">{{ row.task_id ? row.task_id.substring(0, 8) + '…' : '—' }}</span>
          </el-tooltip>
          <el-button
            type="text"
            icon="el-icon-copy-document"
            style="margin-left:4px;padding:0"
            @click="copyToClipboard(row.task_id)"
          />
        </template>
      </el-table-column>

      <el-table-column label="类型" width="110">
        <template slot-scope="{ row }">
          <el-tag :type="row.task_type === 'expert_video' ? 'primary' : 'success'" size="small">
            {{ taskTypeLabel(row.task_type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="110">
        <template slot-scope="{ row }">
          <el-tag
            :type="statusTagType(row.status)"
            :class="row.status === 'rejected' ? 'rejected-tag' : ''"
            size="small"
          >{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="教练" prop="coach_name" width="120">
        <template slot-scope="{ row }">{{ row.coach_name || '—' }}</template>
      </el-table-column>

      <el-table-column label="视频文件名" show-overflow-tooltip min-width="160">
        <template slot-scope="{ row }">{{ row.video_filename || '—' }}</template>
      </el-table-column>

      <el-table-column label="进度" width="130">
        <template slot-scope="{ row }">
          <el-progress :percentage="row.progress_pct || 0" :stroke-width="6" />
        </template>
      </el-table-column>

      <el-table-column label="创建时间" width="160">
        <template slot-scope="{ row }">{{ formatTime(row.created_at) }}</template>
      </el-table-column>

      <el-table-column label="完成时间" width="160">
        <template slot-scope="{ row }">{{ formatTime(row.completed_at) }}</template>
      </el-table-column>

      <el-table-column label="操作" width="80" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" @click="openDetail(row.task_id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      style="margin-top:16px;text-align:right"
      :current-page.sync="page"
      :page-sizes="[10, 20, 50]"
      :page-size.sync="pageSize"
      :total="total"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="onPageChange"
      @size-change="onSizeChange"
    />

    <!-- 详情抽屉 -->
    <el-drawer
      :visible.sync="drawer.visible"
      direction="rtl"
      size="600px"
      title="任务详情"
    >
      <div v-loading="drawer.loading" class="drawer-content">
        <template v-if="drawer.task">
          <!-- 基础信息 -->
          <el-descriptions title="基础信息" :column="2" border size="small" style="margin-bottom:20px">
            <el-descriptions-item label="任务 ID" :span="2">
              <span class="task-id-cell">{{ drawer.task.task_id }}</span>
              <el-button
                type="text"
                icon="el-icon-copy-document"
                style="margin-left:4px"
                @click="copyToClipboard(drawer.task.task_id)"
              />
            </el-descriptions-item>
            <el-descriptions-item label="任务类型">
              <el-tag :type="drawer.task.task_type === 'expert_video' ? 'primary' : 'success'" size="small">
                {{ taskTypeLabel(drawer.task.task_type) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag
                :type="statusTagType(drawer.task.status)"
                :class="drawer.task.status === 'rejected' ? 'rejected-tag' : ''"
                size="small"
              >{{ statusLabel(drawer.task.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="教练">{{ drawer.task.coach_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="知识库版本">{{ drawer.task.knowledge_base_version || '—' }}</el-descriptions-item>
            <el-descriptions-item label="视频文件名" :span="2">{{ drawer.task.video_filename || '—' }}</el-descriptions-item>
            <el-descriptions-item label="视频时长">
              {{ drawer.task.video_duration_seconds != null ? drawer.task.video_duration_seconds + ' 秒' : '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="进度">
              {{ drawer.task.progress_pct != null ? drawer.task.progress_pct + '%' : '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(drawer.task.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="开始处理">{{ formatTime(drawer.task.started_at) }}</el-descriptions-item>
            <el-descriptions-item label="完成时间" :span="2">{{ formatTime(drawer.task.completed_at) }}</el-descriptions-item>
            <el-descriptions-item v-if="drawer.task.error_message" label="错误信息" :span="2">
              <span class="error-text">{{ drawer.task.error_message }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="drawer.task.rejection_reason" label="拒绝原因" :span="2">
              <span class="error-text">{{ drawer.task.rejection_reason }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 处理统计 -->
          <el-descriptions
            v-if="drawer.task.summary"
            title="处理统计"
            :column="3"
            border
            size="small"
            style="margin-bottom:20px"
          >
            <el-descriptions-item label="技术点数量">{{ drawer.task.summary.tech_point_count }}</el-descriptions-item>
            <el-descriptions-item label="音频转录">{{ drawer.task.summary.has_transcript ? '有' : '无' }}</el-descriptions-item>
            <el-descriptions-item label="语义分段数">{{ drawer.task.summary.semantic_segment_count }}</el-descriptions-item>
            <el-descriptions-item label="动作分析分段">{{ drawer.task.summary.motion_analysis_count }}</el-descriptions-item>
            <el-descriptions-item label="偏差报告数">{{ drawer.task.summary.deviation_count }}</el-descriptions-item>
            <el-descriptions-item label="建议条数">{{ drawer.task.summary.advice_count }}</el-descriptions-item>
          </el-descriptions>

          <!-- 耗时统计 -->
          <el-descriptions
            v-if="drawer.task.timing_stats && Object.keys(drawer.task.timing_stats).length"
            title="耗时统计"
            :column="2"
            border
            size="small"
          >
            <el-descriptions-item
              v-for="(value, key) in drawer.task.timing_stats"
              :key="key"
              :label="key"
            >{{ typeof value === 'number' ? value.toFixed(2) + ' 秒' : value }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import { listTasks, getTaskDetail } from '@/api/tasks'
import { listCoaches } from '@/api/coaches'

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'success', label: '已完成' },
  { value: 'partial_success', label: '部分完成' },
  { value: 'failed', label: '失败' },
  { value: 'rejected', label: '已拒绝' }
]

const TASK_TYPE_OPTIONS = [
  { value: 'expert_video', label: '教练视频' },
  { value: 'athlete_video', label: '运动员视频' }
]

const STATUS_TAG_MAP = {
  pending: 'info',
  processing: 'warning',
  success: 'success',
  partial_success: 'primary',
  failed: 'danger',
  rejected: 'danger'
}

const STATUS_LABEL_MAP = {
  pending: '待处理',
  processing: '处理中',
  success: '已完成',
  partial_success: '部分完成',
  failed: '失败',
  rejected: '已拒绝'
}

const TASK_TYPE_LABEL_MAP = {
  expert_video: '教练视频',
  athlete_video: '运动员视频'
}

export default {
  name: 'TasksIndex',
  data() {
    return {
      STATUS_OPTIONS,
      TASK_TYPE_OPTIONS,

      list: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
      coachLoading: false,

      filter: {
        status: '',
        taskType: '',
        coachId: '',
        createdAfter: '',
        createdBefore: '',
        dateRange: []
      },

      sortBy: 'created_at',
      order: 'desc',

      coachOptions: [],

      drawer: {
        visible: false,
        loading: false,
        task: null
      }
    }
  },
  created() {
    this.loadCoachOptions()
    this.fetchList()
  },
  methods: {
    // 工具方法
    formatTime(val) {
      if (!val) return '—'
      const d = new Date(val)
      if (isNaN(d.getTime())) return val
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    statusTagType(status) {
      return STATUS_TAG_MAP[status] || 'info'
    },
    statusLabel(status) {
      return STATUS_LABEL_MAP[status] || status
    },
    taskTypeLabel(type) {
      return TASK_TYPE_LABEL_MAP[type] || type
    },
    copyToClipboard(text) {
      if (!text) return
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          this.$message.success('已复制')
        }).catch(() => {
          this.$message.error('复制失败')
        })
      } else {
        const el = document.createElement('textarea')
        el.value = text
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        this.$message.success('已复制')
      }
    },

    // 数据加载
    async loadCoachOptions() {
      this.coachLoading = true
      try {
        const res = await listCoaches()
        const coaches = Array.isArray(res) ? res : (res.data || res.items || [])
        this.coachOptions = coaches.map(c => ({ value: c.id, label: c.name }))
      } catch (e) {
        this.coachOptions = []
      } finally {
        this.coachLoading = false
      }
    },

    async fetchList() {
      this.loading = true
      try {
        const params = {
          page: this.page,
          page_size: this.pageSize,
          sort_by: this.sortBy,
          order: this.order
        }
        if (this.filter.status) params.status = this.filter.status
        if (this.filter.taskType) params.task_type = this.filter.taskType
        if (this.filter.coachId) params.coach_id = this.filter.coachId
        if (this.filter.createdAfter) params.created_after = this.filter.createdAfter
        if (this.filter.createdBefore) params.created_before = this.filter.createdBefore

        const res = await listTasks(params)
        this.list = res.items || []
        this.total = res.total || 0
      } catch (e) {
        this.$message.error('加载失败，请刷新重试')
        this.list = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },

    // 筛选操作
    handleSearch() {
      if (this.filter.dateRange && this.filter.dateRange.length === 2) {
        this.filter.createdAfter = this.filter.dateRange[0]
        this.filter.createdBefore = this.filter.dateRange[1]
      } else {
        this.filter.createdAfter = ''
        this.filter.createdBefore = ''
      }
      this.page = 1
      this.fetchList()
    },

    handleReset() {
      this.filter = {
        status: '',
        taskType: '',
        coachId: '',
        createdAfter: '',
        createdBefore: '',
        dateRange: []
      }
      this.sortBy = 'created_at'
      this.order = 'desc'
      this.page = 1
      this.fetchList()
    },

    // 排序
    onSortChange() {
      this.page = 1
      this.fetchList()
    },

    // 刷新
    handleRefresh() {
      this.fetchList()
    },

    // 分页
    onPageChange(val) {
      this.page = val
      this.fetchList()
    },

    onSizeChange(val) {
      this.pageSize = val
      this.page = 1
      this.fetchList()
    },

    // 详情
    async openDetail(taskId) {
      this.drawer.visible = true
      this.drawer.loading = true
      this.drawer.task = null
      try {
        const res = await getTaskDetail(taskId)
        this.drawer.task = res
      } catch (e) {
        this.drawer.visible = false
      } finally {
        this.drawer.loading = false
      }
    }
  }
}
</script>

<style scoped>
.filter-bar {
  margin-bottom: 12px;
}
.filter-bar .el-form {
  padding: 4px 0;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.sort-controls {
  display: flex;
  align-items: center;
}
.sort-label {
  font-size: 13px;
  color: #606266;
  margin-right: 4px;
}
.task-id-cell {
  font-family: monospace;
  font-size: 12px;
}
.rejected-tag {
  background-color: #c0392b !important;
  border-color: #c0392b !important;
  color: #fff !important;
}
.error-text {
  color: #f56c6c;
}
.drawer-content {
  padding: 16px 20px;
  min-height: 200px;
}
</style>
