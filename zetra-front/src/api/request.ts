// 请求工具
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import { ElMessage } from 'element-plus';

// 定义不需要 token 的白名单路径
const whiteList = [
  '/users/login',
  '/users/register',
  '/users/captcha',
  '/auth/register'
];

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true
});

// 是否正在刷新token
let isRefreshing = false;
// 等待刷新token的请求队列
let requests: ((token: string) => void)[] = [];

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();

    // 检查是否在白名单中
    const isWhitelisted = whiteList.some(path => config.url?.includes(path));

    if (authStore.token) {
      // 检查用户信息是否完整
      if (!isWhitelisted && !authStore.user?.userId) {
        console.error('Missing user information');
        ElMessage.error('用户信息不完整，请重新登录');
        authStore.logout();
        router.push('/login');
        return Promise.reject(new Error('Invalid user info'));
      }

      config.headers['Authorization'] = `Bearer ${authStore.token}`;
    } else if (!isWhitelisted) {
      ElMessage.warning('请先登录');
      router.push('/login');
      return Promise.reject(new Error('No token'));
    }

    console.log('最终请求 URL:', config.baseURL + config.url);
    console.log('查询参数:', config.params);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        if (!isRefreshing) {
          isRefreshing = true;
          const authStore = useAuthStore();
          return authStore.refreshToken().then((newToken) => {
            // 更新 token 并重试之前的请求
            authStore.token = newToken;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            // 执行所有排队请求
            requests.forEach(callback => callback(newToken));
            requests = [];
            return request(originalRequest);
          }).catch((refreshError) => {
            // 若刷新失败，则跳转到登录页面
            router.push('/login');
            return Promise.reject(refreshError);
          }).finally(() => {
            isRefreshing = false;
          });
        } else {
          // 如果正在刷新token，则将该请求加入待执行队列
          return new Promise(resolve => {
            requests.push((token: string) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(request(originalRequest));
            });
          });
        }
      }
    }
    return Promise.reject(error);
  }
);

export default request;
