import request from './request';
import type { ApiResponse } from './types';

export const permissionApi = {
  // 获取用户权限
  getUserPermissions(userId?: number) {
    return request.get<ApiResponse>(`/users/permissions/${userId || ''}`);
  },

  // 分配用户权限
  assignPermissions(userId: number, permissions: string[]) {
    return request.post<ApiResponse>('/users/permissions/assign', {
      Xzetra: JSON.stringify({
        userId,
        permissions
      })
    });
  }
};
