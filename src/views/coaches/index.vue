<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button type="primary" icon="el-icon-plus" :disabled="charPpUnavailable" @click="handleCreate">新增教练</el-button>
      <el-switch
        v-model="showInactive"
        style="margin-left: 16px"
        active-text="含停用"
        @change="fetchCoaches"
      />
    </div>

    <el-table
      v-loading="listLoading"
      :data="pagedList"
      border
      fit
      highlight-current-row
      style="width: 100%"
    >
      <el-table-column label="ID" prop="id" width="120" align="center">
        <template slot-scope="{ row }">
          <el-tooltip :content="row.id" placement="top">
            <span class="id-cell">{{ row.id ? row.id.substring(0, 8) : '—' }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="教练名称" prop="name" min-width="120" />
      <el-table-column label="简介" prop="bio" min-width="200">
        <template slot-scope="{ row }">
          <span>{{ row.bio || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template slot-scope="{ row }">
          <el-tag :type="row.is_active ? 'success' : 'info'">
            {{ row.is_active ? '活跃' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180" align="center">
        <template slot-scope="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center">
        <template slot-scope="{ row }">
          <el-button
            size="mini"
            type="primary"
            :disabled="charPpUnavailable"
            @click="handleEdit(row)"
          >编辑</el-button>
          <el-button
            v-if="row.is_active"
            size="mini"
            type="danger"
            :disabled="charPpUnavailable"
            @click="handleDelete(row)"
          >停用</el-button>
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

    <!-- 新增/编辑 Dialog -->
    <el-dialog :title="dialogType === 'create' ? '新增教练' : '编辑教练'" :visible.sync="dialogVisible" width="500px" @close="resetForm">
      <el-form ref="coachForm" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="教练名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入教练名称" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入简介（可选）" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="submitForm">确认</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listCoaches, createCoach, updateCoach, deleteCoach } from '@/api/coaches'

export default {
  name: 'CoachesIndex',
  data() {
    return {
      list: [],
      lastLoadedList: [],
      listLoading: false,
      showInactive: false,
      currentPage: 1,
      pageSize: 20,
      dialogVisible: false,
      dialogType: 'create',
      submitLoading: false,
      form: {
        id: null,
        name: '',
        description: ''
      },
      rules: {
        name: [
          { required: true, message: '请输入教练名称', trigger: 'blur' },
          { min: 1, max: 50, message: '名称长度 1-50 字符', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapState({
      charPpUnavailable: state => state.app.charPpUnavailable
    }),
    pagedList() {
      const start = (this.currentPage - 1) * this.pageSize
      return this.list.slice(start, start + this.pageSize)
    }
  },
  created() {
    this.fetchCoaches()
  },
  methods: {
    async fetchCoaches() {
      this.currentPage = 1
      this.listLoading = true
      try {
        const { data } = await listCoaches({ include_inactive: this.showInactive || undefined })
        this.list = Array.isArray(data) ? data : []
        this.lastLoadedList = [...this.list]
      } catch (e) {
        if (this.lastLoadedList.length) {
          this.list = [...this.lastLoadedList]
        }
      } finally {
        this.listLoading = false
      }
    },
    handleCreate() {
      this.dialogType = 'create'
      this.form = { id: null, name: '', description: '' }
      this.dialogVisible = true
    },
    handleEdit(row) {
      this.dialogType = 'edit'
      this.form = { id: row.id, name: row.name, description: row.bio || '' }
      this.dialogVisible = true
    },
    handleDelete(row) {
      this.$confirm(`确认停用教练「${row.name}」？停用后该教练将不可被新任务引用。`, '确认停用', {
        confirmButtonText: '确认停用',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          await deleteCoach(row.id)
          this.$message.success('停用成功')
          this.fetchCoaches()
        } catch (e) {
          // 错误已在 charPpRequest 拦截器中统一处理
        }
      }).catch(() => {})
    },
    submitForm() {
      this.$refs.coachForm.validate(async(valid) => {
        if (!valid) return
        this.submitLoading = true
        try {
          if (this.dialogType === 'create') {
            await createCoach({ name: this.form.name, bio: this.form.description || undefined })
            this.$message.success('教练创建成功')
          } else {
            await updateCoach(this.form.id, { name: this.form.name, bio: this.form.description || undefined })
            this.$message.success('更新成功')
          }
          this.dialogVisible = false
          this.fetchCoaches()
        } catch (e) {
          // 409 重复错误已在拦截器中处理
        } finally {
          this.submitLoading = false
        }
      })
    },
    resetForm() {
      this.$refs.coachForm && this.$refs.coachForm.resetFields()
    },
    formatDate(isoStr) {
      if (!isoStr) return '—'
      return isoStr.replace('T', ' ').substring(0, 19)
    }
  }
}
</script>

<style scoped>
.filter-container {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}
.id-cell {
  font-family: monospace;
  font-size: 12px;
  color: #606266;
}
</style>
