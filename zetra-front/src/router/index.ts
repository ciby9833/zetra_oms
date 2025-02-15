import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard-home',
        component: () => import('@/views/dashboard/HomeView.vue'),
        meta: {
          title: '首页',
          requiresAuth: true
        }
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/dashboard/UsersView.vue'),
        meta: {
          title: '用户管理',
          requiresAuth: true,
          roles: ['admin', 'super_admin']
        }
      },
      {
        path: 'warehouse',
        name: 'warehouse',
        component: () => import('@/views/dashboard/WarehouseView.vue'),
        meta: {
          title: '仓库管理',
          requiresAuth: true,
          roles: ['admin', 'super_admin', 'user']
        }
      },
      {
        path: 'warehouse-zones',
        name: 'warehouse-zones',
        component: () => import('@/views/dashboard/WarehouseZoneView.vue'),
        meta: {
          title: '货区管理',
          requiresAuth: true,
          roles: ['admin', 'super_admin', 'user']
        }
      },
      {
        path: 'suppliers',
        name: 'suppliers',
        component: () => import('@/views/dashboard/SupplierView.vue'),
        meta: {
          title: '供应商管理',
          requiresAuth: true,
          roles: ['admin', 'super_admin', 'user']
        }
      },
      {
        path: 'inbound-orders',
        name: 'inbound-orders',
        component: () => import('@/views/dashboard/InboundOrderView.vue'),
        meta: {
          title: '入库单',
          requiresAuth: true,
          roles: ['admin', 'super_admin', 'user']
        }
      },
      {
        path: 'material',
        name: 'material',
        component: () => import('@/layouts/RouterView.vue'),
        redirect: { name: 'material-list' },
        meta: {
          title: '物料管理',
          requiresAuth: true,
          roles: ['admin', 'super_admin', 'user']
        },
        children: [
          {
            path: 'list',
            name: 'material-list',
            component: () => import('@/views/dashboard/material/MaterialListView.vue'),
            meta: {
              title: '物料列表',
              requiresAuth: true,
              roles: ['admin', 'super_admin', 'user']
            }
          },
          {
            path: 'form/:id?',
            name: 'material-form',
            component: () => import('@/views/dashboard/material/MaterialFormView.vue'),
            meta: {
              title: '编辑物料',
              requiresAuth: true,
              roles: ['admin', 'super_admin']
            }
          },
          {
            path: 'category',
            name: 'material-category',
            component: () => import('@/views/dashboard/material/CategoryView.vue'),
            meta: {
              title: '物料分类',
              requiresAuth: true,
              roles: ['admin', 'super_admin']
            }
          },
          {
            path: 'unit',
            name: 'material-unit',
            component: () => import('@/views/dashboard/material/UnitView.vue'),
            meta: {
              title: '计量单位',
              requiresAuth: true,
              roles: ['admin', 'super_admin']
            }
          },
          {
            path: 'conversion',
            name: 'material-conversion',
            component: () => import('@/views/dashboard/material/ConversionView.vue'),
            meta: {
              title: '换算关系',
              requiresAuth: true,
              roles: ['admin', 'super_admin']
            }
          }
        ]
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/dashboard/ProfileView.vue'),
        meta: {
          title: '个人信息',
          requiresAuth: true
        }
      },
      {
        path: 'change-password',
        name: 'change-password',
        component: () => import('@/views/dashboard/ChangePasswordView.vue'),
        meta: {
          title: '修改密码',
          requiresAuth: true
        }
      },
      {
        path: 'system',
        name: 'system',
        component: () => import('@/views/dashboard/system/SystemView.vue'),
        meta: {
          title: '系统管理',
          requiresAuth: true,
          roles: ['super_admin', 'admin']
        },
        children: [
          {
            path: 'permissions',
            name: 'system-permissions',
            component: () => import('@/views/dashboard/system/PermissionView.vue'),
            meta: {
              title: '权限管理',
              requiresAuth: true,
              roles: ['super_admin', 'admin']
            }
          }
        ]
      }
    ]
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // 优化日志输出，避免敏感信息
  console.log('Route navigation:', {
    from: from.path,
    to: to.path,
    name: to.name,
    params: to.params,
    query: to.query,
    requiresAuth: to.meta.requiresAuth,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user ? {
      userId: authStore.user.userId,
      userRole: authStore.user.userRole
    } : null
  });

  // 如果有 token，确保认证状态已初始化
  if (authStore.token) {
    try {
      await authStore.initializeAuth();
    } catch (error) {
      console.error('Auth initialization failed:', error);
      if (to.meta.requiresAuth) {
        next('/login');
        return;
      }
    }
  }

  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('Unauthorized access attempt to:', to.path);
    next('/login');
    return;
  }

  // 检查角色权限
  if (to.meta.roles && !authStore.hasRole(to.meta.roles as string[])) {
    console.log('Insufficient permissions for:', to.path);
    next(authStore.user?.userRole === 'user' ? '/dashboard/warehouse' : '/dashboard');
    return;
  }

  // 检查模块权限
  if (to.meta.module) {
    const hasPermission = authStore.hasModulePermission(to.meta.module as string)
    if (!hasPermission) {
      next({ name: 'forbidden' })
      return
    }
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      next('/login');
      return;
    }

    // 检查模块权限
    if (to.meta.permission) {
      const hasPermission = authStore.hasPermission(to.meta.permission as string);
      if (!hasPermission) {
        ElMessage.error('没有访问权限');
        next('/dashboard');
        return;
      }
    }
  }

  next();
});

export default router
