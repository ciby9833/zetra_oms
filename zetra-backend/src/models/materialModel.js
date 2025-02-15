const db = require('../config/database');
const Logger = require('../utils/logger');

class MaterialModel {
  // 获取物料列表
  static async getMaterials(params) {
    const connection = await db.getConnection();
    try {
      const { page, pageSize, keyword, category_id, status, owner_id } = params;
      let whereClause = '1=1';
      const values = [];

      Logger.info('查询参数:', { page, pageSize, keyword, category_id, status, owner_id });
      
      // 构建基础查询条件
      if (owner_id) {
        whereClause += ' AND m.owner_id = ?';
        values.push(owner_id);
      }

      // 添加关键字搜索
      if (keyword) {
        whereClause += ' AND (m.material_code LIKE ? OR m.material_name LIKE ? OR m.specifications LIKE ?)';
        values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      // 添加分类筛选
      if (category_id) {
        whereClause += ' AND m.category_id = ?';
        values.push(category_id);
      }

      // 添加状态筛选
      if (status) {
        whereClause += ' AND m.status = ?';
        values.push(status);
      }

      // 先获取总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM user_management.materials m 
        WHERE ${whereClause}
      `;
      const [countResult] = await connection.query(countSql, values);
      const total = countResult[0].total;

      // 查询数据
      const sql = `
        SELECT 
          m.*,
          mc.category_name,
          mu.unit_name,
          mu.unit_code,
          su.unit_name as sub_unit_name,
          su.unit_code as sub_unit_code,
          c.username as creator_name,
          o.username as owner_name
        FROM user_management.materials m
        LEFT JOIN user_management.material_categories mc ON m.category_id = mc.category_id
        LEFT JOIN user_management.material_units mu ON m.unit = mu.unit_id
        LEFT JOIN user_management.material_units su ON m.sub_unit = su.unit_id
        LEFT JOIN user_management.users c ON m.created_by = c.user_id
        LEFT JOIN user_management.users o ON m.owner_id = o.user_id
        WHERE ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `;

      values.push(Number(pageSize), (Number(page) - 1) * Number(pageSize));
      Logger.info('执行SQL:', sql, values);

      const [rows] = await connection.query(sql, values);

      Logger.info('获取物料列表结果:', {
        total,
        page,
        pageSize,
        resultCount: rows.length
      });

      return {
        success: true,
        data: {
          list: rows,
          total,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      };

    } catch (error) {
      Logger.error('获取物料列表失败:', error);
      return {
        success: false,
        message: error.message || '获取物料列表失败'
      };
    } finally {
      connection.release();
    }
  }

  // 检查物料编码在指定 owner_id 下是否存在
  static async checkMaterialCodeExists(materialCode, ownerId) {
    try {
      const [rows] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM user_management.materials 
        WHERE material_code = ? 
        AND owner_id = ?
      `, [materialCode, ownerId]);
      
      Logger.info('检查物料编码:', {
        materialCode,
        ownerId,
        exists: rows[0].count > 0
      });
      
      return rows[0].count > 0;
    } catch (error) {
      Logger.error('检查物料编码失败:', error);
      throw error;
    }
  }

  // 创建物料
  static async createMaterial(data, ownerId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 再次检查物料编码是否存在（事务中的二次检查）
      const exists = await this.checkMaterialCodeExists(data.material_code, ownerId);
      if (exists) {
        throw new Error('当前用户下该物料编码已存在');
      }

      // 确保所有可能为undefined的字段都转换为null
      const materialData = {
        material_code: data.material_code,
        material_name: data.material_name,
        category_id: data.category_id || null,
        specifications: data.specifications || null,
        unit: data.unit,
        sub_unit: data.sub_unit || null,
        conversion_rate: data.conversion_rate || null,
        shelf_life: data.shelf_life || null,
        batch_control: data.batch_control || false,
        serial_control: data.serial_control || false,
        status: data.status || 'active',
        storage_conditions: data.storage_conditions || null,
        retrieval_conditions: data.retrieval_conditions || null,
        created_by: ownerId,
        owner_id: ownerId
      };

      const [result] = await connection.execute(`
        INSERT INTO user_management.materials (
          material_code, material_name, category_id, specifications,
          unit, sub_unit, conversion_rate, shelf_life,
          batch_control, serial_control, status,
          storage_conditions, retrieval_conditions,
          created_by, owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        materialData.material_code,
        materialData.material_name,
        materialData.category_id,
        materialData.specifications,
        materialData.unit,
        materialData.sub_unit,
        materialData.conversion_rate,
        materialData.shelf_life,
        materialData.batch_control,
        materialData.serial_control,
        materialData.status,
        materialData.storage_conditions,
        materialData.retrieval_conditions,
        materialData.created_by,
        materialData.owner_id
      ]);

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      Logger.error('创建物料失败:', error);
      // 处理唯一键冲突错误
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('当前用户下该物料编码已存在');
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  // 更新物料
  static async updateMaterial(id, data) {
    const connection = await db.getConnection();
    try {
      Logger.info('更新物料, ID:', id, '数据:', data);

      // 检查物料是否存在
      const checkResult = await this.getMaterialById(id);
      if (!checkResult.success) {
        return checkResult;
      }

      // 构建更新字段
      const updateFields = [];
      const values = [];
      
      // 遍历可更新字段
      const allowedFields = [
        'material_code',
        'material_name',
        'specifications',
        'category_id',
        'unit',
        'sub_unit',
        'conversion_rate',
        'batch_control',
        'serial_control',
        'shelf_life',
        'storage_conditions',
        'retrieval_conditions',
        'status',
        'updated_by'
      ];

      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          values.push(data[field]);
        }
      });

      // 添加更新时间
      updateFields.push('updated_at = CURRENT_TIMESTAMP()');

      // 添加ID到values数组
      values.push(id);

      const sql = `
        UPDATE user_management.materials 
        SET ${updateFields.join(', ')}
        WHERE material_id = ?
      `;

      const [result] = await connection.query(sql, values);

      Logger.info('更新物料结果:', {
        id,
        affectedRows: result.affectedRows
      });

      return {
        success: true,
        data: {
          id,
          affected: result.affectedRows
        }
      };

    } catch (error) {
      Logger.error('更新物料失败:', error);
      return {
        success: false,
        message: error.message || '更新物料失败'
      };
    } finally {
      connection.release();
    }
  }

  // 删除物料
  static async deleteMaterial(id) {
    const connection = await db.getConnection();
    try {
      Logger.info('删除物料, ID:', id);

      const [result] = await connection.execute(
        'DELETE FROM user_management.materials WHERE material_id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        Logger.warn('物料不存在, ID:', id);
        return {
          success: false,
          message: '物料不存在'
        };
      }

      Logger.info('删除物料成功:', { id });
      return {
        success: true
      };

    } catch (error) {
      Logger.error('删除物料失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 获取物料详情
  static async getMaterialById(id) {
    const connection = await db.getConnection();
    try {
      Logger.info('获取物料详情, ID:', id);

      const sql = `
        SELECT 
          m.*,
          mc.category_name,
          mu.unit_name,
          mu.unit_code,
          su.unit_name as sub_unit_name,
          su.unit_code as sub_unit_code,
          c.username as creator_name,
          o.username as owner_name
        FROM user_management.materials m
        LEFT JOIN user_management.material_categories mc ON m.category_id = mc.category_id
        LEFT JOIN user_management.material_units mu ON m.unit = mu.unit_id
        LEFT JOIN user_management.material_units su ON m.sub_unit = su.unit_id
        LEFT JOIN user_management.users c ON m.created_by = c.user_id
        LEFT JOIN user_management.users o ON m.owner_id = o.user_id
        WHERE m.material_id = ?
      `;

      const [rows] = await connection.query(sql, [id]);

      if (rows.length === 0) {
        Logger.warn('物料不存在, ID:', id);
        return {
          success: false,
          message: '物料不存在'
        };
      }

      Logger.info('获取物料详情成功:', {
        id,
        code: rows[0].material_code
      });

      // 格式化数据
      const material = {
        ...rows[0],
        batch_control: Boolean(rows[0].batch_control),
        serial_control: Boolean(rows[0].serial_control),
        created_at: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : null,
        updated_at: rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : null
      };

      return {
        success: true,
        data: material
      };

    } catch (error) {
      Logger.error('获取物料详情失败:', error);
      return {
        success: false,
        message: error.message || '获取物料详情失败'
      };
    } finally {
      connection.release();
    }
  }

  // 获取导出数据
  static async getMaterialsForExport(params) {
    const connection = await db.getConnection();
    try {
      Logger.info('导出查询参数:', params);

      let whereClause = 'm.owner_id = ?';
      const values = [params.owner_id];

      // 添加其他查询条件
      if (params.keyword) {
        whereClause += ' AND (m.material_code LIKE ? OR m.material_name LIKE ?)';
        values.push(`%${params.keyword}%`, `%${params.keyword}%`);
      }

      if (params.category_id) {
        whereClause += ' AND m.category_id = ?';
        values.push(params.category_id);
      }

      if (params.status) {
        whereClause += ' AND m.status = ?';
        values.push(params.status);
      }

      // 如果是选择导出
      if (params.exportType === 'selected' && params.ids?.length) {
        whereClause += ` AND m.material_id IN (?)`;
        values.push(params.ids);
      }

      const sql = `
        SELECT 
          m.material_code,
          m.material_name,
          mc.category_name,
          m.specifications,
          mu.unit_name as basic_unit_name,
          su.unit_name as sub_unit_name,
          m.conversion_rate,
          m.shelf_life,
          m.batch_control,
          m.serial_control,
          m.storage_conditions,
          m.retrieval_conditions,
          CASE m.status 
            WHEN 'active' THEN '启用'
            WHEN 'inactive' THEN '停用'
            ELSE m.status
          END as status
        FROM user_management.materials m
        LEFT JOIN user_management.material_categories mc ON m.category_id = mc.category_id
        LEFT JOIN user_management.material_units mu ON m.unit = mu.unit_id
        LEFT JOIN user_management.material_units su ON m.sub_unit = su.unit_id
        WHERE ${whereClause}
        ORDER BY m.created_at DESC
      `;

      const [rows] = await connection.query(sql, values);

      // 格式化布尔值和数字
      return rows.map(row => ({
        ...row,
        batch_control: row.batch_control ? '是' : '否',
        serial_control: row.serial_control ? '是' : '否',
        shelf_life: row.shelf_life ? `${row.shelf_life}天` : '',
        conversion_rate: row.conversion_rate ? `${row.conversion_rate}:1` : ''
      }));

    } catch (error) {
      Logger.error('获取导出数据失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = MaterialModel; 