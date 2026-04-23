# UI 契约: 动作诊断页面

**路由**: `/diagnosis`
**组件**: `src/views/diagnosis/index.vue`

---

## 页面状态机

```
初始态
  └─[用户填写表单]→ 表单就绪

表单就绪
  └─[点击提交]→ 诊断中（全屏加载遮罩）

诊断中（loading=true, fullscreen overlay）
  ├─[char_pp 响应成功 <60s]→ 展示报告
  ├─[char_pp 响应失败（非超时）]→ 关闭遮罩 + 错误提示（保留表单）
  └─[超时 >60s]→ 关闭遮罩 + 超时提示（保留表单 + "点击重试"按钮）

展示报告
  └─[点击"重新诊断"]→ 清空报告区 → 初始态

服务不可用
  └─[提交按钮]→ disabled
```

---

## 接口绑定

| UI 操作 | API 调用 | 成功响应处理 | 失败响应处理 |
|---------|---------|------------|------------|
| 提交诊断 | `POST /api/v1/diagnosis` timeout=65000ms | 渲染报告区域 | 中文错误（保留表单） |

---

## 表单字段

```
el-form-item label="视频路径" required
  el-input v-model="form.video_path" placeholder="请输入视频在 COS 中的路径"

el-form-item label="技术类别" required
  el-select v-model="form.tech_category"
    el-option label="正手拉球" value="forehand_topspin"
    el-option label="反手推挡" value="backhand_push"
```

---

## 报告区域结构

```
综合评分: el-progress type="circle" :percentage="report.overall_score"

维度卡片列表（v-for dimension in report.dimensions）:
  el-card
    标题: dimension.name
    测量值 vs 标准值表格:
      | 测量值 | 理想值 | 最小值 | 最大值 |
    偏差等级: el-tag（normal→success, minor→warning, significant→danger）
    改进建议: 文本（若有）

优点列表: el-tag type="success" v-for strength in report.strengths
总体改进建议: el-alert type="info" v-for improvement in report.improvements
```

---

## 超时处理

```js
// 超时判断：axios timeout error code 'ECONNABORTED'
axios.isCancel(err) || err.code === 'ECONNABORTED'
→ 关闭 loading
→ 设置 isTimeout = true
→ 不清空 form.video_path / form.tech_category
→ 展示: el-alert type="warning" title="请求超时，请稍后重试"
         el-button @click="retryDiagnosis" "点击重试"
```

---

## 特殊错误映射

| char_pp 错误 | 前端提示 |
|-------------|---------|
| `NO_STANDARD_DATA` / 404 standards | 「该技术类别暂无有效标准数据」|
| 422 Unprocessable Entity | 「请求参数有误，请检查视频路径和技术类别」|
| 超时（ECONNABORTED）| 「请求超时（>60s），请检查视频是否有效后重试」|
| 503 | 「诊断服务暂不可用，请稍后重试」|
