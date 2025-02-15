// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

// 分页查询参数
export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  [key: string]: any;
}

// 分页结果
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 文件上传响应
export interface UploadResult {
  url: string;
  name: string;
  size: number;
}

// 通用ID参数
export interface IdParam {
  id: number | string;
}
