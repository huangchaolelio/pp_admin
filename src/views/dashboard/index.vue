<template>
  <div class="dashboard-container">
    <div class="dashboard-welcome">
      <div class="welcome-icon">
        <i class="el-icon-trophy" />
      </div>
      <h2 class="welcome-title">欢迎使用乒乓球AI教练后台</h2>
      <p class="welcome-sub">当前登录账号：<strong>{{ name }}</strong>（{{ roleLabel }}）</p>
    </div>

    <el-row :gutter="20" class="stat-row">
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-icon" style="color: #409EFF;"><i class="el-icon-user" /></div>
          <div class="stat-label">用户管理</div>
          <div class="stat-desc">管理后台账号权限</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-icon" style="color: #67C23A;"><i class="el-icon-trophy" /></div>
          <div class="stat-label">教练管理</div>
          <div class="stat-desc">乒乓球AI教练配置</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-icon" style="color: #E6A23C;"><i class="el-icon-setting" /></div>
          <div class="stat-label">系统配置</div>
          <div class="stat-desc">全局参数配置管理</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'Dashboard',
  computed: {
    ...mapGetters(['name', 'roles']),
    roleLabel() {
      if (this.roles && this.roles.includes('super_admin')) return '超级管理员'
      if (this.roles && this.roles.includes('admin')) return '普通管理员'
      return '未知角色'
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  padding: 30px;
}
.dashboard-welcome {
  text-align: center;
  padding: 40px 0 30px;
}
.welcome-icon {
  font-size: 60px;
  color: #409EFF;
  margin-bottom: 16px;
}
.welcome-title {
  font-size: 24px;
  color: #303133;
  margin: 0 0 8px;
}
.welcome-sub {
  font-size: 14px;
  color: #606266;
}
.stat-row {
  margin-top: 10px;
}
.stat-card {
  text-align: center;
  padding: 10px 0;
  cursor: default;
}
.stat-icon {
  font-size: 36px;
  margin-bottom: 8px;
}
.stat-label {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.stat-desc {
  font-size: 13px;
  color: #909399;
}
</style>
