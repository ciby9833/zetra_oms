// 认证接口
import request from './request';
import type { LoginResponse } from '@/stores/auth';
import type { ApiResponse } from './types';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export const authApi = {
  // 获取验证码
  async getCaptcha(email: string) {
    try {
      const response = await request.get('/users/captcha', {
        params: { email },
        responseType: 'text',  // 接收文本响应
        headers: {
          'Accept': 'image/svg+xml'  // 指定接收 SVG
        }
      });
      return response.data;
    } catch (error) {
      console.error('获取验证码失败:', error);
      throw error;
    }
  },

  // 登录
  login(data: { email: string; password: string; captcha: string }) {
    return request.post<ApiResponse<LoginResponse>>('/users/login', {
      Xzetra: JSON.stringify(data)
    });
  },

  // 验证 token
  validateToken() {
    return request.get<ApiResponse>('/users/validate-token');
  },

  // 刷新 token
  refreshToken() {
    return request.post<ApiResponse<{ token: string }>>('/users/refresh-token');
  },

  // 登出
  logout() {
    return request.post<ApiResponse>('/users/logout');
  },

  // 注册
  register(data: RegisterData) {
    return request.post<ApiResponse>('/users/register', {
      Xzetra: JSON.stringify(data)
    });
  },

  // 修改密码
  changePassword(data: {
    email: string;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return request.post<ApiResponse>('/users/change-password', {
      Xzetra: JSON.stringify(data)
    });
  }
};
