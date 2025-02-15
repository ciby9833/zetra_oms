import request from './request';
import type { ApiResponse } from './types';

export interface SubUser {
  userId: number;
  username: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  accountType: string;
  userRole: string;
  employeeNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin?: string;
}

export interface SubUserForm {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export const userApi = {
  // 获取子用户列表
  getSubUsers() {
    return request.get<ApiResponse>('/users/sub-users');
  },

  // 创建子用户
  createSubUser(data: SubUserForm) {
    return request.post<ApiResponse>('/users/sub-users', {
      Xzetra: JSON.stringify(data)
    });
  },

  // 更新子用户状态
  updateSubUserStatus(userId: number, status: 'active' | 'inactive') {
    return request.put<ApiResponse>(`/users/sub-users/${userId}/status`, {
      Xzetra: JSON.stringify({ status })
    });
  },

  // 删除子用户
  deleteSubUser(userId: number) {
    return request.delete<ApiResponse>(`/users/sub-users/${userId}`);
  },

  // 更新子用户
  updateSubUser(userId: number, data: Partial<SubUser>) {
    return request.put<ApiResponse>(`/users/sub-users/${userId}`, {
      Xzetra: JSON.stringify(data)
    });
  }
};
