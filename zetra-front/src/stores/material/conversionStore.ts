import { defineStore } from 'pinia';
import * as conversionApi from '@/api/material/conversion';
import { useMaterialUnitStore } from './unitStore';
import type { Conversion, ConversionCheck, UnitConversion } from '@/types/material';
import { ElMessage } from 'element-plus';

interface ConversionState {
  conversions: Conversion[];
  loading: boolean;
  total: number;
}

export const useMaterialConversionStore = defineStore('materialConversion', {
  state: () => ({
    conversions: [] as Conversion[],
    loading: false,
    total: 0
  }),

  getters: {
    // 获取所有换算关系
    allConversions: (state) => state.conversions,

    // 获取启用状态的换算关系
    activeConversions: (state) =>
      state.conversions.filter(conv => conv.status === 'active'),

    // 获取换算关系Map
    conversionMap: (state) => {
      const map = new Map<number, Conversion>();
      state.conversions.forEach(conv => {
        map.set(conv.conversion_id, conv);
      });
      return map;
    },

    // 获取通用换算关系（不绑定物料）
    generalConversions: (state) =>
      state.conversions.filter(conv => !conv.material_id),

    // 获取物料专用换算关系
    materialConversions: (state) =>
      state.conversions.filter(conv => conv.material_id),

    // 按单位分组的换算关系
    conversionsByUnit: (state) => {
      const unitStore = useMaterialUnitStore();
      const result = new Map<number, UnitConversion[]>();

      state.conversions.forEach(conv => {
        // 添加单位名称
        const fromUnit = unitStore.unitMap.get(conv.from_unit_id);
        const toUnit = unitStore.unitMap.get(conv.to_unit_id);

        if (fromUnit && toUnit) {
          // 源单位分组
          const fromList = result.get(conv.from_unit_id) || [];
          fromList.push({
            ...conv,
            from_unit_name: fromUnit.unit_name,
            to_unit_name: toUnit.unit_name
          });
          result.set(conv.from_unit_id, fromList);
        }
      });

      return result;
    },

    // 获取换算关系加载状态
    isLoading: (state) => state.loading
  },

  actions: {
    // 获取换算关系列表
    async fetchConversions(params?: any) {
      this.loading = true;
      try {
        const response = await conversionApi.fetchConversions(params);
        if (!response.success) {
          throw new Error(response.message || '获取换算关系列表失败');
        }
        this.conversions = response.data.list;
        this.total = response.data.total;
        return response.data;
      } catch (error) {
        console.error('获取换算关系列表失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取换算关系详情
    async getConversionById(id: number) {
      const { data } = await conversionApi.getConversionById(id);
      return data;
    },

    // 创建换算关系
    async createConversion(data: Partial<Conversion>) {
      try {
        const response = await conversionApi.createConversion(data);
        if (!response.success) {
          throw new Error(response.message || '创建换算关系失败');
        }
        await this.fetchConversions();
        return response;
      } catch (error) {
        console.error('创建换算关系失败:', error);
        throw error;
      }
    },

    // 更新换算关系
    async updateConversion(id: number, data: Partial<Conversion>) {
      try {
        const response = await conversionApi.updateConversion(id, data);
        if (!response.success) {
          throw new Error(response.message || '更新换算关系失败');
        }
        await this.fetchConversions();
        return response;
      } catch (error) {
        console.error('更新换算关系失败:', error);
        throw error;
      }
    },

    // 删除换算关系
    async deleteConversion(id: number) {
      try {
        const response = await conversionApi.deleteConversion(id);
        if (!response.success) {
          throw new Error(response.message || '删除换算关系失败');
        }
        await this.fetchConversions();
        return response;
      } catch (error) {
        console.error('删除换算关系失败:', error);
        throw error;
      }
    },

    // 检查循环换算
    async checkCircularConversion(params: conversionApi.ConversionCheck) {
      const { data } = await conversionApi.checkCircularConversion(params);
      return data;
    },

    // 验证换算关系
    async validateConversion(conversion: Partial<Conversion>) {
      const { data } = await conversionApi.validateConversion(conversion);
      return data;
    },

    // 获取换算路径
    async getConversionPath(fromUnit: number, toUnit: number, materialId?: number) {
      const { data } = await conversionApi.getConversionPath(fromUnit, toUnit, materialId);
      return data;
    },

    // 重置状态
    reset() {
      this.conversions = [];
      this.total = 0;
      this.loading = false;
    }
  }
});
