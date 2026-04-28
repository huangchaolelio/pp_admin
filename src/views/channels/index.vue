<template>
  <div class="app-container">
    <!-- 说明 -->
    <el-card class="page-header" shadow="never">
      <div class="page-title">任务通道管理</div>
      <div class="page-desc">
        Feature-013/016：四通道物理隔离的实时快照与容量/并发/启停的热更新（30 秒内生效）。
        任何修改均需 <b>管理员 Token</b>（对应 .env 中 <code>ADMIN_RESET_TOKEN</code>）。
      </div>
    </el-card>

    <!-- 管理员 Token -->
    <el-card class="token-bar" shadow="never">
      <el-form :inline="true" @submit.native.prevent>
        <el-form-item label="管理员 Token">
          <el-input
            v-model="adminToken"
            :type="tokenVisible ? 'text' : 'password'"
            placeholder="仅保存在浏览器内存中，刷新页面即失效"
            clearable
            style="width:320px"
          >
            <el-button
              slot="append"
              :icon="tokenVisible ? 'el-icon-view' : 'el-icon-lock'"
              @click="tokenVisible = !tokenVisible"
            />
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-tag v-if="adminToken" type="success" size="small">已输入（仅本次会话有效）</el-tag>
          <el-tag v-else type="info" size="small">未输入则无法执行任何修改操作</el-tag>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="summary">
        <span>共 <b>{{ total }}</b> 个通道</span>
        <span class="sep">|</span>
        <span>启用中：<b class="good">{{ enabledCount }}</b></span>
        <span class="sep">|</span>
        <span>已停用：<b class="warn">{{ disabledCount }}</b></span>
        <span class="sep">|</span>
        <span>最近抓取：{{ fetchedAtText }}</span>
      </div>
      <div>
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text=""
          style="margin-right:12px"
          @change="onAutoRefreshChange"
        />
        <el-button icon="el-icon-refresh" :loading="loading" @click="fetchList">刷新</el-button>
      </div>
    </div>

    <!-- 通道列表 -->
    <el-table
      v-loading="loading"
      :data="list"
      border
      style="width:100%;margin-top:8px"
    >
      <el-table-column label="通道" min-width="180">
        <template slot-scope="{ row }">
          <div class="chan-cell">
            <el-tag :type="channelTagType(row.task_type)" size="medium">{{ channelLabel(row.task_type) }}</el-tag>
            <div class="chan-sub">{{ row.task_type }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="110" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="队列容量" width="110" align="center">
        <template slot-scope="{ row }">{{ row.queue_capacity }}</template>
      </el-table-column>

      <el-table-column label="并发数" width="90" align="center">
        <template slot-scope="{ row }">{{ row.concurrency }}</template>
      </el-table-column>

      <el-table-column label="pending" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.current_pending > 0" type="warning" size="mini">{{ row.current_pending }}</el-tag>
          <span v-else>0</span>
        </template>
      </el-table-column>

      <el-table-column label="processing" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag v-if="row.current_processing > 0" type="primary" size="mini">{{ row.current_processing }}</el-tag>
          <span v-else>0</span>
        </template>
      </el-table-column>

      <el-table-column label="剩余槽位" width="160">
        <template slot-scope="{ row }">
          <el-progress
            :percentage="usagePercent(row)"
            :color="usageColor(row)"
            :stroke-width="10"
            :format="() => `${row.remaining_slots} / ${row.queue_capacity}`"
          />
        </template>
      </el-table-column>

      <el-table-column label="最近完成率" width="130" align="center">
        <template slot-scope="{ row }">
          <el-tooltip content="最近窗口内每分钟完成的任务数" placement="top">
            <span>{{ (row.recent_completion_rate_per_min || 0).toFixed(2) }}/min</span>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="230" fixed="right">
        <template slot-scope="{ row }">
          <el-button
            size="mini"
            type="primary"
            icon="el-icon-edit"
            :disabled="!adminToken"
            @click="handleEdit(row)"
          >编辑</el-button>
          <el-button
            size="mini"
            :type="row.enabled ? 'warning' : 'success'"
            :icon="row.enabled ? 'el-icon-turn-off' : 'el-icon-open'"
            :disabled="!adminToken"
            :loading="togglingType === row.task_type"
            @click="handleToggle(row)"
          >{{ row.enabled ? '停用' : '启用' }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog
      title="编辑通道配置"
      :visible.sync="editVisible"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="editForm"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="通道">
          <el-tag :type="channelTagType(editForm.task_type)" size="small">
            {{ channelLabel(editForm.task_type) }}
          </el-tag>
          <span class="chan-sub" style="margin-left:8px">{{ editForm.task_type }}</span>
        </el-form-item>
        <el-form-item label="队列容量" prop="queue_capacity">
          <el-input-number
            v-model="editForm.queue_capacity"
            :min="1"
            :max="10000"
            :step="1"
            style="width:200px"
          />
          <span class="form-hint">1 ~ 10000</span>
        </el-form-item>
        <el-form-item label="并发数" prop="concurrency">
          <el-input-number
            v-model="editForm.concurrency"
            :min="1"
            :max="64"
            :step="1"
            style="width:200px"
          />
          <span class="form-hint">1 ~ 64</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="editForm.enabled" />
        </el-form-item>
        <div class="hint-box">
          <i class="el-icon-info" />
          变更后最长 30 秒内各 Worker 重新加载新配置。
        </div>
      </el-form>
      <span slot="footer">
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listChannels, patchChannelConfig } from '@/api/channels'

const CHANNEL_LABEL = {
  video_classification: '视频分类',
  kb_extraction: 'KB 提取',
  athlete_diagnosis: '运动员诊断',
  video_preprocessing: '视频预处理'
}

const CHANNEL_TAG = {
  video_classification: '',
  kb_extraction: 'success',
  athlete_diagnosis: 'danger',
  video_preprocessing: 'warning'
}

export default {
  name: 'ChannelsIndex',
  data() {
    return {
      list: [],
      total: 0,
      loading: false,
      adminToken: '',
      tokenVisible: false,
      autoRefresh: false,
      refreshTimer: null,
      fetchedAt: null,
      togglingType: '',
      editVisible: false,
      saving: false,
      editForm: {
        task_type: '',
        queue_capacity: 0,
        concurrency: 1,
        enabled: true
      },
      editRules: {
        queue_capacity: [
          { required: true, message: '请输入队列容量', trigger: 'blur' },
          { type: 'number', min: 1, max: 10000, message: '1 ~ 10000', trigger: 'blur' }
        ],
        concurrency: [
          { required: true, message: '请输入并发数', trigger: 'blur' },
          { type: 'number', min: 1, max: 64, message: '1 ~ 64', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    enabledCount() { return this.list.filter(c => c.enabled).length },
    disabledCount() { return this.list.filter(c => !c.enabled).length },
    fetchedAtText() {
      if (!this.fetchedAt) return '—'
      const d = this.fetchedAt
      const pad = n => (n < 10 ? '0' + n : '' + n)
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
  },
  created() {
    this.fetchList()
  },
  beforeDestroy() {
    this.clearTimer()
  },
  methods: {
    channelLabel(t) { return CHANNEL_LABEL[t] || t },
    channelTagType(t) { return CHANNEL_TAG[t] || '' },

    usagePercent(row) {
      if (!row.queue_capacity) return 0
      const used = row.queue_capacity - row.remaining_slots
      const pct = Math.round((used / row.queue_capacity) * 100)
      return Math.max(0, Math.min(100, pct))
    },
    usageColor(row) {
      const p = this.usagePercent(row)
      if (p >= 90) return '#F56C6C'
      if (p >= 60) return '#E6A23C'
      return '#67C23A'
    },

    async fetchList() {
      this.loading = true
      try {
        const { data, meta } = await listChannels({ page: 1, page_size: 100 })
        this.list = data || []
        this.total = (meta && meta.total) || this.list.length
        this.fetchedAt = new Date()
      } catch (e) {
        this.list = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },

    onAutoRefreshChange(val) {
      this.clearTimer()
      if (val) {
        this.refreshTimer = setInterval(() => this.fetchList(), 5000)
      }
    },
    clearTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },

    handleEdit(row) {
      this.editForm = {
        task_type: row.task_type,
        queue_capacity: row.queue_capacity,
        concurrency: row.concurrency,
        enabled: row.enabled
      }
      this.editVisible = true
    },

    async submitEdit() {
      if (!this.adminToken) {
        this.$message.warning('请先输入管理员 Token')
        return
      }
      try {
        await this.$refs.editForm.validate()
      } catch { return }
      this.saving = true
      try {
        const payload = {
          queue_capacity: this.editForm.queue_capacity,
          concurrency: this.editForm.concurrency,
          enabled: this.editForm.enabled
        }
        await patchChannelConfig(this.editForm.task_type, payload, this.adminToken)
        this.$message.success('已更新，最长 30 秒内生效')
        this.editVisible = false
        this.fetchList()
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.saving = false
      }
    },

    async handleToggle(row) {
      if (!this.adminToken) {
        this.$message.warning('请先输入管理员 Token')
        return
      }
      const action = row.enabled ? '停用' : '启用'
      try {
        await this.$confirm(
          `确认${action}通道「${this.channelLabel(row.task_type)}」？`,
          `${action}确认`,
          { type: 'warning' }
        )
      } catch { return }
      this.togglingType = row.task_type
      try {
        await patchChannelConfig(row.task_type, { enabled: !row.enabled }, this.adminToken)
        this.$message.success(`已${action}`)
        this.fetchList()
      } catch (e) {
        // 拦截器已提示
      } finally {
        this.togglingType = ''
      }
    }
  }
}
</script>

<style scoped>
.page-header { margin-bottom: 10px; }
.page-title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
.page-desc { color: #606266; font-size: 13px; line-height: 1.6; }
.page-desc code {
  background: #f4f4f5;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.token-bar { margin-bottom: 10px; }
.token-bar .el-form { padding: 4px 0; }

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 0 0;
}
.summary { color: #606266; font-size: 13px; }
.summary .sep { margin: 0 10px; color: #dcdfe6; }
.summary .good { color: #67c23a; }
.summary .warn { color: #e6a23c; }

.chan-cell { display: flex; flex-direction: column; }
.chan-sub { color: #909399; font-size: 12px; margin-top: 2px; }

.form-hint { color: #909399; font-size: 12px; margin-left: 8px; }
.hint-box {
  background: #f4f4f5;
  padding: 8px 12px;
  border-radius: 4px;
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
  margin-top: 4px;
}
.hint-box .el-icon-info { color: #409eff; margin-right: 4px; }
</style>
