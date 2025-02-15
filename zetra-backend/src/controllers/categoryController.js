const MaterialCategoryModel = require('../models/materialCategoryModel');
const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');

class CategoryController {
  // 获取分类列表
  static async getCategories(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);
      
      const params = {
        ...req.query,
        owner_id: masterUserId
      };

      const categories = await MaterialCategoryModel.getCategories(params);
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      Logger.error('获取分类列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分类列表失败'
      });
    }
  }

  // 获取分类树
  static async getCategoryTree(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      const tree = await MaterialCategoryModel.getCategoryTree(masterUserId);
      res.json({
        success: true,
        data: tree
      });
    } catch (error) {
      Logger.error('获取分类树失败:', error);
      res.status(500).json({
        success: false,
        message: '获取分类树失败'
      });
    }
  }

  // 创建分类
  static async createCategory(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 检查 Xzetra 字段是否存在
      if (!req.body.Xzetra) {
        throw new Error('缺少必要的数据字段');
      }

      // 解析数据
      const data = JSON.parse(req.body.Xzetra);
      
      // 验证必要字段
      if (!data.category_code || !data.category_name) {
        throw new Error('分类代码和名称不能为空');
      }

      // 添加创建者和所有者信息
      const categoryData = {
        ...data,
        created_by: userId,
        owner_id: masterUserId
      };

      // 如果有父级分类，需要处理路径和层级
      if (data.parent_id) {
        const parentCategory = await MaterialCategoryModel.getCategoryById(data.parent_id);
        if (!parentCategory) {
          throw new Error('父级分类不存在');
        }

        categoryData.path = `${parentCategory.path}/${data.parent_id}`;
        categoryData.level = parentCategory.level + 1;

        // 检查层级限制
        if (categoryData.level > (parentCategory.max_level || 5)) {
          throw new Error('超出最大层级限制');
        }
      } else {
        categoryData.path = '0';
        categoryData.level = 1;
      }

      const result = await MaterialCategoryModel.createCategory(categoryData);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      Logger.error('创建分类失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '创建分类失败'
      });
    }
  }

  // 更新分类
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 检查 Xzetra 字段是否存在
      if (!req.body.Xzetra) {
        throw new Error('缺少必要的数据字段');
      }

      // 解析数据
      const data = JSON.parse(req.body.Xzetra);
      
      // 验证必要字段
      if (!data.category_code || !data.category_name) {
        throw new Error('分类代码和名称不能为空');
      }

      // 检查分类是否存在
      const category = await MaterialCategoryModel.getCategoryById(id);
      if (!category) {
        throw new Error('分类不存在');
      }

      // 检查权限
      if (category.owner_id !== masterUserId) {
        throw new Error('无权操作此分类');
      }

      // 添加更新者信息
      const categoryData = {
        ...data,
        updated_by: userId
      };

      const result = await MaterialCategoryModel.updateCategory(id, categoryData);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      Logger.error('更新分类失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新分类失败'
      });
    }
  }

  // 删除分类
  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 验证分类是否存在且属于当前用户
      const category = await MaterialCategoryModel.getCategoryById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: '分类不存在'
        });
      }

      if (category.owner_id !== masterUserId) {
        return res.status(403).json({
          success: false,
          message: '无权操作此分类'
        });
      }

      const success = await MaterialCategoryModel.deleteCategory(id);
      if (!success) {
        throw new Error('删除失败');
      }

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      Logger.error('删除分类失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除分类失败'
      });
    }
  }
}

module.exports = CategoryController; 