import { defineStore } from 'pinia';
import { permissionApi } from '@/api/permission';

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    availablePermissions: [] as string[],
    userPermissions: new Map<number, string[]>()
  }),

  actions: {
    // 加载用户权限
    async loadUserPermissions(userId: number) {
      try {
        const response = await permissionApi.getUserPermissions(userId);
        if (response.data.success) {
          this.userPermissions.set(userId, response.data.data);
        }
      } catch (error) {
        console.error('加载用户权限失败:', error);
      }
    },

    // 分配权限
    async assignPermissions(userId: number, permissions: string[]) {
      try {
        const response = await permissionApi.assignPermissions(userId, permissions);
        if (response.data.success) {
          this.userPermissions.set(userId, permissions);
          return true;
        }
        return false;
      } catch (error) {
        console.error('分配权限失败:', error);
        return false;
      }
    }
  }
});
