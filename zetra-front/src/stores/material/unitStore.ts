import { defineStore } from 'pinia';
import * as unitApi from '@/api/material/unit';
import type { Unit } from '@/types/material';
import { ElMessage } from 'element-plus';

interface UnitState {
  units: Unit[];
  loading: boolean;
  total: number;
}

export const useMaterialUnitStore = defineStore('materialUnit', {
  state: () => ({
    units: [] as Unit[],
    loading: false,
    total: 0
  }),

  getters: {
    // 获取所有单位
    allUnits: (state) => state.units,

    // 获取基本单位列表
    basicUnits: (state) =>
      state.units.filter(unit => unit.unit_type === 'basic'),

    // 获取子单位列表
    subUnits: (state) =>
      state.units.filter(unit => unit.unit_type === 'sub'),

    // 获取启用状态的单位
    activeUnits: (state) =>
      state.units.filter(unit => unit.status === 'active'),

    // 获取单位Map
    unitMap: (state) => {
      const map = new Map<number, Unit>();
      state.units.forEach(unit => {
        map.set(unit.unit_id, unit);
      });
      return map;
    },

    // 获取单位加载状态
    isLoading: (state) => state.loading
  },

  actions: {
    // 获取单位列表
    async fetchUnits(params?: unitApi.UnitQuery) {
      this.loading = true;
      try {
        const { data } = await unitApi.fetchUnits(params);
        this.units = data.list;
        this.total = data.total;
        return data;
      } catch (error) {
        console.error('获取单位列表失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取单位详情
    async getUnitById(id: number) {
      const { data } = await unitApi.getUnitById(id);
      return data;
    },

    // 创建单位
    async createUnit(unitData: Partial<Unit>) {
      try {
        const { data } = await unitApi.createUnit(unitData);
        await this.fetchUnits();
        return data;
      } catch (error) {
        console.error('创建单位失败:', error);
        throw error;
      }
    },

    // 更新单位
    async updateUnit(id: number, unitData: Partial<Unit>) {
      try {
        const { data } = await unitApi.updateUnit(id, unitData);
        await this.fetchUnits();
        return data;
      } catch (error) {
        console.error('更新单位失败:', error);
        throw error;
      }
    },

    // 检查单位使用情况
    async checkUnitUsage(unitId: number) {
      try {
        const response = await unitApi.checkUnitUsage(unitId);
        if (!response.success) {
          throw new Error(response.message || '检查单位使用情况失败');
        }
        return response;
      } catch (error) {
        console.error('检查单位使用情况失败:', error);
        throw error;
      }
    },

    // 删除单位
    async deleteUnit(unitId: number) {
      try {
        const response = await unitApi.deleteUnit(unitId);
        if (!response.success) {
          throw new Error(response.message || '删除单位失败');
        }
        await this.fetchUnits();
        return response;
      } catch (error) {
        console.error('删除单位失败:', error);
        throw error;
      }
    },

    // 检查单位编码
    async checkUnitCode(code: string, id?: number) {
      const { data } = await unitApi.checkUnitCode(code, id);
      return data;
    },

    // 重置状态
    reset() {
      this.units = [];
      this.total = 0;
      this.loading = false;
    }
  }
});
