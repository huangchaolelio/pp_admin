<template>
  <div class="app-container levers-page">
    <!-- 说明 -->
    <el-card class="page-header" shadow="never">
      <div class="page-title">优化杠杆台账</div>
      <div class="page-desc">
        对应 <code>docs/business-workflow.md § 9</code> 的三类杠杆入口统一台账，
        数据源 <b>GET /api/v1/admin/levers</b>；敏感键仅返回 <el-tag size="mini">is_configured</el-tag>，不回显明文。
        修改类操作请前往各自所属页面（运行时参数 → 通道管理 / <code>.env</code> 重启生效 / 规则-Prompt → 配置文件）。
      </div>
    </el-card>

    <!-- 管理员 Token -->
    <el-card class="token-bar" shadow="never">
      <el-form :inline="true" @submit.native.prevent>
        <el-form-item label="管理员 Token">
          <el-input
            v-model="adminToken"
            :type="tokenVisible ? 'text' : 'password'"
            placeholder="仅保存在浏览器内存中，刷新页面即失效（= .env 中 ADMIN_RESET_TOKEN）"
            clearable
            style="width:340px"
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
          <el-tag v-else type="info" size="small">未输入将返回 401 ADMIN_TOKEN_INVALID</el-tag>
        </el-form-item>
        <el-form-item>
          <el-select v-model="phaseFilter" clearable size="small" placeholder="按阶段过滤" style="width:160px" @change="fetchList">
            <el-option v-for="opt in PHASE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button icon="el-icon-refresh" size="small" :loading="loading" :disabled="!adminToken" @click="fetchList">加载台账</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 错误提示 -->
    <el-alert
      v-if="errorMsg"
      :title="errorMsg"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:10px"
    />

    <!-- 三类分组 -->
    <el-tabs v-model="activeTab" type="border-card" class="group-tabs">
      <el-tab-pane v-for="group in GROUPS" :key="group.key" :label="`${group.label}（${(groupedItems[group.key] || []).length}）`" :name="group.key">
        <el-table :data="groupedItems[group.key] || []" size="small" border>
          <el-table-column label="Key" min-width="220">
            <template slot-scope="{ row }">
              <span class="mono">{{ row.key }}</span>
              <el-tag v-if="row.sensitive" type="danger" size="mini" effect="plain" style="margin-left:6px">sensitive</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前值" min-width="170">
            <template slot-scope="{ row }">
              <template v-if="row.sensitive">
                <el-tag v-if="row.is_configured" type="success" size="mini">✓ 已配置</el-tag>
                <el-tag v-else type="info" size="mini">未配置</el-tag>
              </template>
              <span v-else class="mono val">{{ renderValue(row.current_value) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="生效" width="180" align="center">
            <template slot-scope="{ row }">
              <el-tooltip v-if="row.effective_in_seconds" :content="`约 ${row.effective_in_seconds} 秒内生效`" placement="top">
                <el-tag type="success" size="mini">{{ row.effective_in_seconds }}s 热生效</el-tag>
              </el-tooltip>
              <el-tag v-else-if="row.restart_scope" type="warning" size="mini">需重启 {{ row.restart_scope }}</el-tag>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="source" width="110" align="center">
            <template slot-scope="{ row }">
              <el-tag :type="sourceTagType(row.source)" size="mini" effect="plain">{{ row.source || '—' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="影响阶段" width="200">
            <template slot-scope="{ row }">
              <el-tag
                v-for="p in (row.business_phase || [])"
                :key="p"
                :type="phaseTagType(p)"
                effect="plain"
                size="mini"
                style="margin-right:4px"
              >{{ phaseShortLabel(p) }}</el-tag>
              <span v-if="!row.business_phase || !row.business_phase.length" class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="最后更新" width="170">
            <template slot-scope="{ row }">
              <span>{{ formatDate(row.last_changed_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="更新人" width="110">
            <template slot-scope="{ row }">
              <span :class="{ muted: !row.last_changed_by }">{{ row.last_changed_by || '—' }}</span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !(groupedItems[group.key] || []).length" :description="`当前分组暂无条目`" :image-size="80" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { listLevers } from '@/api/levers'
import { PHASE_OPTIONS, phaseTagType, phaseShortLabel } from '@/utils/workflow'

const GROUPS = [
  { key: 'runtime_params', label: '运行时参数' },
  { key: 'algorithm_models', label: '算法 / 模型' },
  { key: 'rules_prompts', label: '规则 / Prompt' }
]

export default {
  name: 'LeversIndex',
  data() {
    return {
      GROUPS,
      PHASE_OPTIONS,
      adminToken: '',
      tokenVisible: false,
      phaseFilter: '',
      activeTab: 'runtime_params',
      loading: false,
      errorMsg: '',
      groupedItems: { runtime_params: [], algorithm_models: [], rules_prompts: [] }
    }
  },
  methods: {
    phaseTagType,
    phaseShortLabel,
    sourceTagType(source) {
      return {
        db_table: 'success',
        env: 'warning',
        config_file: 'info'
      }[source] || ''
    },
    renderValue(v) {
      if (v == null) return '—'
      if (typeof v === 'object') {
        try { return JSON.stringify(v) } catch { return String(v) }
      }
      return String(v)
    },
    formatDate(iso) {
      if (!iso) return '—'
      return iso.replace('T', ' ').substring(0, 19)
    },
    async fetchList() {
      if (!this.adminToken) {
        this.$message.warning('请先输入管理员 Token')
        return
      }
      this.loading = true
      this.errorMsg = ''
      try {
        const params = this.phaseFilter ? { phase: this.phaseFilter } : undefined
        const res = await listLevers(params, this.adminToken)
        const data = res.data || {}
        this.groupedItems = {
          runtime_params: data.runtime_params || [],
          algorithm_models: data.algorithm_models || [],
          rules_prompts: data.rules_prompts || []
        }
      } catch (e) {
        this.groupedItems = { runtime_params: [], algorithm_models: [], rules_prompts: [] }
        const code = e && e.response && e.response.data && e.response.data.error && e.response.data.error.code
        if (code === 'ADMIN_TOKEN_INVALID') {
          this.errorMsg = 'Token 无效（ADMIN_TOKEN_INVALID），请检查 .env 中 ADMIN_RESET_TOKEN 是否正确。'
        } else {
          this.errorMsg = '台账加载失败：' + (e && e.message || '未知错误')
        }
      } finally {
        this.loading = false
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
.mono {
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}
.val { color: #303133; }
.muted { color: #C0C4CC; font-size: 12px; }
.group-tabs { margin-top: 10px; }
</style>
