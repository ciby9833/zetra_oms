import request from './request';
import type { ApiResponse } from './types';

export interface Warehouse {
  warehouse_id: number;
  warehouse_name: string;
  warehouse_code: string;
  location: string;
  capacity: number;
  manager_id: number | null;
  contact_phone: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  created_by: number;
  owner_id: number;
  created_at: string;
  manager_name?: string;
  creator_name?: string;
  owner_name?: string;
  is_creator?: boolean;
  country: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  township: string | null;
  country_id: number | null;
  province_id: number | null;
  city_id: number | null;
  district_id: number | null;
  township_id: number | null;
}

export const warehouseApi = {
  // 获取仓库列表
  getWarehouses(params?: any) {
    return request.get<ApiResponse>('/warehouses', {
      params: {
        ...params,
        Xzetra: JSON.stringify(params)
      }
    });
  },

  // 获取仓库详情
  getWarehouse(id: number) {
    return request.get<ApiResponse<Warehouse>>(`/warehouse/${id}`);
  },

  // 创建仓库
  createWarehouse(data: any) {
    return request.post<ApiResponse>('/warehouses', {
      Xzetra: JSON.stringify(data)
    });
  },

  // 更新仓库
  updateWarehouse(id: number, data: any) {
    return request.put<ApiResponse>(`/warehouses/${id}`, {
      Xzetra: JSON.stringify(data)
    });
  },

  // 删除仓库
  deleteWarehouse(id: number) {
    return request.delete<ApiResponse>(`/warehouses/${id}`);
  }
};
