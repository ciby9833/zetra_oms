const db = require('../config/database');
const Logger = require('../utils/logger');
const ExcelJS = require('exceljs');

class WarehouseZoneModel {
  // 检查货区代码是否已存在
  static async checkZoneExists(warehouseId, zoneCode) {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_management.warehouse_zones WHERE warehouse_id = ? AND zone_code = ?',
        [warehouseId, zoneCode]
      );
      return rows[0].count > 0;
    } catch (error) {
      Logger.error('检查货区代码失败:', error);
      throw error;
    }
  }

  // 获取货区列表
  static async getZones(params) {
    const connection = await db.getConnection();
    try {
      const { userId, warehouse_id, status, keyword } = params;
      
      let query = `
        SELECT z.*, w.warehouse_name
        FROM user_management.warehouse_zones z
        LEFT JOIN user_management.warehouses w ON z.warehouse_id = w.warehouse_id
        WHERE w.owner_id = ?
      `;
      
      const queryParams = [userId];

      if (warehouse_id) {
        query += ' AND z.warehouse_id = ?';
        queryParams.push(warehouse_id);
      }

      if (status) {
        query += ' AND z.status = ?';
        queryParams.push(status);
      }

      if (keyword) {
        query += ' AND (z.zone_code LIKE ? OR z.zone_name LIKE ?)';
        queryParams.push(`%${keyword}%`, `%${keyword}%`);
      }

      query += ' ORDER BY z.created_at DESC';

      const [rows] = await connection.execute(query, queryParams);
      return rows;
    } catch (error) {
      Logger.error('获取货区列表失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // 创建货区
  static async createZone(data) {
    try {
      // 检查货区代码是否已存在于同一仓库
      const exists = await this.checkZoneExists(data.warehouse_id, data.zone_code);
      if (exists) {
        throw new Error('该货区代码在当前仓库下已存在');
      }

      const sql = `
        INSERT INTO user_management.warehouse_zones (
          warehouse_id,
          zone_code,
          zone_name,
          floor_level,
          capacity,
          type,
          status,
          created_by,
          owner_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        data.warehouse_id,
        data.zone_code,
        data.zone_name,
        data.floor_level || 1,
        data.capacity || 0,
        data.type || 'storage',
        data.status || 'active',
        data.created_by,
        data.owner_id
      ];

      const [result] = await db.execute(sql, values);
      return result.insertId;
    } catch (error) {
      Logger.error('创建货区失败:', error);
      throw error;
    }
  }

  // 更新货区
  static async updateZone(zoneId, data, updatedBy) {
    try {
      const sql = `
        UPDATE user_management.warehouse_zones 
        SET 
          zone_name = ?,
          floor_level = ?,
          capacity = ?,
          type = ?,
          status = ?,
          updated_by = ?
        WHERE zone_id = ?
      `;

      const values = [
        data.zone_name,
        data.floor_level,
        data.capacity,
        data.type,
        data.status,
        updatedBy,
        zoneId
      ];

      const [result] = await db.execute(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新货区失败:', error);
      throw error;
    }
  }

  // 删除货区
  static async deleteZone(zoneId) {
    try {
      const [result] = await db.execute(
        'DELETE FROM user_management.warehouse_zones WHERE zone_id = ?',
        [zoneId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('删除货区失败:', error);
      throw error;
    }
  }

  // 更新货区状态
  static async updateZoneStatus(zoneId, status, updatedBy) {
    try {
      const sql = `
        UPDATE user_management.warehouse_zones 
        SET 
          status = ?,
          updated_by = ?
        WHERE zone_id = ?
      `;

      const [result] = await db.execute(sql, [status, updatedBy, zoneId]);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新货区状态失败:', error);
      throw error;
    }
  }

  static async importData(file, userId, masterUserId) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.data);
    const worksheet = workbook.getWorksheet(1);
    
    const errors = [];
    const zones = [];
    let rowNumber = 2; // 从第二行开始（跳过表头）

    // 读取并验证每一行
    worksheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // 跳过表头

      const [warehouseName, zoneCode, zoneName, floorLevel, capacity, type] = row.values.slice(1);

      // 验证必填字段
      if (!warehouseName || !zoneCode || !zoneName) {
        errors.push({
          row: rowNum,
          message: '所属仓库、货区代码、货区名称为必填项'
        });
        return;
      }

      // 验证数字字段
      if (floorLevel && !Number.isInteger(Number(floorLevel))) {
        errors.push({
          row: rowNum,
          message: '楼层必须为整数'
        });
      }

      if (capacity && isNaN(Number(capacity))) {
        errors.push({
          row: rowNum,
          message: '容量必须为数字'
        });
      }

      // 验证类型字段
      const validTypes = ['存储区', '拣货区', '包装区', '收货区'];
      if (type && !validTypes.includes(type)) {
        errors.push({
          row: rowNum,
          message: '类型值无效'
        });
      }

      // 如果没有错误，添加到待导入列表
      if (!errors.length) {
        zones.push({
          warehouse_name: warehouseName,
          zone_code: zoneCode,
          zone_name: zoneName,
          floor_level: floorLevel ? Number(floorLevel) : null,
          capacity: capacity ? Number(capacity) : null,
          type: type ? type : '存储区',
          status: 'active',
          created_by: userId,
          owner_id: masterUserId
        });
      }
    });

    // 如果有错误，返回错误信息
    if (errors.length > 0) {
      return {
        success: false,
        message: '导入数据有误',
        errors
      };
    }

    // 导入数据
    try {
      await this.batchCreateZones(zones);
      return {
        success: true,
        message: `成功导入 ${zones.length} 条数据`
      };
    } catch (error) {
      throw new Error('导入数据失败：' + error.message);
    }
  }

  // 批量创建货区
  static async batchCreateZones(zones) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      for (const zone of zones) {
        // 先根据仓库名称获取仓库ID
        const [warehouses] = await connection.execute(
          'SELECT warehouse_id FROM user_management.warehouses WHERE warehouse_name = ? AND owner_id = ?',
          [zone.warehouse_name, zone.owner_id]
        );

        if (warehouses.length === 0) {
          throw new Error(`仓库 "${zone.warehouse_name}" 不存在`);
        }

        const warehouseId = warehouses[0].warehouse_id;

        // 检查货区代码是否已存在
        const [existing] = await connection.execute(
          'SELECT COUNT(*) as count FROM user_management.warehouse_zones WHERE warehouse_id = ? AND zone_code = ?',
          [warehouseId, zone.zone_code]
        );

        if (existing[0].count > 0) {
          throw new Error(`货区代码 "${zone.zone_code}" 在仓库 "${zone.warehouse_name}" 中已存在`);
        }

        // 转换类型值
        const typeMap = {
          '存储区': 'storage',
          '拣货区': 'picking',
          '包装区': 'packing',
          '收货区': 'receiving'
        };

        // 插入货区数据
        await connection.execute(
          `INSERT INTO user_management.warehouse_zones (
            warehouse_id,
            zone_code,
            zone_name,
            floor_level,
            capacity,
            type,
            status,
            created_by,
            owner_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            warehouseId,
            zone.zone_code,
            zone.zone_name,
            zone.floor_level || 1,
            zone.capacity || 0,
            typeMap[zone.type] || 'storage',
            'active',
            zone.created_by,
            zone.owner_id
          ]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = WarehouseZoneModel; 