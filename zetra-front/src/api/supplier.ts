import request from './request';
import type { ApiResponse } from './types';


export interface Supplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  description?: string;
  contact_person?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  category_id?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

export const supplierApi = {
  // 获取供应商列表
  getSuppliers(params?: any) {
    return request.get<ApiResponse>('/suppliers', { params });
  },

  // 创建供应商
  createSupplier(data: any) {
    // 仅在新增时移除 supplier_id 字段（例如 supplier_id 为 0 时表示新增）
    const payload = { ...data };
    if (payload.supplier_id === 0) {
      delete payload.supplier_id;
    }
    return request.post<ApiResponse>('/suppliers', payload);
  },

  // 更新供应商
  updateSupplier(id: number, data: any) {
    // 定义允许更新的字段，与后端 updateSupplierSchema 配置一致
    const allowedFields = [
      'supplier_name',
      'description',
      'contact_person',
      'contact_phone',
      'email',
      'address',
      'tax_number',
      'category_id',
      'status',
      'notes',
      'updated_at'
    ];

    // 生成只包含允许更新字段的新 payload
    const payload = allowedFields.reduce((acc, field) => {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        acc[field] = data[field];
      }
      return acc;
    }, {} as any);

    return request.put<ApiResponse>(`/suppliers/${id}`, payload);
  },

  // 删除供应商
  deleteSupplier(id: number) {
    return request.delete<ApiResponse>(`/suppliers/${id}`);
  },

  // 导入供应商数据
  importSuppliers(formData: FormData) {
    return request.post<ApiResponse>('/suppliers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      validateStatus: (status) => {
        return (status >= 200 && status < 300) || status === 400;
      }
    });
  },

  // 导出供应商数据
  exportSuppliers() {
    return request.get<Blob>('/suppliers/export', {
      responseType: 'blob'
    });
  }
};
