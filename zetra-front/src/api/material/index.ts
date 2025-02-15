import request from '@/utils/request';
import type { ApiResponse, PageQuery, PageResult } from '@/types/api';
import type { Material } from '@/types/material';

export interface MaterialQuery extends PageQuery {
  keyword?: string;
  category_id?: number | null;
  status?: string;
  exportType?: 'all' | 'selected';
  ids?: number[];
}

/**
 * 获取物料列表
 */
export function fetchMaterials(params: MaterialQuery) {
  return request.get<ApiResponse<PageResult<Material>>>('/material/materials', {
    params
  });
}

/**
 * 获取物料详情
 */
export function getMaterialById(id: number) {
  return request.get<ApiResponse<Material>>(`/material/materials/${id}`)
    .catch(error => {
      console.error('Error fetching material by ID:', error);
      throw error;
    });
}

/**
 * 创建物料
 */
export function createMaterial(data: Partial<Material>) {
  return request.post<ApiResponse>('/material/materials', data);
}

/**
 * 更新物料
 */
export function updateMaterial(id: number, data: Partial<Material>) {
  return request.put<ApiResponse>(`/material/materials/${id}`, data);
}

/**
 * 删除物料
 */
export function deleteMaterial(id: number) {
  return request.delete<ApiResponse<null>>(`/material/materials/${id}`);
}

/**
 * 导入物料
 */
export const importMaterials = (formData: FormData) => {
  // 调试日志
  console.log('FormData details:', {
    hasFile: formData.has('file'),
    entries: Array.from(formData.entries()).map(([key, value]) => ({
      key,
      type: value instanceof File ? 'File' : typeof value,
      fileName: value instanceof File ? value.name : null,
      fileSize: value instanceof File ? value.size : null
    }))
  })

  return request.post<ApiResponse>('/material/materials/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 30000,
    validateStatus: (status) => status < 500
  });
};

/**
 * 导出物料
 */
export const exportMaterials = (params: MaterialQuery) => {
  return request({
    url: '/material/materials/export',
    method: 'GET',
    params: {
      Xzetra: JSON.stringify(params)
    },
    responseType: 'blob',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }).then(response => {
    // 如果是Blob类型且不是JSON，说明是正常的Excel文件
    if (response instanceof Blob && response.type !== 'application/json') {
      // 创建下载链接
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `物料列表_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return response;
    }
    return Promise.reject(new Error('导出失败'));
  });
};

/**
 * 下载导入模板
 */
export const downloadTemplate = () => {
  return request({
    url: '/material/materials/template',
    method: 'GET',
    responseType: 'blob'
  }).then(response => {
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.download = '物料导入模板.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  });
};

export * from './material';
