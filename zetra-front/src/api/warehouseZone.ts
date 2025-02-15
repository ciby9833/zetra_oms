import request from './request';
import type { ApiResponse } from './types';

export interface WarehouseZone {
  zone_id: number;
  warehouse_id: number;
  zone_code: string;
  zone_name: string;
  capacity: number;
  type: 'storage' | 'picking' | 'packing' | 'receiving';
  status: 'active' | 'inactive' | 'maintenance';
  warehouse_name?: string;
  created_at: string;
  updated_at?: string;
}

export const warehouseZoneApi = {
  // 获取货区列表
  getZones(params?: any) {
    return request.get<ApiResponse>('/warehouse-zones', {
      params: {
        ...params,
        Xzetra: JSON.stringify(params)
      }
    });
  },

  // 创建货区
  createZone(data: any) {
    return request.post<ApiResponse>('/warehouse-zones', {
      Xzetra: JSON.stringify(data)
    });
  },

  // 更新货区
  updateZone(id: number, data: any) {
    return request.put<ApiResponse>(`/warehouse-zones/${id}`, {
      Xzetra: JSON.stringify(data)
    });
  },

  // 删除货区
  deleteZone(id: number) {
    return request.delete<ApiResponse>(`/warehouse-zones/${id}`);
  },

  // 更新货区状态
  updateStatus(id: number, status: string) {
    return request.patch<ApiResponse>(`/warehouse-zones/${id}/status`, {
      Xzetra: JSON.stringify({ status })
    });
  },

  // 下载导入模板
  downloadTemplate() {
    return request.get('/warehouse-zones/download-template', {
      responseType: 'blob',
      headers: {
        'X-Zetra': JSON.stringify({ token: localStorage.getItem('token') })
      }
    });
  },

  // 导入数据
  importData(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('Xzetra', JSON.stringify({ token: localStorage.getItem('token') }));

    return request.post<ApiResponse>('/warehouse-zones/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      validateStatus: (status) => {
        // 允许400状态码，因为这是预期的错误响应
        return (status >= 200 && status < 300) || status === 400;
      }
    });
  },

  // 下载错误报告
  downloadErrorReport(url: string) {
    // 确保URL格式正确
    const apiUrl = url.startsWith('/') ? url : `/${url}`;
    return request.get<Blob>(`/api${apiUrl}`, {
      responseType: 'blob',
      headers: {
        'X-Zetra': JSON.stringify({ token: localStorage.getItem('token') })
      },
      validateStatus: (status) => {
        return (status >= 200 && status < 300) || status === 404;
      }
    });
  }
};
