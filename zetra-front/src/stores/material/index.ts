import { defineStore } from 'pinia';
import { useMaterialCategoryStore } from './categoryStore';
import { useMaterialUnitStore } from './unitStore';
import { useMaterialConversionStore } from './conversionStore';
import * as materialApi from '@/api/material';
import type { Material } from '@/types/material';
import type { PageQuery } from '@/types/api';
import { ElMessage } from 'element-plus';

export const useMaterialStore = defineStore('material', {
  state: () => ({
    materials: [] as Material[],
    loading: false,
    total: 0,
    initialized: false,
    error: null as Error | null
  }),

  getters: {
    // 获取启用状态的物料列表
    activeMaterials: (state) =>
      state.materials.filter(item => item.status === 'active'),

    // 按分类分组的物料
    materialsByCategory: (state) => {
      const categoryStore = useMaterialCategoryStore();
      const result = new Map<number, Material[]>();

      state.materials.forEach(material => {
        if (material.category_id) {
          const list = result.get(material.category_id) || [];
          list.push(material);
          result.set(material.category_id, list);
        }
      });

      return result;
    },

    // 获取物料总数
    materialCount: (state) => state.total,

    // 获取物料加载状态
    isLoading: (state) => state.loading,

    // 获取物料的完整信息（包含分类、单位信息）
    materialDetails: (state) => {
      const categoryStore = useMaterialCategoryStore();
      const unitStore = useMaterialUnitStore();

      return state.materials.map(material => ({
        ...material,
        category: categoryStore.categoryMap.get(material.category_id || 0),
        unit_info: unitStore.unitMap.get(material.unit),
        sub_unit_info: material.sub_unit ? unitStore.unitMap.get(material.sub_unit) : undefined
      }));
    },

    // 按状态分组的物料
    materialsByStatus: (state) => {
      const result = new Map<string, Material[]>();
      state.materials.forEach(material => {
        const list = result.get(material.status) || [];
        list.push(material);
        result.set(material.status, list);
      });
      return result;
    },

    // 获取有效的物料数量
    activeCount: (state) =>
      state.materials.filter(m => m.status === 'active').length,

    // 获取批次管理的物料数量
    batchControlCount: (state) =>
      state.materials.filter(m => m.batch_control).length,

    // 获取序列号管理的物料数量
    serialControlCount: (state) =>
      state.materials.filter(m => m.serial_control).length
  },

  actions: {
    // 初始化所有基础数据
    async initialize() {
      if (this.initialized) return;

      try {
        this.loading = true;
        await this.fetchAllData();
        this.initialized = true;
      } catch (error) {
        console.error('初始化物料数据失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取所有基础数据
    async fetchAllData() {
      const categoryStore = useMaterialCategoryStore();
      const unitStore = useMaterialUnitStore();
      const conversionStore = useMaterialConversionStore();

      try {
        // 并行加载所有基础数据
        await Promise.all([
          categoryStore.fetchCategoryTree().catch(error => {
            console.error('加载分类数据失败:', error);
            throw new Error('加载分类数据失败');
          }),

          unitStore.fetchUnits().catch(error => {
            console.error('加载单位数据失败:', error);
            throw new Error('加载单位数据失败');
          }),

          conversionStore.fetchConversions().catch(error => {
            console.error('加载换算数据失败:', error);
            throw new Error('加载换算数据失败');
          })
        ]);

      } catch (error) {
        console.error('获取基础数据失败:', error);
        ElMessage.error('加载基础数据失败，请刷新页面重试');
        throw error;
      }
    },

    // 获取物料列表
    async fetchMaterials(params?: any) {
      try {
        this.loading = true;

        // 过滤掉无效的参数
        const validParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>);

        const { data } = await materialApi.fetchMaterials(validParams);
        this.materials = data.list;
        this.total = data.total;
        return data;
      } catch (error) {
        console.error('获取物料列表失败:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 获取物料详情
    async getMaterialById(id: number) {
      console.info('[Material] 获取物料详情, ID:', id);
      try {
        const { data } = await materialApi.getMaterialById(id);
        console.info('[Material] 获取物料详情成功:', data);
        return data;
      } catch (error) {
        console.error('[Material] 获取物料详情失败:', error);
        throw error;
      }
    },

    // 创建物料
    async createMaterial(data: Partial<Material>) {
      try {
        console.log('Store创建物料:', data);
        const response = await materialApi.createMaterial(data);

        // 如果创建成功，不需要立即刷新列表
        if (response.success) {
          return {
            success: true,
            message: '创建成功',
            data: response.data
          };
        }

        throw new Error(response.message || '创建物料失败');
      } catch (error: any) {
        console.error('[Material] 创建物料失败:', error);
        throw new Error(error.response?.data?.message || error.message || '创建物料失败');
      }
    },

    // 更新物料
    async updateMaterial(id: number, material: Partial<Material>) {
      console.info('[Material] 开始更新物料, ID:', id, '数据:', material);
      try {
        const { data } = await materialApi.updateMaterial(id, material);
        console.info('[Material] 更新物料成功');
        return data;
      } catch (error) {
        console.error('[Material] 更新物料失败:', error);
        throw error;
      }
    },

    // 删除物料
    async deleteMaterial(id: number) {
      console.info('[Material] 开始删除物料, ID:', id);
      try {
        const { data } = await materialApi.deleteMaterial(id);
        console.info('[Material] 删除物料成功');
        return data;
      } catch (error) {
        console.error('[Material] 删除物料失败:', error);
        throw error;
      }
    },

    // 检查物料编码
    async checkMaterialCode(code: string, id?: number) {
      const { data } = await materialApi.checkMaterialCode(code, id);
      return data;
    },

    // 导入物料
    async importMaterials(file: FormData) {
      console.info('[Material] 开始导入物料');
      try {
        const { data } = await materialApi.importMaterials(file);
        console.info('[Material] 导入物料成功');
        return data;
      } catch (error) {
        console.error('[Material] 导入物料失败:', error);
        throw error;
      }
    },

    // 导出物料
    async exportMaterials(params: MaterialQuery) {
      try {
        await materialApi.exportMaterials(params);
        return true;
      } catch (error) {
        console.error('[Material] 导出物料失败:', error);
        throw error;
      }
    },

    // 重置状态
    reset() {
      this.materials = [];
      this.total = 0;
      this.loading = false;
      this.initialized = false;
      this.error = null;
    }
  }
});
