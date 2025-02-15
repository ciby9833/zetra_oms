import { defineStore } from 'pinia';
import * as categoryApi from '@/api/material/category';
import type { Category } from '@/types/material';
import { ElMessage } from 'element-plus';

export const useMaterialCategoryStore = defineStore('materialCategory', {
  state: () => ({
    categories: [] as Category[],
    loading: false
  }),

  getters: {
    categoryTree: (state) => state.categories,

    // 获取分类Map
    categoryMap: (state) => {
      const map = new Map<number, Category>();
      const traverse = (categories: Category[]) => {
        categories.forEach(category => {
          map.set(category.category_id, category);
          if (category.children?.length) {
            traverse(category.children);
          }
        });
      };
      traverse(state.categories);
      return map;
    }
  },

  actions: {
    // 获取分类树
    async fetchCategoryTree() {
      try {
        this.loading = true;
        const res = await categoryApi.fetchCategoryTree();
        if (res.success) {
          // 构建树形结构
          const buildTree = (items: Category[], parentId: number | null = null) => {
            return items
              .filter(item => item.parent_id === parentId)
              .map(item => ({
                ...item,
                children: buildTree(items, item.category_id)
              }));
          };

          const flatCategories = res.data || [];
          this.categories = buildTree(flatCategories);
          return this.categories;
        }
        return [];
      } catch (error) {
        console.error('获取分类树失败:', error);
        ElMessage.error('获取分类树失败');
        return [];
      } finally {
        this.loading = false;
      }
    },

    // 创建分类
    async createCategory(data: Partial<Category>) {
      try {
        const response = await categoryApi.createCategory(data);
        if (!response.success) {
          throw new Error(response.message || '创建分类失败');
        }
        await this.fetchCategoryTree();
        return response;
      } catch (error) {
        console.error('创建分类失败:', error);
        throw error;
      }
    },

    // 更新分类
    async updateCategory(category: Category) {
      try {
        // 确保只传递需要更新的字段
        const updateData = {
          category_code: category.category_code,
          category_name: category.category_name,
          parent_id: category.parent_id || null,
          sort_order: category.sort_order || 0,
          status: category.status || 'active',
          visibility: category.visibility || 'private',
          max_level: category.max_level || 5
        };

        const response = await categoryApi.updateCategory(
          category.category_id,
          updateData
        );

        if (!response.success) {
          throw new Error(response.message || '更新分类失败');
        }

        // 更新成功后刷新分类树
        await this.fetchCategoryTree();
        return response;
      } catch (error) {
        console.error('更新分类失败:', error);
        throw error;
      }
    },

    // 删除分类
    async deleteCategory(id: number) {
      try {
        const response = await categoryApi.deleteCategory(id);
        if (!response.success) {
          throw new Error(response.message || '删除分类失败');
        }
        await this.fetchCategoryTree();
        return response;
      } catch (error) {
        console.error('删除分类失败:', error);
        throw error;
      }
    },

    // 检查分类编码
    async checkCategoryCode(code: string, id?: number) {
      const { data } = await categoryApi.checkCategoryCode(code, id);
      return data;
    },

    // 排序分类
    async sortCategories(sortData: categoryApi.CategorySort[]) {
      const { data } = await categoryApi.sortCategories(sortData);
      await this.fetchCategoryTree();
      return data;
    },

    // 重置状态
    reset() {
      this.categories = [];
      this.loading = false;
    }
  }
});
