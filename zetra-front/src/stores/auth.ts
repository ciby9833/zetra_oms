//状态管理
import { defineStore } from 'pinia';
import { authApi } from '@/api/auth';
import router from '@/router';
import request from '@/api/request';
import { useTabsStore } from '@/stores/tabs';
import { useViewStore } from '@/stores/view';

export interface User {
  userId: number;
  username: string;
  email: string;
  userRole: 'admin' | 'user' | 'super_admin';
  accountType: string;
  employeeNumber?: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    // 从 localStorage 恢复初始状态
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    return {
      token: savedToken || '',
      user: savedUser ? JSON.parse(savedUser) : null,
      isLoggedIn: !!savedToken && !!savedUser,
      refreshing: false,
      permissions: [] as string[],
      modulePermissions: {} as Record<string, string[]>
    };
  },

  getters: {
    isAuthenticated: (state) => {
      return !!state.token && state.isLoggedIn;
    },

    hasRole: (state) => (roles: string[]) => {
      if (!state.user) return false;
      return roles.includes(state.user.userRole) || roles.includes('user');
    },

    // 获取指定模块的所有权限
    getModulePermissions: (state) => (module: string) => {
      return state.modulePermissions[module] || [];
    }
  },

  actions: {
    async init() {
      if (this.token) {
        try {
          // 验证 token
          const isValid = await this.validateToken();
          if (!isValid) {
            throw new Error('Invalid token');
          }

          // 如果有 token 但没有用户信息，从 localStorage 恢复
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.isLoggedIn = true;
          }

          // 恢复权限数据
          const savedPermissions = localStorage.getItem('permissions');
          if (savedPermissions) {
            this.permissions = JSON.parse(savedPermissions);
          }

          console.log('Auth state initialized:', {
            token: this.token,
            user: this.user,
            isLoggedIn: this.isLoggedIn
          });
        } catch (error) {
          console.error('Session restoration failed:', error);
          this.logout();
          throw error;
        }
      }
    },

    async validateToken() {
      try {
        const response = await authApi.validateToken();
        if (!response.data.success) {
          throw new Error('Invalid token');
        }
        return true;
      } catch (error) {
        // 如果 token 无效，尝试刷新
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          throw error;
        }
        return refreshed;
      }
    },

    async refreshToken(): Promise<string> {
      try {
        // 调用刷新 token 接口（注意调整接口调用方式与参数）
        const response = await fetch(import.meta.env.VITE_API_BASE_URL + '/users/refresh-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        });
        const result = await response.json();
        if (result.success && result.token) {
          this.token = result.token;
          localStorage.setItem('token', result.token);
          return result.token;
        } else {
          throw new Error(result.message || 'Token刷新失败');
        }
      } catch (error) {
        console.error('刷新token失败:', error);
        this.token = '';
        localStorage.removeItem('token');
        throw error;
      }
    },

    setUser(userData: any) {
      // 确保 userData 包含必要的字段
      if (!userData.userId) {
        console.error('Invalid user data:', userData);
        throw new Error('Invalid user data');
      }

      this.user = {
        userId: userData.userId,
        username: userData.username,
        email: userData.email,
        accountType: userData.accountType,
        userRole: userData.userRole,
        employeeNumber: userData.employeeNumber
      };

      this.isLoggedIn = true;
      localStorage.setItem('user', JSON.stringify(this.user));

      // 打印状态更新
      console.log('Auth state updated:', {
        user: this.user,
        isLoggedIn: this.isLoggedIn,
        token: this.token,
        isAuthenticated: this.isAuthenticated
      });
    },

    logout() {
      const viewStore = useViewStore();
      const tabsStore = useTabsStore();

      // 清除所有状态
      viewStore.clearAllViewStates();
      tabsStore.clearTabs();

      // 清除用户信息
      this.token = '';
      this.user = null;
      this.isLoggedIn = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      router.push('/login');
    },

    async initializeAuth() {
      if (this.token && !this.user) {
        try {
          const isValid = await this.validateToken();
          if (!isValid) {
            throw new Error('Invalid token');
          }

          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.isLoggedIn = true;
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          this.logout();
          throw error;
        }
      }
    },

    hasPermission(permission: string): boolean {
      // 超级管理员拥有所有权限
      if (this.user?.userRole === 'super_admin') return true;

      // admin 角色默认拥有所有物料相关权限
      if (this.user?.userRole === 'admin' && permission.startsWith('material.')) {
        return true;
      }

      return this.permissions.includes(permission);
    },

    async login(credentials: LoginCredentials) {
      try {
        const response = await authApi.login(credentials);
        if (response.data.success) {
          this.token = response.data.data.token;
          this.user = response.data.data.user;
          this.permissions = response.data.data.permissions || [];

          // 存储到 localStorage
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(this.user));
          localStorage.setItem('permissions', JSON.stringify(this.permissions));

          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    },

    async initializePermissions(permissions: string[]) {
      this.permissions = permissions;

      // 按模块分组权限
      this.modulePermissions = permissions.reduce((acc, code) => {
        const [module] = code.split('.');
        if (!acc[module]) acc[module] = [];
        acc[module].push(code);
        return acc;
      }, {} as Record<string, string[]>);
    },

    hasModulePermission(module: string, action?: string) {
      if (this.user?.userRole === 'super_admin') return true;

      const modulePerms = this.modulePermissions[module] || [];
      if (!action) return modulePerms.length > 0;

      return modulePerms.includes(`${module}.${action}`);
    }
  }
});
