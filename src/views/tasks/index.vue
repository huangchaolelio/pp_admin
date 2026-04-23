<template>
  <div class="app-container">
    <el-card class="placeholder-card">
      <div slot="header">
        <span><i class="el-icon-time" /> 任务监控</span>
      </div>
      <el-alert
        type="info"
        title="功能建设中"
        description="任务监控功能正在建设中，依赖 char_pp 任务列表接口（GET /api/v1/tasks）就绪后上线。"
        show-icon
        :closable="false"
        style="margin-bottom: 24px"
      />
      <div class="task-query-section">
        <p class="section-title">查询单条任务详情</p>
        <el-form :inline="true" @submit.native.prevent="queryTask">
          <el-form-item label="任务 ID">
            <el-input v-model="taskId" placeholder="请输入任务 ID（UUID）" style="width: 360px" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :disabled="!taskId" @click="queryTask">查询</el-button>
          </el-form-item>
        </el-form>

        <div v-if="taskDetail" class="task-detail">
          <el-descriptions title="任务详情" :column="2" border>
            <el-descriptions-item label="任务 ID">{{ taskDetail.task_id }}</el-descriptions-item>
            <el-descriptions-item label="任务类型">
              <el-tag :type="taskDetail.task_type === 'expert' ? 'primary' : 'success'">
                {{ taskDetail.task_type === 'expert' ? '专家视频' : '运动员视频' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(taskDetail.status)">{{ statusLabel(taskDetail.status) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ taskDetail.created_at }}</el-descriptions-item>
            <el-descriptions-item label="视频路径" :span="2">{{ taskDetail.video_path }}</el-descriptions-item>
            <el-descriptions-item v-if="taskDetail.error_message" label="错误原因" :span="2">
              <span class="error-text">{{ taskDetail.error_message }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <el-empty v-if="queried && !taskDetail" description="未找到对应任务" />
      </div>
    </el-card>
  </div>
</template>

<script>
import request from '@/utils/charPpRequest'

export default {
  name: 'TasksIndex',
  data() {
    return {
      taskId: this.$route.query.task_id || '',
      taskDetail: null,
      queried: false,
      loading: false
    }
  },
  created() {
    if (this.taskId) {
      this.queryTask()
    }
  },
  methods: {
    async queryTask() {
      if (!this.taskId) return
      this.loading = true
      this.queried = false
      this.taskDetail = null
      try {
        const res = await request({ url: `/api/v1/tasks/${this.taskId}`, method: 'get' })
        this.taskDetail = res.data || res
        this.queried = true
      } catch (e) {
        this.queried = true
      } finally {
        this.loading = false
      }
    },
    statusTagType(status) {
      const map = { pending: 'info', processing: 'warning', completed: 'success', failed: 'danger' }
      return map[status] || 'info'
    },
    statusLabel(status) {
      const map = { pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }
      return map[status] || status
    }
  }
}
</script>

<style scoped>
.placeholder-card {
  max-width: 900px;
}
.section-title {
  font-size: 14px;
  color: #606266;
  margin: 0 0 16px;
  font-weight: 600;
}
.task-detail {
  margin-top: 20px;
}
.task-query-section {
  padding: 8px 0;
}
.error-text {
  color: #f56c6c;
}
</style>
