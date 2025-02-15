const db = require('../config/database');
const Logger = require('../utils/logger');

class UnitConversionModel {
  // 获取换算关系列表
  static async getConversions(params) {
    try {
      Logger.info('查询换算关系列表, 参数:', params);

      let query = `
        SELECT c.*,
          fu.unit_name as from_unit_name,
          tu.unit_name as to_unit_name,
          m.material_name,
          creator.username as creator_name,
          owner.username as owner_name
        FROM user_management.unit_conversions c
        LEFT JOIN user_management.material_units fu ON c.from_unit_id = fu.unit_id
        LEFT JOIN user_management.material_units tu ON c.to_unit_id = tu.unit_id
        LEFT JOIN user_management.materials m ON c.material_id = m.material_id
        LEFT JOIN user_management.users creator ON c.created_by = creator.user_id
        LEFT JOIN user_management.users owner ON c.owner_id = owner.user_id
        WHERE c.owner_id = ?
      `;

      const queryParams = [params.owner_id];

      // 添加关键字搜索
      if (params.keyword) {
        query += ` AND (
          fu.unit_name LIKE ? OR 
          tu.unit_name LIKE ? OR 
          m.material_name LIKE ?
        )`;
        const keyword = `%${params.keyword}%`;
        queryParams.push(keyword, keyword, keyword);
      }

      // 添加物料筛选
      if (params.material_id) {
        query += ` AND (c.material_id = ? OR c.material_id IS NULL)`;
        queryParams.push(params.material_id);
      }

      // 添加单位筛选
      if (params.unit_id) {
        query += ` AND (c.from_unit_id = ? OR c.to_unit_id = ?)`;
        queryParams.push(params.unit_id, params.unit_id);
      }

      // 添加排序
      query += ` ORDER BY c.created_at DESC`;

      const [rows] = await db.execute(query, queryParams);
      
      Logger.info('查询结果数量:', rows.length);
      return rows;
    } catch (error) {
      Logger.error('查询换算关系列表失败:', error);
      throw error;
    }
  }

  // 创建换算关系
  static async createConversion(data) {
    try {
      Logger.info('创建换算关系:', data);

      // 确保必要字段都有值
      const requiredFields = {
        from_unit_id: data.from_unit_id,
        to_unit_id: data.to_unit_id,
        conversion_rate: data.conversion_rate,
        direction: data.direction || 'both',
        precision: data.precision || 2,
        status: data.status || 'active',
        visibility: data.visibility || 'private',
        created_by: data.created_by,
        owner_id: data.owner_id
      };

      // 可选字段处理
      const optionalFields = {
        material_id: data.material_id || null
      };

      const fields = { ...requiredFields, ...optionalFields };

      // 检查是否已存在相同的换算关系
      const [existing] = await db.execute(
        `SELECT conversion_id 
         FROM user_management.unit_conversions 
         WHERE from_unit_id = ? 
         AND to_unit_id = ? 
         AND owner_id = ?
         AND ((material_id = ? AND ? IS NOT NULL) 
           OR (material_id IS NULL AND ? IS NULL))`,
        [
          fields.from_unit_id, 
          fields.to_unit_id, 
          fields.owner_id,
          fields.material_id,
          fields.material_id,
          fields.material_id
        ]
      );

      if (existing.length > 0) {
        throw new Error('换算关系已存在');
      }

      // 创建换算关系
      const [result] = await db.execute(
        `INSERT INTO user_management.unit_conversions (
          from_unit_id,
          to_unit_id,
          conversion_rate,
          direction,
          \`precision\`,
          material_id,
          status,
          visibility,
          created_by,
          owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fields.from_unit_id,
          fields.to_unit_id,
          fields.conversion_rate,
          fields.direction,
          fields.precision,
          fields.material_id,
          fields.status,
          fields.visibility,
          fields.created_by,
          fields.owner_id
        ]
      );

      // 返回创建的数据
      return {
        conversion_id: result.insertId,
        ...fields
      };
    } catch (error) {
      Logger.error('创建换算关系失败:', error);
      throw error;
    }
  }

  // 更新换算关系
  static async updateConversion(id, data) {
    try {
      const sql = `
        UPDATE user_management.unit_conversions 
        SET 
          conversion_rate = ?,
          direction = ?,
          \`precision\` = ?,
          status = ?,
          visibility = ?
        WHERE conversion_id = ?
      `;

      const values = [
        data.conversion_rate,
        data.direction,
        data.precision,
        data.status,
        data.visibility,
        id
      ];

      const [result] = await db.execute(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新换算关系失败:', error);
      throw error;
    }
  }

  // 删除换算关系
  static async deleteConversion(id) {
    try {
      const [result] = await db.execute(
        'DELETE FROM user_management.unit_conversions WHERE conversion_id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('删除换算关系失败:', error);
      throw error;
    }
  }

  // 获取换算关系详情
  static async getConversionById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*,
          fu.unit_name as from_unit_name,
          tu.unit_name as to_unit_name,
          m.material_name
         FROM user_management.unit_conversions c
         LEFT JOIN user_management.material_units fu ON c.from_unit_id = fu.unit_id
         LEFT JOIN user_management.material_units tu ON c.to_unit_id = tu.unit_id
         LEFT JOIN user_management.materials m ON c.material_id = m.material_id
         WHERE c.conversion_id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      Logger.error('获取换算关系详情失败:', error);
      throw error;
    }
  }

  // 获取单位的换算关系
  static async getUnitConversions(unitId, materialId = null) {
    try {
      const sql = `
        SELECT c.*,
          fu.unit_name as from_unit_name,
          tu.unit_name as to_unit_name
        FROM user_management.unit_conversions c
        LEFT JOIN user_management.material_units fu ON c.from_unit_id = fu.unit_id
        LEFT JOIN user_management.material_units tu ON c.to_unit_id = tu.unit_id
        WHERE (c.from_unit_id = ? OR c.to_unit_id = ?)
        AND (c.material_id = ? OR c.material_id IS NULL)
        AND c.status = 'active'
      `;

      const [rows] = await db.execute(sql, [unitId, unitId, materialId]);
      return rows;
    } catch (error) {
      Logger.error('获取单位换算关系失败:', error);
      throw error;
    }
  }

  // 检查物料相关的换算关系
  static async checkMaterialConversions(materialId) {
    try {
      const [rows] = await db.execute(
        `SELECT c.*, 
          fu.unit_name as from_unit_name,
          tu.unit_name as to_unit_name
        FROM user_management.unit_conversions c
        LEFT JOIN user_management.material_units fu ON c.from_unit_id = fu.unit_id
        LEFT JOIN user_management.material_units tu ON c.to_unit_id = tu.unit_id
        WHERE c.material_id = ?`,
        [materialId]
      );
      return rows;
    } catch (error) {
      Logger.error('检查物料换算关系失败:', error);
      throw error;
    }
  }

  // 批量删除换算关系
  static async deleteConversions(ids) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        'DELETE FROM user_management.unit_conversions WHERE conversion_id IN (?)',
        [ids]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      Logger.error('批量删除换算关系失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = UnitConversionModel; 