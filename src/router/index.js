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
 * super_admin: 所有菜单
 * admin: 仅 控制台 + 乒乓球教练管理
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
    path: '/pp-coach',
    component: Layout,
    redirect: '/pp-coach/index',
    name: 'PpCoach',
    meta: {
      title: '乒乓球教练管理',
      icon: 'el-icon-trophy',
      roles: ['super_admin', 'admin']
    },
    children: [
      {
        path: 'index',
        component: () => import('@/views/pp-coach/index'),
        name: 'PpCoachIndex',
        meta: { title: '教练管理', icon: 'el-icon-trophy' }
      }
    ]
  },

  {
    path: '/system',
    component: Layout,
    redirect: '/system/config',
    name: 'System',
    alwaysShow: true,
    meta: {
      title: '系统配置',
      icon: 'el-icon-setting',
      roles: ['super_admin']
    },
    children: [
      {
        path: 'config',
        component: () => import('@/views/system/config/index'),
        name: 'SystemConfig',
        meta: { title: '系统参数', icon: 'el-icon-setting' }
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
