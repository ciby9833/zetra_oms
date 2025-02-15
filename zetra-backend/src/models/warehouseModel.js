const db = require('../config/database');
const Logger = require('../utils/logger');
const AdministrativeDivisionModel = require('./administrativeDivisionModel');
const UserModel = require('./userModel');

class WarehouseModel {
  // 获取所有仓库
  static async getAllWarehouses(userId) {
    try {
      const [rows] = await db.query(`
        SELECT w.*, 
          u.username as manager_name,
          c.username as creator_name,
          o.username as owner_name
        FROM user_management.warehouses w 
        LEFT JOIN user_management.users u ON w.manager_id = u.user_id
        LEFT JOIN user_management.users c ON w.created_by = c.user_id
        LEFT JOIN user_management.users o ON w.owner_id = o.user_id
        WHERE w.owner_id = ?
        ORDER BY w.created_at DESC
      `, [userId]);
      return rows;
    } catch (error) {
      Logger.error('获取仓库列表失败:', error);
      throw error;
    }
  }

  // 根据ID获取仓库
  static async findById(id) {
    try {
      const [rows] = await db.query(`
        SELECT w.*, u.username as manager_name 
        FROM user_management.warehouses w 
        LEFT JOIN user_management.users u ON w.manager_id = u.user_id
        WHERE w.warehouse_id = ?
      `, [id]);
      return rows[0];
    } catch (error) {
      Logger.error('获取仓库详情失败:', error);
      throw error;
    }
  }

  // 验证地区ID是否存在
  static async validateRegionIds(data) {
    const errors = [];
    
    if (data.province_id) {
      const [provinces] = await db.query(
        'SELECT * FROM administrative_divisions WHERE province_code = ?',
        [data.province_id]
      );
      if (!provinces.length) errors.push('省份代码不存在');
    }
    
    if (data.city_id) {
      const [cities] = await db.query(
        'SELECT * FROM administrative_divisions WHERE city_code = ?',
        [data.city_id]
      );
      if (!cities.length) errors.push('城市代码不存在');
    }
    
    if (data.district_id) {
      const [districts] = await db.query(
        'SELECT * FROM administrative_divisions WHERE district_code = ?',
        [data.district_id]
      );
      if (!districts.length) errors.push('区县代码不存在');
    }
    
    if (data.township_id) {
      const [townships] = await db.query(
        'SELECT * FROM administrative_divisions WHERE township_code = ?',
        [data.township_id]
      );
      if (!townships.length) errors.push('乡镇代码不存在');
    }
    
    return errors;
  }

  // 检查仓库代码或名称是否已存在
  static async checkWarehouseExists(ownerId, warehouseCode, warehouseName) {
    try {
      const sql = `
        SELECT 
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM user_management.warehouses 
              WHERE owner_id = ? AND warehouse_code = ?
            ) THEN 'code_exists'
            WHEN EXISTS (
              SELECT 1 FROM user_management.warehouses 
              WHERE owner_id = ? AND warehouse_name = ?
            ) THEN 'name_exists'
            ELSE 'not_exists'
          END as result
      `;

      const [rows] = await db.execute(sql, [
        ownerId, warehouseCode,
        ownerId, warehouseName
      ]);

      return rows[0].result;
    } catch (error) {
      Logger.error('检查仓库是否存在失败:', error);
      throw error;
    }
  }

  // 创建仓库
  static async createWarehouse(data) {
    try {
      // 先检查是否存在
      const existsResult = await this.checkWarehouseExists(
        data.owner_id,
        data.warehouse_code,
        data.warehouse_name
      );

      if (existsResult === 'code_exists') {
        throw new Error('该仓库代码在当前账户下已存在');
      }
      if (existsResult === 'name_exists') {
        throw new Error('该仓库名称在当前账户下已存在');
      }

      const sql = `
        INSERT INTO user_management.warehouses (
          warehouse_name,
          warehouse_code,
          location,
          capacity,
          manager_id,
          contact_phone,
          status,
          created_by,
          owner_id,
          country,
          province,
          city,
          district,
          township,
          country_id,
          province_id,
          city_id,
          district_id,
          township_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const values = [
        data.warehouse_name,
        data.warehouse_code,
        data.location,
        data.capacity,
        data.manager_id,
        data.contact_phone,
        data.status || 'active',
        data.created_by,
        data.owner_id,
        data.country,
        data.province,
        data.city,
        data.district,
        data.township,
        data.country_id,
        data.province_id,
        data.city_id,
        data.district_id,
        data.township_id
      ];

      const [result] = await db.execute(sql, values);
      return result.insertId;
    } catch (error) {
      Logger.error('创建仓库失败:', error);
      throw error;
    }
  }

  // 更新仓库
  static async updateWarehouse(id, data) {
    try {
      // 添加调试日志
      Logger.info('更新仓库数据:', { id, data });

      const [result] = await db.query(
        `UPDATE user_management.warehouses SET
          warehouse_name = ?,
          warehouse_code = ?,
          location = ?,
          capacity = ?,
          manager_id = ?,
          contact_phone = ?,
          status = ?,
          country = ?,
          province = ?,
          city = ?,
          district = ?,
          township = ?,
          country_id = ?,
          province_id = ?,
          city_id = ?,
          district_id = ?,
          township_id = ?
        WHERE warehouse_id = ?`,
        [
          data.warehouse_name,
          data.warehouse_code,
          data.location,
          data.capacity || 0,
          data.manager_id || null,
          data.contact_phone || null,
          data.status || 'active',
          // 地区字段 - 保持原始值
          data.country || 'Indonesia',
          data.province || null,
          data.city || null,
          data.district || null,
          data.township || null,
          // 地区ID字段 - 保持字符串格式，不进行类型转换
          data.country_id || 'ID',
          data.province_id || null,
          data.city_id || null,
          data.district_id || null,
          data.township_id || null,
          id
        ]
      );

      // 添加调试日志
      Logger.info('更新仓库结果:', result);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新仓库失败:', error);
      throw error;
    }
  }

  // 删除仓库
  static async deleteWarehouse(id) {
    try {
      const [result] = await db.query(
        'DELETE FROM user_management.warehouses WHERE warehouse_id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('删除仓库失败:', error);
      throw error;
    }
  }

  // 搜索仓库
  static async searchWarehouses(userId, searchParams) {
    try {
      // 先获取用户的主账户ID
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 修改 SQL，将 CASE 语句放在 SELECT 部分
      let query = `
        SELECT 
          w.*, 
          u.username as manager_name,
          c.username as creator_name,
          o.username as owner_name
          ${userId !== masterUserId ? 
            ', CASE WHEN w.created_by = ? THEN 1 ELSE 0 END as is_creator' 
            : ''
          }
        FROM user_management.warehouses w 
        LEFT JOIN user_management.users u ON w.manager_id = u.user_id
        LEFT JOIN user_management.users c ON w.created_by = c.user_id
        LEFT JOIN user_management.users o ON w.owner_id = o.user_id
        WHERE w.owner_id = ?
      `;

      // 构建参数数组
      const params = [];
      if (userId !== masterUserId) {
        params.push(userId); // 为 CASE 语句添加参数
      }
      params.push(masterUserId); // 为 WHERE 条件添加参数

      // 添加搜索条件
      if (searchParams.keyword) {
        query += ` AND (w.warehouse_code LIKE ? OR w.warehouse_name LIKE ?)`;
        params.push(`%${searchParams.keyword}%`, `%${searchParams.keyword}%`);
      }

      if (searchParams.status) {
        query += ` AND w.status = ?`;
        params.push(searchParams.status);
      }

      query += ` ORDER BY w.created_at DESC`;

      const [rows] = await db.execute(query, params);
      Logger.info('查询仓库结果:', {
        userId,
        masterUserId,
        isSubUser: userId !== masterUserId,
        count: rows.length
      });
      return rows;
    } catch (error) {
      Logger.error('搜索仓库失败:', error);
      throw error;
    }
  }
}

module.exports = WarehouseModel; 