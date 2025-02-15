const db = require('../config/database');
const Logger = require('../utils/logger');

class MaterialCategoryModel {
  // 获取分类列表
  static async getCategories(params) {
    try {
      let query = `
        SELECT c.*, 
          p.category_name as parent_name,
          creator.username as creator_name,
          owner.username as owner_name
        FROM user_management.material_categories c
        LEFT JOIN user_management.material_categories p ON c.parent_id = p.category_id
        LEFT JOIN users creator ON c.created_by = creator.user_id
        LEFT JOIN users owner ON c.owner_id = owner.user_id
        WHERE 1=1
      `;
      const values = [];

      // 关键词搜索
      if (params.keyword) {
        query += ` AND (c.category_code LIKE ? OR c.category_name LIKE ?)`;
        values.push(`%${params.keyword}%`, `%${params.keyword}%`);
      }

      // 状态筛选
      if (params.status) {
        query += ` AND c.status = ?`;
        values.push(params.status);
      }

      // 数据权限控制
      query += ` AND c.owner_id = ?`;
      values.push(params.owner_id);

      // 排序
      query += ` ORDER BY c.path, c.sort_order`;

      const [rows] = await db.execute(query, values);
      return rows;
    } catch (error) {
      Logger.error('获取分类列表失败:', error);
      throw error;
    }
  }

  // 获取分类详情
  static async getCategoryById(categoryId) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*,
          creator.username as creator_name,
          owner.username as owner_name
         FROM user_management.material_categories c
         LEFT JOIN user_management.users creator ON c.created_by = creator.user_id
         LEFT JOIN user_management.users owner ON c.owner_id = owner.user_id
         WHERE c.category_id = ?`,
        [categoryId]
      );

      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      Logger.error('获取分类详情失败:', error);
      throw error;
    }
  }

  // 创建分类
  static async createCategory(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 检查分类代码是否已存在
      const [existing] = await connection.execute(
        'SELECT category_id FROM user_management.material_categories WHERE category_code = ?',
        [data.category_code]
      );

      if (existing.length > 0) {
        throw new Error('分类代码已存在');
      }

      // 检查父级分类
      let parentPath = '';
      let level = 1;

      if (data.parent_id) {
        const [parent] = await connection.execute(
          'SELECT path, level FROM user_management.material_categories WHERE category_id = ?',
          [data.parent_id]
        );

        if (parent.length === 0) {
          throw new Error('父级分类不存在');
        }

        // 检查层级限制
        if (parent[0].level >= data.max_level) {
          throw new Error('超出最大层级限制');
        }

        parentPath = parent[0].path;
        level = parent[0].level + 1;
      }

      // 插入分类
      const sql = `
        INSERT INTO user_management.material_categories (
          category_code,
          category_name,
          parent_id,
          path,
          level,
          sort_order,
          status,
          visibility,
          max_level,
          created_by,
          owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(sql, [
        data.category_code,
        data.category_name,
        data.parent_id,
        parentPath, // 临时路径，稍后更新
        level,
        data.sort_order || 0,
        data.status || 'active',
        data.visibility || 'private',
        data.max_level || 5,
        data.created_by,
        data.owner_id
      ]);

      const categoryId = result.insertId;

      // 更新完整路径
      const fullPath = parentPath ? `${parentPath}/${categoryId}` : `${categoryId}`;
      await connection.execute(
        'UPDATE user_management.material_categories SET path = ? WHERE category_id = ?',
        [fullPath, categoryId]
      );

      await connection.commit();
      return categoryId;
    } catch (error) {
      await connection.rollback();
      Logger.error('创建分类失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 更新分类
  static async updateCategory(id, data) {
    try {
      const sql = `
        UPDATE user_management.material_categories 
        SET 
          category_name = ?,
          sort_order = ?,
          status = ?,
          visibility = ?
        WHERE category_id = ?
      `;

      const values = [
        data.category_name,
        data.sort_order || 0,
        data.status,
        data.visibility,
        id
      ];

      const [result] = await db.execute(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新分类失败:', error);
      throw error;
    }
  }

  // 删除分类
  static async deleteCategory(id) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 检查是否有子分类
      const [children] = await connection.execute(
        'SELECT category_id FROM user_management.material_categories WHERE parent_id = ?',
        [id]
      );

      if (children.length > 0) {
        throw new Error('存在子分类，无法删除');
      }

      // 检查是否有关联的物料
      const [materials] = await connection.execute(
        'SELECT material_id FROM user_management.materials WHERE category_id = ?',
        [id]
      );

      if (materials.length > 0) {
        throw new Error('分类下存在物料，无法删除');
      }

      // 删除分类
      const [result] = await connection.execute(
        'DELETE FROM user_management.material_categories WHERE category_id = ?',
        [id]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      Logger.error('删除分类失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 获取分类树
  static async getCategoryTree(ownerId) {
    try {
      Logger.info('开始获取分类树, ownerId:', ownerId);
      
      const [rows] = await db.execute(
        `SELECT * FROM user_management.material_categories WHERE owner_id = ? ORDER BY path`,
        [ownerId]
      );

      return rows;
    } catch (error) {
      Logger.error('获取分类树失败:', error);
      throw error;
    }
  }
}

module.exports = MaterialCategoryModel; 