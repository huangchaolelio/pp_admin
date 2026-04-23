<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <div class="filter-container">
      <el-input
        v-model="listQuery.username"
        placeholder="用户名搜索"
        style="width: 200px;"
        class="filter-item"
        clearable
        @keyup.enter.native="handleFilter"
      />
      <el-select
        v-model="listQuery.status"
        placeholder="账号状态"
        clearable
        style="width: 130px;"
        class="filter-item"
      >
        <el-option label="启用" value="active" />
        <el-option label="禁用" value="disabled" />
      </el-select>
      <el-button class="filter-item" type="primary" icon="el-icon-search" @click="handleFilter">
        搜索
      </el-button>
      <el-button
        v-if="isSuperAdmin"
        class="filter-item"
        type="success"
        icon="el-icon-plus"
        @click="handleCreate"
      >
        新增用户
      </el-button>
    </div>

    <!-- 用户表格 -->
    <el-table
      v-loading="listLoading"
      :data="list"
      border
      fit
      highlight-current-row
      style="width: 100%;"
    >
      <el-table-column label="用户名" prop="username" align="center" min-width="120" />
      <el-table-column label="角色" align="center" min-width="120">
        <template slot-scope="{row}">
          <el-tag :type="row.role === 'super_admin' ? 'danger' : 'info'">
            {{ row.role === 'super_admin' ? '超级管理员' : '普通管理员' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="手机号" prop="phone" align="center" min-width="130">
        <template slot-scope="{row}">
          {{ row.phone || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" align="center" min-width="150">
        <template slot-scope="{row}">
          {{ row.remark || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" min-width="90">
        <template slot-scope="{row}">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" min-width="160">
        <template slot-scope="{row}">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" min-width="180" fixed="right">
        <template slot-scope="{row}">
          <el-button size="mini" type="primary" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'active'"
            size="mini"
            type="danger"
            @click="handleToggleStatus(row, 'disabled')"
          >
            禁用
          </el-button>
          <el-button
            v-else
            size="mini"
            type="success"
            @click="handleToggleStatus(row, 'active')"
          >
            启用
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        :current-page="listQuery.page"
        :page-sizes="[10, 20, 50]"
        :page-size="listQuery.page_size"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="500px" @close="resetForm">
      <el-form ref="userForm" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="dialogType === 'edit'" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            :placeholder="dialogType === 'edit' ? '留空表示不修改' : '请输入密码'"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width:100%">
            <el-option label="超级管理员" value="super_admin" />
            <el-option label="普通管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号（选填）" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息（选填）" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确 定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { getUserList, createUser, updateUser, updateUserStatus } from '@/api/user'

export default {
  name: 'UserList',
  data() {
    const validateUsername = (rule, value, callback) => {
      if (!value || value.trim() === '') {
        callback(new Error('请输入用户名'))
      } else if (!/^[a-zA-Z0-9_]{4,20}$/.test(value)) {
        callback(new Error('用户名为 4-20 位字母、数字或下划线'))
      } else {
        callback()
      }
    }
    const validatePhone = (rule, value, callback) => {
      if (value && !/^1\d{10}$/.test(value)) {
        callback(new Error('请输入正确的手机号'))
      } else {
        callback()
      }
    }
    return {
      list: [],
      total: 0,
      listLoading: false,
      listQuery: {
        page: 1,
        page_size: 10,
        username: '',
        status: ''
      },
      dialogVisible: false,
      dialogType: 'create', // create | edit
      submitLoading: false,
      editingId: null,
      form: {
        username: '',
        password: '',
        role: 'admin',
        phone: '',
        remark: ''
      },
      formRules: {
        username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
        password: [],
        role: [{ required: true, message: '请选择角色', trigger: 'change' }],
        phone: [{ validator: validatePhone, trigger: 'blur' }]
      }
    }
  },
  computed: {
    ...mapGetters(['roles', 'name']),
    isSuperAdmin() {
      return this.roles && this.roles.includes('super_admin')
    },
    dialogTitle() {
      return this.dialogType === 'create' ? '新增用户' : '编辑用户'
    }
  },
  created() {
    this.fetchList()
  },
  methods: {
    fetchList() {
      this.listLoading = true
      getUserList(this.listQuery).then(res => {
        this.list = res.data.items
        this.total = res.data.total
      }).finally(() => {
        this.listLoading = false
      })
    },
    handleFilter() {
      this.listQuery.page = 1
      this.fetchList()
    },
    handleSizeChange(val) {
      this.listQuery.page_size = val
      this.fetchList()
    },
    handleCurrentChange(val) {
      this.listQuery.page = val
      this.fetchList()
    },
    handleCreate() {
      this.dialogType = 'create'
      this.editingId = null
      this.form = { username: '', password: '', role: 'admin', phone: '', remark: '' }
      this.formRules.password = [{ required: true, message: '请输入密码', trigger: 'blur' }]
      this.dialogVisible = true
    },
    handleEdit(row) {
      this.dialogType = 'edit'
      this.editingId = row.id
      this.form = {
        username: row.username,
        password: '',
        role: row.role,
        phone: row.phone || '',
        remark: row.remark || ''
      }
      this.formRules.password = []
      this.dialogVisible = true
    },
    handleSubmit() {
      this.$refs.userForm.validate(valid => {
        if (!valid) return
        this.submitLoading = true
        const action = this.dialogType === 'create'
          ? createUser(this.form)
          : updateUser(this.editingId, this.form)

        action.then(() => {
          this.$message.success(this.dialogType === 'create' ? '新增成功' : '编辑成功')
          this.dialogVisible = false
          this.fetchList()
        }).finally(() => {
          this.submitLoading = false
        })
      })
    },
    handleToggleStatus(row, newStatus) {
      // 禁止操作自身账号
      if (row.username === this.name) {
        this.$message.warning('不能禁用当前登录账号')
        return
      }
      const confirmMsg = newStatus === 'disabled'
        ? `确认禁用账号「${row.username}」吗？禁用后该账号将无法登录`
        : `确认启用账号「${row.username}」吗？`
      this.$confirm(confirmMsg, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        updateUserStatus(row.id, { status: newStatus }).then(() => {
          row.status = newStatus
          this.$message.success('操作成功')
        })
      }).catch(() => {})
    },
    resetForm() {
      this.$refs.userForm && this.$refs.userForm.resetFields()
    },
    formatDate(dateStr) {
      if (!dateStr) return '—'
      const d = new Date(dateStr)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
}
</script>

<style scoped>
.filter-container {
  padding-bottom: 16px;
}
.filter-item {
  margin-right: 8px;
}
.pagination-container {
  margin-top: 16px;
  text-align: right;
}
</style>
