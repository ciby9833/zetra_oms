import request from '@/utils/request';
import type { Category } from '@/types/material';
import type { ApiResponse, IdParam } from '@/types/api';

// 获取分类树
export function fetchCategoryTree() {
  return request.get<ApiResponse<Category[]>>('/material/categories/tree');
}

// 获取分类详情
export const getCategoryById = (id: number) =>
  request.get<ApiResponse<Category>>(`/material/categories/${id}`);

// 创建分类
export const createCategory = (data: Partial<Category>) =>
  request.post<ApiResponse>('/material/categories', {
    Xzetra: JSON.stringify(data)
  });

// 更新分类
export const updateCategory = (id: number, data: Partial<Category>) =>
  request.put<ApiResponse>(`/material/categories/${id}`, {
    Xzetra: JSON.stringify(data)
  });

// 删除分类
export const deleteCategory = (id: number) =>
  request.delete<ApiResponse>(`/material/categories/${id}`);

// 检查分类编码
export const checkCategoryCode = (code: string, id?: number) =>
  request.get<ApiResponse<boolean>>('/material/category/check-code', {
    params: { code, id }
  });

// 排序分类
export interface CategorySort extends IdParam {
  sort_order: number;
}

export const sortCategories = (data: CategorySort[]) =>
  request.put<ApiResponse>('/material/category/sort', data);
