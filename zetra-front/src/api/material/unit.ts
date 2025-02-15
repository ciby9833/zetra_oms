import request from '@/utils/request';
import type { Unit, UnitUsageCheck } from '@/types/material';
import type { ApiResponse, PageQuery, PageResult } from '@/types/api';

export interface UnitQuery extends PageQuery {
  unit_type?: 'basic' | 'sub';
}

// 查询单位列表
export const fetchUnits = (params: UnitQuery) =>
  request.get<ApiResponse<PageResult<Unit>>>('/material/units', { params });

// 获取单位详情
export const getUnitById = (id: number) =>
  request.get<ApiResponse<Unit>>(`/material/units/${id}`);

// 创建单位
export const createUnit = (data: Partial<Unit>) =>
  request.post<ApiResponse>('/material/units', {
    Xzetra: JSON.stringify(data)
  });

// 更新单位
export const updateUnit = (id: number, data: Partial<Unit>) =>
  request.put<ApiResponse>(`/material/units/${id}`, {
    Xzetra: JSON.stringify(data)
  });

// 删除单位
export const deleteUnit = (id: number) =>
  request.delete<ApiResponse>(`/material/units/${id}`);

// 检查单位编码
export const checkUnitCode = (code: string, id?: number) =>
  request.get<ApiResponse<boolean>>('/material/unit/check-code', {
    params: { code, id }
  });

// 检查单位使用情况
export const checkUnitUsage = (unitId: number) =>
  request.get<ApiResponse<UnitUsageCheck>>(`/material/units/${unitId}/usage`);
