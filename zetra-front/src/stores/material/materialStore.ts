import { defineStore } from 'pinia';
import * as materialApi from '@/api/material/material';
import type { Material } from '@/types/material';
import type { ApiResponse, PageResult } from '@/types/api';

export const useMaterialStore = defineStore('material', {
  state: () => ({
    materials: [] as Material[],
    loading: false,
    total: 0
  }),

  actions: {
    // 获取物料列表
    async fetchMaterials(params?: any) {
      this.loading = true;
      try {
        const response = await materialApi.fetchMaterials(params);
        if (!response.success) {
          throw new Error(response.message || '获取物料列表失败');
        }
        this.materials = response.data.list;
        this.total = response.data.total;
        return response.data;
      } catch (error) {
        console.error('获取物料列表失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 创建物料
    async createMaterial(data: Partial<Material>) {
      try {
        const response = await materialApi.createMaterial(data);
        if (!response.success) {
          throw new Error(response.message || '创建物料失败');
        }
        return response;
      } catch (error) {
        console.error('创建物料失败:', error);
        throw error;
      }
    }
  }
});
