<template>
  <div class="char-pp-dashboard">
    <div class="hello-bar">
      <div>
        <div class="title">乒乓 AI · 管理控制台</div>
        <div class="sub">围绕「视频分类 → 预处理 → KB 提取 → 技术标准 → 运动员诊断」的流水线管理入口。</div>
      </div>
      <el-tag v-if="charPpUnavailable" type="danger" size="small">char_pp 服务不可用</el-tag>
      <el-tag v-else type="success" size="small">char_pp 在线</el-tag>
    </div>

    <!-- 关键指标面板 -->
    <el-row :gutter="20" class="metric-row">
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <div class="metric-card clickable" @click="go('/classifications')">
          <div class="metric-icon videos"><i class="el-icon-video-camera" /></div>
          <div class="metric-body">
            <div class="metric-title">视频分类</div>
            <div class="metric-value">{{ formatInt(metrics.classifications) }}</div>
            <div class="metric-hint">已分类记录数</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <div class="metric-card clickable" @click="go('/coaches')">
          <div class="metric-icon coaches"><i class="el-icon-trophy" /></div>
          <div class="metric-body">
            <div class="metric-title">教练</div>
            <div class="metric-value">{{ formatInt(metrics.coaches) }}</div>
            <div class="metric-hint">活跃教练数</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <div class="metric-card clickable" @click="go('/extraction-jobs')">
          <div class="metric-icon jobs"><i class="el-icon-share" /></div>
          <div class="metric-body">
            <div class="metric-title">KB 提取作业</div>
            <div class="metric-value">{{ formatInt(metrics.extractionJobs) }}</div>
            <div class="metric-hint">累计提取作业</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6">
        <div class="metric-card clickable" @click="go('/tasks')">
          <div class="metric-icon tasks"><i class="el-icon-time" /></div>
          <div class="metric-body">
            <div class="metric-title">任务</div>
            <div class="metric-value">{{ formatInt(metrics.tasks) }}</div>
            <div class="metric-hint">Feature-013 全通道任务</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- KB 提取作业状态 + 最近任务 -->
    <el-row :gutter="20">
      <el-col :xs="24" :lg="12">
        <el-card class="panel-card" shadow="never">
          <div slot="header" class="panel-header">
            <span>KB 提取作业状态分布</span>
            <el-button type="text" @click="go('/extraction-jobs')">前往详情</el-button>
          </div>
          <el-row :gutter="8" class="jobs-status-row">
            <el-col :span="6">
              <div class="status-cell running"><div class="n">{{ jobStatusCounts.running }}</div><div class="l">running</div></div>
            </el-col>
            <el-col :span="6">
              <div class="status-cell pending"><div class="n">{{ jobStatusCounts.pending }}</div><div class="l">pending</div></div>
            </el-col>
            <el-col :span="6">
              <div class="status-cell success"><div class="n">{{ jobStatusCounts.success }}</div><div class="l">success</div></div>
            </el-col>
            <el-col :span="6">
              <div class="status-cell failed"><div class="n">{{ jobStatusCounts.failed }}</div><div class="l">failed</div></div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="panel-card" shadow="never">
          <div slot="header" class="panel-header">
            <span>最近任务</span>
            <el-button type="text" @click="go('/tasks')">前往详情</el-button>
          </div>
          <el-table v-loading="recentTasksLoading" :data="recentTasks" size="small" :show-header="false">
            <el-table-column width="110">
              <template slot-scope="{ row }">
                <el-tag size="mini" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column>
              <template slot-scope="{ row }">
                <span class="mono">{{ taskTypeLabel(row.task_type) }}</span>
                <span class="task-video">{{ row.cos_object_key || row.video_path || '' }}</span>
              </template>
            </el-table-column>
            <el-table-column width="140" align="right">
              <template slot-scope="{ row }">
                <span class="task-time">{{ formatRel(row.created_at) }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!recentTasks.length && !recentTasksLoading" class="empty-tip">暂无任务</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-card class="panel-card" shadow="never" style="margin-top: 20px">
      <div slot="header" class="panel-header">
        <span>快捷入口</span>
      </div>
      <el-row :gutter="16">
        <el-col v-for="link in quickLinks" :key="link.path" :xs="12" :sm="8" :md="6" :lg="4">
          <div class="quick-link" @click="go(link.path)">
            <i :class="link.icon" />
            <span>{{ link.title }}</span>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listClassifications } from '@/api/classifications'
import { listCoaches } from '@/api/coaches'
import { listTasks } from '@/api/tasks'
import { listExtractionJobs } from '@/api/extractionJobs'

const STATUS_TAG = {
  pending: 'info',
  processing: 'warning',
  success: 'success',
  partial_success: 'primary',
  failed: 'danger',
  rejected: 'danger'
}
const STATUS_LABEL = {
  pending: '待处理',
  processing: '处理中',
  success: '已完成',
  partial_success: '部分完成',
  failed: '失败',
  rejected: '已拒绝'
}
const TASK_TYPE_LABEL = {
  video_classification: '视频分类',
  kb_extraction: '知识库提取',
  athlete_diagnosis: '动作诊断',
  video_preprocessing: '视频预处理',
  expert_video: '教练视频',
  athlete_video: '运动员视频'
}

export default {
  name: 'Dashboard',
  data() {
    return {
      metrics: {
        classifications: 0,
        coaches: 0,
        extractionJobs: 0,
        tasks: 0
      },
      jobStatusCounts: {
        pending: 0,
        running: 0,
        success: 0,
        failed: 0
      },
      recentTasks: [],
      recentTasksLoading: false,
      quickLinks: [
        { title: '教练管理', path: '/coaches', icon: 'el-icon-trophy' },
        { title: '视频分类管理', path: '/classifications', icon: 'el-icon-video-camera' },
        { title: '视频预处理', path: '/video-preprocessing', icon: 'el-icon-film' },
        { title: 'KB 提取作业', path: '/extraction-jobs', icon: 'el-icon-share' },
        { title: '知识库版本', path: '/knowledge-base/list', icon: 'el-icon-reading' },
        { title: '教学提示', path: '/knowledge-base/teaching-tips', icon: 'el-icon-chat-line-round' },
        { title: '技术标准', path: '/standards', icon: 'el-icon-data-analysis' },
        { title: '动作诊断', path: '/diagnosis', icon: 'el-icon-cpu' },
        { title: '任务监控', path: '/tasks', icon: 'el-icon-time' },
        { title: '通道管理', path: '/channels', icon: 'el-icon-connection' }
      ]
    }
  },
  computed: {
    ...mapState({ charPpUnavailable: state => state.app.charPpUnavailable })
  },
  mounted() {
    this.loadAll()
  },
  methods: {
    async loadAll() {
      this.loadClassifications()
      this.loadCoaches()
      this.loadJobStats()
      this.loadTasks()
    },
    async loadClassifications() {
      try {
        const { meta } = await listClassifications({ page: 1, page_size: 1 })
        this.metrics.classifications = (meta && meta.total) || 0
      } catch (e) {
        // silently ignore
      }
    },
    async loadCoaches() {
      try {
        const { data } = await listCoaches({ include_inactive: false })
        this.metrics.coaches = (data || []).length
      } catch (e) {
        // silently ignore
      }
    },
    async loadJobStats() {
      const statuses = ['pending', 'running', 'success', 'failed']
      let total = 0
      for (const s of statuses) {
        try {
          const { meta } = await listExtractionJobs({ page: 1, page_size: 1, status: s })
          const count = (meta && meta.total) || 0
          this.jobStatusCounts[s] = count
          total += count
        } catch (e) {
          this.jobStatusCounts[s] = 0
        }
      }
      this.metrics.extractionJobs = total
    },
    async loadTasks() {
      this.recentTasksLoading = true
      try {
        const { data, meta } = await listTasks({ page: 1, page_size: 6, sort_by: 'created_at', order: 'desc' })
        this.metrics.tasks = (meta && meta.total) || 0
        this.recentTasks = data || []
      } catch (e) {
        this.recentTasks = []
      } finally {
        this.recentTasksLoading = false
      }
    },
    go(path) {
      this.$router.push(path).catch(() => {})
    },
    statusTagType(s) { return STATUS_TAG[s] || 'info' },
    statusLabel(s) { return STATUS_LABEL[s] || s },
    taskTypeLabel(t) { return TASK_TYPE_LABEL[t] || t || '—' },
    formatInt(n) { return (n || 0).toLocaleString() },
    formatRel(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      const diff = Date.now() - d.getTime()
      const min = Math.floor(diff / 60000)
      if (min < 1) return '刚刚'
      if (min < 60) return `${min} 分钟前`
      const hr = Math.floor(min / 60)
      if (hr < 24) return `${hr} 小时前`
      return iso.replace('T', ' ').substring(0, 16)
    }
  }
}
</script>

<style lang="scss" scoped>
.char-pp-dashboard {
  padding: 20px;
}
.hello-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 18px;

  .title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
  .sub {
    color: #909399;
    font-size: 13px;
    margin-top: 4px;
  }
}
.metric-row {
  margin-bottom: 20px;
}
.metric-card {
  display: flex;
  align-items: center;
  padding: 18px 20px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &.clickable {
    cursor: pointer;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  }

  .metric-icon {
    width: 52px;
    height: 52px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    color: #fff;
    margin-right: 16px;

    &.videos { background: #409EFF; }
    &.coaches { background: #67C23A; }
    &.jobs { background: #8e57e8; }
    &.tasks { background: #E6A23C; }
  }
  .metric-body {
    flex: 1;
  }
  .metric-title {
    color: #909399;
    font-size: 13px;
  }
  .metric-value {
    color: #303133;
    font-size: 24px;
    font-weight: 600;
    margin: 4px 0 2px;
  }
  .metric-hint {
    color: #C0C4CC;
    font-size: 12px;
  }
}
.panel-card {
  border-radius: 6px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.jobs-status-row {
  padding: 4px 0;
}
.status-cell {
  text-align: center;
  padding: 14px 0;
  border-radius: 6px;
  color: #fff;

  .n {
    font-size: 22px;
    font-weight: 600;
  }
  .l {
    font-size: 12px;
    opacity: 0.85;
    margin-top: 4px;
  }
  &.running { background: #409EFF; }
  &.pending { background: #909399; }
  &.success { background: #67C23A; }
  &.failed  { background: #F56C6C; }
}
.mono {
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  margin-right: 6px;
  color: #606266;
}
.task-video {
  color: #909399;
  font-size: 12px;
}
.task-time {
  color: #C0C4CC;
  font-size: 12px;
}
.empty-tip {
  color: #C0C4CC;
  text-align: center;
  padding: 20px 0;
  font-size: 13px;
}
.quick-link {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  margin-bottom: 12px;
  transition: background 0.15s ease, color 0.15s ease;

  i {
    font-size: 20px;
    margin-right: 8px;
  }

  &:hover {
    background: #409EFF;
    color: #fff;
  }
}
</style>
