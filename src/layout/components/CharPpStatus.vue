<template>
  <el-alert
    v-if="charPpUnavailable"
    class="char-pp-status-bar"
    type="warning"
    :closable="false"
    show-icon
    title="char_pp 服务暂不可用，当前展示上次成功加载的数据（只读模式）"
  />
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'CharPpStatus',
  computed: {
    ...mapState({
      charPpUnavailable: state => state.app.charPpUnavailable
    })
  }
}
</script>

<style scoped>
.char-pp-status-bar {
  border-radius: 0;
  border-left: none;
  border-right: none;
}
</style>
