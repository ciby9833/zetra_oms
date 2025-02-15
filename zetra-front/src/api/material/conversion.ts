import request from '@/utils/request';
import type { Conversion, ConversionCheck } from '@/types/material';
import type { ApiResponse, PageQuery, PageResult } from '@/types/api';

export interface ConversionQuery extends PageQuery {
  material_id?: number;
  unit_id?: number;
}

// 查询换算关系列表
export const fetchConversions = (params?: PageQuery) =>
  request.get<ApiResponse<PageResult<Conversion>>>('/material/unit-conversions', { params });

// 获取换算关系详情
export const getConversionById = (id: number) =>
  request.get<ApiResponse<Conversion>>(`/material/unit-conversions/${id}`);

// 创建换算关系
export const createConversion = (data: Partial<Conversion>) =>
  request.post<ApiResponse>('/material/unit-conversions', {
    Xzetra: JSON.stringify(data)
  });

// 更新换算关系
export const updateConversion = (id: number, data: Partial<Conversion>) =>
  request.put<ApiResponse>(`/material/unit-conversions/${id}`, {
    Xzetra: JSON.stringify(data)
  });

// 删除换算关系
export const deleteConversion = (id: number) =>
  request.delete<ApiResponse>(`/material/unit-conversions/${id}`);

// 检查循环换算
export const checkCircularConversion = (params: ConversionCheck) =>
  request.post<ApiResponse<boolean>>('/material/unit-conversions/check-circular', {
    Xzetra: JSON.stringify(params)
  });

// 验证换算关系
export const validateConversion = (data: Partial<Conversion>) =>
  request.post<ApiResponse<boolean>>('/material/unit-conversions/validate', {
    Xzetra: JSON.stringify(data)
  });

// 获取换算路径
export const getConversionPath = (fromUnit: number, toUnit: number, materialId?: number) =>
  request.get<ApiResponse<Conversion[]>>('/material/unit-conversions/path', {
    params: { fromUnit, toUnit, materialId }
  });
