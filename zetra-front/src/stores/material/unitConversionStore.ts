import { defineStore } from 'pinia';
import { getUnitConversion } from '@/api/material/material';
import type { UnitConversion } from '@/types/material';

interface UnitConversionState {
  unitConversions: UnitConversion[];
}

//专门的 unitConversionStore 来处理物料表单中的单位换算
// 在物料表单中，需要根据选择的单位，计算出其他单位的换算比例

export const useUnitConversionStore = defineStore('unitConversion', {
  state: (): UnitConversionState => ({
    unitConversions: []
  }),

  actions: {
    // 获取单位换算比例
    async getConversion(fromUnitId: number, toUnitId: number) {
      try {
        // 先从缓存中查找
        let conversion = this.unitConversions.find(
          (c) => c.from_unit_id === fromUnitId && c.to_unit_id === toUnitId
        );

        if (!conversion) {
          // 如果缓存中没有，则从服务器获取
          const response = await getUnitConversion(fromUnitId, toUnitId);
          if (!response.success) {
            throw new Error(response.message || '获取换算比例失败');
          }
          conversion = response.data;
          // 添加到缓存
          if (conversion) {
            this.unitConversions.push(conversion);
          }
        }

        return conversion;
      } catch (error) {
        console.error('获取换算比例失败:', error);
        throw error;
      }
    },

    // 清除缓存
    clearCache() {
      this.unitConversions = [];
    }
  }
});
