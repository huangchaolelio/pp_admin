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
        meta: { title: '控制台', icon: 'dashboard', affix: true }
      }
    ]
  }
]

/**
 * asyncRoutes
 * 需要根据用户角色动态加载的路由
 * super_admin 和 admin 均可访问所有菜单（无差异）
 */
export const asyncRoutes = [
  {
    path: '/user',
    component: Layout,
    redirect: '/user/list',
    name: 'User',
    meta: {
      title: '用户管理',
      icon: 'user',
      roles: ['super_admin']
    },
    children: [
      {
        path: 'list',
        component: () => import('@/views/user/list/index'),
        name: 'UserList',
        meta: { title: '用户列表', icon: 'user' }
      }
    ]
  },

  {
    path: '/video-classifications',
    component: Layout,
    redirect: '/video-classifications/index',
    name: 'VideoClassifications',
    meta: {
      title: '视频分类',
      icon: 'el-icon-video-camera',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/video-classifications/index'),
        name: 'VideoClassificationsIndex',
        meta: { title: '视频分类管理', icon: 'el-icon-video-camera' }
      }
    ]
  },

  {
    path: '/coaches',
    component: Layout,
    redirect: '/coaches/index',
    name: 'Coaches',
    meta: {
      title: '教练管理',
      icon: 'el-icon-trophy',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/coaches/index'),
        name: 'CoachesIndex',
        meta: { title: '教练管理', icon: 'el-icon-trophy' }
      }
    ]
  },

  {
    path: '/tasks',
    component: Layout,
    redirect: '/tasks/index',
    name: 'Tasks',
    meta: {
      title: '任务监控',
      icon: 'el-icon-time',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/tasks/index'),
        name: 'TasksIndex',
        meta: { title: '任务监控', icon: 'el-icon-time' }
      }
    ]
  },

  {
    path: '/standards',
    component: Layout,
    redirect: '/standards/index',
    name: 'Standards',
    meta: {
      title: '技术标准',
      icon: 'el-icon-data-analysis',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/standards/index'),
        name: 'StandardsIndex',
        meta: { title: '技术标准管理', icon: 'el-icon-data-analysis' }
      }
    ]
  },

  {
    path: '/diagnosis',
    component: Layout,
    redirect: '/diagnosis/index',
    name: 'Diagnosis',
    meta: {
      title: '动作诊断',
      icon: 'el-icon-cpu',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/diagnosis/index'),
        name: 'DiagnosisIndex',
        meta: { title: '动作诊断', icon: 'el-icon-cpu' }
      }
    ]
  },

  {
    path: '/knowledge-base',
    component: Layout,
    redirect: '/knowledge-base/list',
    name: 'KnowledgeBase',
    alwaysShow: true,
    meta: {
      title: '知识库',
      icon: 'el-icon-reading',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'list',
        component: () => import('@/views/knowledge-base/index'),
        name: 'KnowledgeBaseList',
        meta: { title: '知识库版本', icon: 'el-icon-collection' }
      },
      {
        path: 'teaching-tips',
        component: () => import('@/views/knowledge-base/teaching-tips'),
        name: 'TeachingTips',
        meta: { title: '教学提示', icon: 'el-icon-chat-line-round' }
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
