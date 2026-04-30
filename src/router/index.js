import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout */
import Layout from '@/layout'

/**
 * constantRoutes
 * 无需权限的基础路由，所有角色均可访问
 */
export const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect/index')
      }
    ]
  },
  {
    path: '/login',
    component: () => import('@/views/login/index'),
    hidden: true
  },
  {
    path: '/404',
    component: () => import('@/views/error-page/404'),
    hidden: true
  },
  {
    path: '/401',
    component: () => import('@/views/error-page/401'),
    hidden: true
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/index'),
        name: 'Dashboard',
        meta: { title: '业务总览', icon: 'dashboard', affix: true }
      }
    ]
  }
]

/**
 * asyncRoutes（按后端 docs/business-workflow.md § 2「三阶段八步骤」分组）
 *
 *   📊 业务总览（常量路由 /dashboard）
 *   ├─ 训练 TRAINING        — 专家视频 → 知识库草稿
 *   │   └ 教练 / 视频分类 / 视频预处理 / KB 提取作业
 *   ├─ 建立标准 STANDARDIZATION — 草稿 → 正式
 *   │   └ 知识库版本 / 教学提示 / 技术标准
 *   ├─ 诊断 INFERENCE       — 标准落地给学员
 *   │   └ 动作诊断
 *   └─ 运维与治理           — 跨阶段的观测与治理
 *       └ 任务监控 / 通道管理 / 杠杆台账 / 用户管理
 *
 * 关键原则：所有历史 path 保持不变，仅重分组，避免断链与收藏失效。
 */
export const asyncRoutes = [
  // ── 🎯 阶段一：训练 TRAINING ──────────────────────────────
  {
    path: '/phase-training',
    component: Layout,
    alwaysShow: true,
    name: 'PhaseTraining',
    meta: {
      title: '训练 · TRAINING',
      icon: 'el-icon-video-camera',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: '/coaches',
        component: () => import('@/views/coaches/index'),
        name: 'CoachesIndex',
        meta: { title: '教练管理', icon: 'el-icon-trophy' }
      },
      {
        path: '/classifications',
        component: () => import('@/views/classifications/index'),
        name: 'ClassificationsIndex',
        meta: { title: '视频分类', icon: 'el-icon-s-order' }
      },
      {
        path: '/video-preprocessing',
        component: () => import('@/views/video-preprocessing/index'),
        name: 'VideoPreprocessingIndex',
        meta: { title: '视频预处理', icon: 'el-icon-film' }
      },
      {
        path: '/extraction-jobs',
        component: () => import('@/views/extraction-jobs/index'),
        name: 'ExtractionJobsIndex',
        meta: { title: 'KB 提取作业', icon: 'el-icon-share' }
      }
    ]
  },

  // ── 📐 阶段二：建立标准 STANDARDIZATION ───────────────────
  {
    path: '/phase-standardization',
    component: Layout,
    alwaysShow: true,
    name: 'PhaseStandardization',
    meta: {
      title: '建立标准 · STANDARDIZATION',
      icon: 'el-icon-data-analysis',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: '/knowledge-base/list',
        component: () => import('@/views/knowledge-base/index'),
        name: 'KnowledgeBaseList',
        meta: { title: '知识库版本', icon: 'el-icon-collection' }
      },
      {
        path: '/knowledge-base/teaching-tips',
        component: () => import('@/views/knowledge-base/teaching-tips'),
        name: 'TeachingTips',
        meta: { title: '教学提示', icon: 'el-icon-chat-line-round' }
      },
      {
        path: '/standards',
        component: () => import('@/views/standards/index'),
        name: 'StandardsIndex',
        meta: { title: '技术标准', icon: 'el-icon-medal' }
      }
    ]
  },

  // ── 🩺 阶段三：诊断 INFERENCE ─────────────────────────────
  {
    path: '/phase-inference',
    component: Layout,
    alwaysShow: true,
    name: 'PhaseInference',
    meta: {
      title: '诊断 · INFERENCE',
      icon: 'el-icon-cpu',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: '/diagnosis',
        component: () => import('@/views/diagnosis/index'),
        name: 'DiagnosisIndex',
        meta: { title: '动作诊断', icon: 'el-icon-aim' }
      }
    ]
  },

  // ── 🛠 运维与治理（跨阶段） ───────────────────────────────
  {
    path: '/ops',
    component: Layout,
    alwaysShow: true,
    name: 'Ops',
    meta: {
      title: '运维与治理',
      icon: 'el-icon-set-up',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: '/tasks',
        component: () => import('@/views/tasks/index'),
        name: 'TasksIndex',
        meta: { title: '任务监控', icon: 'el-icon-time' }
      },
      {
        path: '/channels',
        component: () => import('@/views/channels/index'),
        name: 'ChannelsIndex',
        meta: { title: '通道管理', icon: 'el-icon-connection' }
      },
      {
        path: '/levers',
        component: () => import('@/views/levers/index'),
        name: 'LeversIndex',
        meta: { title: '杠杆台账', icon: 'el-icon-s-tools' }
      },
      {
        path: '/user/list',
        component: () => import('@/views/user/list/index'),
        name: 'UserList',
        meta: { title: '用户管理', icon: 'user', roles: ['super_admin'] }
      }
    ]
  },

  // 404 必须放在末尾
  { path: '*', redirect: '/404', hidden: true }
]

const createRouter = () => new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})

const router = createRouter()

// 重置路由（退出登录时调用）
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher
}

export default router
