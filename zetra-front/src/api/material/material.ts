import request from '@/utils/request';
import type { Material } from '@/types/material';
import type { ApiResponse, PageQuery, PageResult } from '@/types/api';
import type { UnitConversion } from '@/types/material';

export interface MaterialDetail extends Material {
  unit_name?: string;
  unit_code?: string;
  sub_unit_name?: string;
  sub_unit_code?: string;
  category_name?: string;
}

// 获取物料列表
export const fetchMaterials = (params?: PageQuery) =>
  request.get<ApiResponse<PageResult<MaterialDetail>>>('/materials', {
    params: {
      ...params,
      Xzetra: JSON.stringify(params)
    }
  });

// 创建物料
export const createMaterial = (data: Partial<Material>) => {
  // 确保转换字段名
  const submitData = {
    ...data,
    conversion_rate: data.conversion_ratio,  // 转换字段名
  };
  delete submitData.conversion_ratio;  // 删除旧字段

  return request.post<ApiResponse<{ material_id: number }>>('/material/materials', {
    Xzetra: JSON.stringify(submitData)
  });
};

// 更新物料
export const updateMaterial = (id: number, data: Partial<Material>) =>
  request.put<ApiResponse>(`/material/materials/${id}`, {
    Xzetra: JSON.stringify({
      ...data,
      conversion_rate: data.conversion_rate ? Number(data.conversion_rate) : null,
      shelf_life: data.shelf_life ? Number(data.shelf_life) : null
    })
  });

// 获取物料详情
export const getMaterialById = (id: number) =>
  request.get<ApiResponse<MaterialDetail>>(`/material/materials/${id}`, {
    params: {
      Xzetra: JSON.stringify({ id })
    }
  });

// 删除物料
export const deleteMaterial = (id: number) =>
  request.delete<ApiResponse>(`/material/materials/${id}`);

// 获取所有换算关系
export const fetchUnitConversions = () =>
  request.get<ApiResponse<UnitConversion[]>>('/material/unit/conversions');

// 获取指定单位间的换算比例
export const getUnitConversion = (fromUnitId: number, toUnitId: number) =>
  request.get<ApiResponse<UnitConversion>>('/material/unit/conversions/find', {
    params: {
      from_unit_id: fromUnitId,
      to_unit_id: toUnitId,
      Xzetra: JSON.stringify({ from_unit_id: fromUnitId, to_unit_id: toUnitId })
    }
  });

// 导出物料
export const exportMaterials = (params: Partial<MaterialQuery>) =>
  request.get('/materials/export', {
    params: {
      ...params,
      Xzetra: JSON.stringify(params)
    },
    responseType: 'blob',
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  });

// 导入物料
export const importFile = (data) => {
 return request.post('/material/import', data, {
   headers: {
     'Content-Type': 'multipart/form-data'
   }
 });
};

export interface MaterialQuery {
  keyword?: string;
  category_id?: number | null;
  status?: string;
  exportType?: 'all' | 'selected';
  ids?: number[];
}
