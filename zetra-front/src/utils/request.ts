import axios from 'axios';
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse
} from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore();

    // 添加 token
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }

    // 如果请求体中已经有 Xzetra，不需要再次包装
    if (
      config.data &&
      !config.headers['X-No-Wrapper'] && // 如果未设置跳过包装标记
      !config.data.Xzetra &&
      typeof config.data === 'object'
    ) {
      config.data = {
        Xzetra: JSON.stringify(config.data)
      };
    }

    // 移除重复的 api 前缀
    if (config.url?.startsWith('/api/api/')) {
      config.url = config.url.replace('/api/api/', '/api/');
    }

    // 对于 POST 请求，不要覆盖已设置的 Content-Type
    if (config.method?.toLowerCase() === 'post' && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    // 打印请求配置
    console.log('Request Config:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });

    return config;
  },
  error => {
    console.error('[Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 如果是blob类型响应，直接返回
    if (response.config.responseType === 'blob') {
      // 检查是否是错误响应（JSON格式）
      if (response.data instanceof Blob && response.data.type === 'application/json') {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              reject(new Error(errorData.message || '请求失败'));
            } catch (e) {
              reject(new Error('请求失败'));
            }
          };
          reader.onerror = () => reject(new Error('请求失败'));
          reader.readAsText(response.data);
        });
      }
      return response.data;
    }

    // 处理普通JSON响应
    const data = response.data;
    if (!data.success && data.message) {
      return Promise.reject(new Error(data.message));
    }
    return data;
  },
  (error) => {
    // 添加错误详细日志
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    const message = error.response?.data?.message || error.message || '请求失败';
    ElMessage.error(message);

    if (error.response &&
        error.response.data &&
        error.response.data.message === 'token_invalid') {
      // Token 失效处理，例如清除token、跳转到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(new Error(message));
  }
);

export default request;
