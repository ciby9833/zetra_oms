const db = require('../config/database');
const Logger = require('../utils/logger');

class MaterialUnitModel {
  // 获取单位列表
  static async getUnits(params) {
    try {
      Logger.info('获取单位列表, 参数:', params);
      
      let query = `
        SELECT 
          u.*,
          creator.username as creator_name,
          owner.username as owner_name
        FROM user_management.material_units u
        LEFT JOIN user_management.users creator ON u.created_by = creator.user_id
        LEFT JOIN user_management.users owner ON u.owner_id = owner.user_id
        WHERE u.owner_id = ?
      `;
      
      const queryParams = [params.owner_id];

      // 添加关键字搜索
      if (params.keyword) {
        query += ` AND (u.unit_code LIKE ? OR u.unit_name LIKE ?)`;
        queryParams.push(`%${params.keyword}%`, `%${params.keyword}%`);
      }

      // 添加单位类型筛选
      if (params.unit_type) {
        query += ` AND u.unit_type = ?`;
        queryParams.push(params.unit_type);
      }

      // 添加排序
      query += ` ORDER BY u.created_at DESC`;

      const [rows] = await db.query(query, queryParams);
      return {
        list: rows,
        total: rows.length
      };
    } catch (error) {
      Logger.error('获取单位列表失败:', error);
      throw error;
    }
  }

  // 检查单位代码是否已存在
  static async checkUnitCodeExists(unitCode, ownerId, excludeUnitId = null) {
    try {
      let query = `
        SELECT unit_id 
        FROM user_management.material_units 
        WHERE unit_code = ? 
        AND owner_id = ?
      `;
      const params = [unitCode, ownerId];

      if (excludeUnitId) {
        query += ` AND unit_id != ?`;
        params.push(excludeUnitId);
      }

      const [existing] = await db.execute(query, params);
      return existing.length > 0;
    } catch (error) {
      Logger.error('检查单位代码失败:', error);
      throw error;
    }
  }

  // 创建单位
  static async createUnit(data) {
    try {
      // 检查单位代码是否已存在（基于owner_id）
      const exists = await this.checkUnitCodeExists(data.unit_code, data.owner_id);
      if (exists) {
        throw new Error('单位代码已存在');
      }

      const sql = `
        INSERT INTO user_management.material_units (
          unit_code,
          unit_name,
          unit_type,
          description,
          status,
          created_by,
          owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.unit_code,
        data.unit_name,
        data.unit_type,
        data.description,
        data.status || 'active',
        data.created_by,
        data.owner_id
      ];

      const [result] = await db.execute(sql, values);
      return result.insertId;
    } catch (error) {
      Logger.error('创建单位失败:', error);
      throw error;
    }
  }

  // 更新单位
  static async updateUnit(unitId, data) {
    try {
      // 如果更新了单位代码，检查新代码是否已存在（基于owner_id）
      if (data.unit_code) {
        const exists = await this.checkUnitCodeExists(data.unit_code, data.owner_id, unitId);
        if (exists) {
          throw new Error('单位代码已存在');
        }
      }

      const sql = `
        UPDATE user_management.material_units
        SET
          unit_name = ?,
          unit_type = ?,
          description = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE unit_id = ?
        AND owner_id = ?
      `;

      const values = [
        data.unit_name,
        data.unit_type,
        data.description,
        data.status,
        unitId,
        data.owner_id
      ];

      const [result] = await db.execute(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新单位失败:', error);
      throw error;
    }
  }

  // 删除单位
  static async deleteUnit(unitId, ownerId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 检查是否有关联的物料
      const [materials] = await connection.execute(
        `SELECT material_id 
         FROM user_management.materials m
         WHERE (m.unit = ? OR m.sub_unit = ?)
         AND m.owner_id = ?`,
        [unitId, unitId, ownerId]
      );

      if (materials.length > 0) {
        throw new Error('单位已被物料使用，无法删除');
      }

      // 检查是否有关联的换算关系
      try {
        const [conversions] = await connection.execute(
          `SELECT conversion_id 
           FROM user_management.unit_conversions uc
           WHERE (uc.from_unit_id = ? OR uc.to_unit_id = ?)
           AND uc.owner_id = ?`,
          [unitId, unitId, ownerId]
        );

        if (conversions.length > 0) {
          throw new Error('单位存在换算关系，无法删除');
        }
      } catch (error) {
        // 如果表不存在，忽略这个错误，继续删除操作
        if (error.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }

      // 删除单位
      const [result] = await connection.execute(
        `DELETE FROM user_management.material_units 
         WHERE unit_id = ? AND owner_id = ?`,
        [unitId, ownerId]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      Logger.error('删除单位失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 检查单位使用情况
  static async checkUnitUsage(unitId, ownerId) {
    try {
      Logger.info('检查单位使用情况:', { unitId, ownerId });

      // 检查物料使用
      const [materials] = await db.execute(
        `SELECT COUNT(*) as count 
         FROM user_management.materials m
         WHERE (m.unit = ? OR m.sub_unit = ?)
         AND m.owner_id = ?`,
        [unitId, unitId, ownerId]
      );

      // 检查换算关系
      const [conversions] = await db.execute(
        `SELECT COUNT(*) as count 
         FROM user_management.unit_conversions uc
         WHERE (uc.from_unit_id = ? OR uc.to_unit_id = ?)
         AND uc.owner_id = ?`,
        [unitId, unitId, ownerId]
      );

      const result = {
        inUse: materials[0].count > 0 || conversions[0].count > 0,
        materials: materials[0].count,
        conversions: conversions[0].count
      };

      Logger.info('单位使用情况:', result);
      return result;
    } catch (error) {
      Logger.error('检查单位使用情况失败:', error);
      // 如果表不存在，说明没有换算关系，返回未使用状态
      if (error.code === 'ER_NO_SUCH_TABLE') {
        const result = {
          inUse: materials[0].count > 0, // 只检查物料使用
          materials: materials[0].count,
          conversions: 0
        };
        return result;
      }
      throw new Error('检查单位使用情况失败');
    }
  }

  // 获取单位详情
  static async getUnitById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT u.*, 
          c.username as creator_name,
          o.username as owner_name
         FROM user_management.material_units u
         LEFT JOIN user_management.users c ON u.created_by = c.user_id
         LEFT JOIN user_management.users o ON u.owner_id = o.user_id
         WHERE u.unit_id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      Logger.error('获取单位详情失败:', error);
      throw error;
    }
  }

  // 批量检查单位是否存在
  static async checkUnitsExist(unitIds) {
    try {
      if (!unitIds.length) return true;
      
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_management.material_units WHERE unit_id IN (?)',
        [unitIds]
      );
      
      return rows[0].count === unitIds.length;
    } catch (error) {
      Logger.error('检查单位存在失败:', error);
      throw error;
    }
  }
}

module.exports = MaterialUnitModel; 