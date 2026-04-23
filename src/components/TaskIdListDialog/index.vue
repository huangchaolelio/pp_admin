<template>
  <el-dialog
    title="批量提交结果"
    :visible.sync="dialogVisible"
    width="600px"
    @close="$emit('update:visible', false)"
  >
    <p class="task-list-tip">以下任务已成功提交，点击任务 ID 可跳转到任务详情页：</p>
    <el-table :data="taskList" border size="small" style="width: 100%">
      <el-table-column type="index" label="序号" width="60" />
      <el-table-column label="任务 ID">
        <template slot-scope="{ row }">
          <el-link type="primary" @click="goToTask(row)">{{ row }}</el-link>
        </template>
      </el-table-column>
    </el-table>
    <span slot="footer">
      <el-button @click="$emit('update:visible', false)">关闭</el-button>
    </span>
  </el-dialog>
</template>

<script>
export default {
  name: 'TaskIdListDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    taskIds: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    dialogVisible: {
      get() { return this.visible },
      set(val) { this.$emit('update:visible', val) }
    },
    taskList() {
      return this.taskIds || []
    }
  },
  methods: {
    goToTask(taskId) {
      this.$router.push({ path: '/tasks/index', query: { task_id: taskId }})
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style scoped>
.task-list-tip {
  margin: 0 0 12px;
  color: #606266;
  font-size: 14px;
}
</style>
