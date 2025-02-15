import request from '@/utils/request';
import type { ApiResponse } from './types';

export interface InboundOrderItem {
  material_id: number;
  quantity: number;
  unit_cost: number;
}

export interface InboundOrder {
  inbound_order_id: number;
  order_number: string;
  warehouse_id: number;
  supplier_id: number;
  inbound_date: string;
  inbound_type: string;
  status: string;
  remarks?: string;
  created_by: number;
  owner_id: number;
  items: InboundOrderItem[];
}

export const inboundOrderApi = {
  // 创建入库单
  createInboundOrder(data: any) {
    return request.post<ApiResponse>(
      '/inbound-orders',
      data,
      { headers: { 'X-No-Wrapper': 'true' } }
    );
  },
  // 更新入库单
  updateInboundOrder(id: number, data: any) {
    return request.put<ApiResponse>(
      `/inbound-orders/${id}`,
      data,
      { headers: { 'X-No-Wrapper': 'true' } }
    );
  },
  // 删除入库单
  deleteInboundOrder(id: number) {
    return request.delete<ApiResponse>(`/inbound-orders/${id}`);
  },
  // 查询入库单列表（可附带条件、分页）
  getInboundOrders(params?: any) {
    return request.get<ApiResponse>('/inbound-orders', { params });
  },
  // 导出入库单
  exportInboundOrders() {
    return request.get<Blob>('/inbound-orders/export', {
      responseType: 'blob'
    });
  }
};

// 根据 ID 查询单个入库单及其明细
export function getInboundOrderById(id: number) {
  return request.get(`/inbound-orders/${id}`);
}

// 创建入库单
export function createInboundOrder(payload: any) {
  return request.post('/inbound-orders', payload, { headers: { 'X-No-Wrapper': 'true' } });
}

// 更新入库单（注意 URL 参数使用 inboundOrderId，与后端控制器保持一致）
export function updateInboundOrder(inboundOrderId: number, payload: any) {
  return request.put(`/inbound-orders/${inboundOrderId}`, payload, { headers: { 'X-No-Wrapper': 'true' } });
}

// 查询入库单列表（支持分页和过滤）
export function getInboundOrders(params: any) {
  return request.get('/inbound-orders', { params });
}

// 删除入库单
export function deleteInboundOrder(inboundOrderId: number) {
  return request.delete(`/inbound-orders/${inboundOrderId}`);
}
