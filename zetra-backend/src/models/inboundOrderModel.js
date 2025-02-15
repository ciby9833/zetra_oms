const db = require('../config/database');
const Logger = require('../utils/logger');

class InboundOrderModel {
  /**
   * 创建入库单及其明细（使用事务处理）
   * @param {Object} data 入库单数据，包含:
   *   - order_number: 入库单号
   *   - warehouse_id: 仓库ID
   *   - supplier_id: 供应商ID
   *   - inbound_date: 入库日期/时间
   *   - inbound_type: 入库类型
   *   - items: 入库单明细数组，每条记录包含 material_id、quantity、unit_cost
   *   - created_by: 创建者ID
   *   - owner_id: 所属主账号ID
   */
  static async createInboundOrder(data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { order_number, warehouse_id, supplier_id, inbound_date, inbound_type, items } = data;
      const created_by = data.created_by > 0 ? data.created_by : 0;
      const owner_id = data.owner_id > 0 ? data.owner_id : 0;
      const remarks = typeof data.remarks === 'undefined' ? null : data.remarks;
      const orderSql = `
        INSERT INTO user_management.inbound_orders
          (order_number, warehouse_id, supplier_id, inbound_date, inbound_type, remarks, created_by, owner_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const orderValues = [
        order_number,
        warehouse_id,
        supplier_id,
        inbound_date,
        inbound_type,
        remarks,
        created_by,
        owner_id,
      ];
      const [orderResult] = await connection.execute(orderSql, orderValues);
      const inboundOrderId = orderResult.insertId;

      const itemSql = `
         INSERT INTO user_management.inbound_order_items
         (inbound_order_id, material_id, quantity, unit_cost, material_name, unit, category_id, specifications)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const item of items) {
        const unit_cost_value = item.unit_cost !== undefined ? item.unit_cost : 0;
        let material_name_value = item.material_name !== undefined ? item.material_name : '';
        let unit_value = item.unit !== undefined ? item.unit : 0;
        let category_id_value = item.category_id !== undefined ? item.category_id : null;
        let specifications_value = item.specifications !== undefined ? item.specifications : null;
        
        // If material_name or unit is missing, fetch details from the materials table
        if (!material_name_value || !unit_value) {
          const [rows] = await connection.execute(
            "SELECT material_name, unit, category_id, specifications FROM user_management.materials WHERE material_id = ?",
            [item.material_id]
          );
          if (rows.length > 0) {
            const materialData = rows[0];
            if (!material_name_value) {
              material_name_value = materialData.material_name;
            }
            if (!unit_value) {
              unit_value = materialData.unit;
            }
            if (!category_id_value) {
              category_id_value = materialData.category_id;
            }
            if (!specifications_value) {
              specifications_value = materialData.specifications;
            }
          }
        }
        
        const itemValues = [
          inboundOrderId,
          item.material_id,
          item.quantity,
          unit_cost_value,
          material_name_value,
          unit_value,
          category_id_value,
          specifications_value
        ];

        await connection.execute(itemSql, itemValues);
      }
      await connection.commit();
      return inboundOrderId;
    } catch (error) {
      await connection.rollback();
      Logger.error("入库单创建失败: ", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取入库单列表（含分页和过滤条件）
   * @param {Object} params - 包含分页和过滤参数，如 { page, pageSize, order_number, inbound_type, inbound_date }
   * @returns {Object} { data: inbound orders array, total: number } 
   */
  static async getInboundOrders(params) {
    const { page = 1, pageSize = 10, order_number, inbound_type, inbound_date, owner_id } = params;
    const offset = (page - 1) * pageSize;
    let conditions = [];
    let values = [];

    if (order_number) {
      conditions.push("io.order_number LIKE ?");
      values.push(`%${order_number}%`);
    }

    if (inbound_type) {
      conditions.push("io.inbound_type = ?");
      values.push(inbound_type);
    }

    if (inbound_date && Array.isArray(inbound_date) && inbound_date.length === 2) {
      conditions.push("DATE(io.inbound_date) BETWEEN ? AND ?");
      values.push(inbound_date[0], inbound_date[1]);
    }

    if (owner_id !== undefined && owner_id !== null) {
      conditions.push("io.owner_id = ?");
      //强制转换为整数，确保数据类型一致
     const ownerIdNum = parseInt(owner_id, 10);
     values.push(ownerIdNum);
     console.log('DEBUG: Filtering orders with owner_id = ${ownerIdNum}');
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const countSql = `SELECT COUNT(*) as total FROM user_management.inbound_orders io ${whereClause}`;
    const [countRows] = await db.execute(countSql, values);
    const total = countRows[0].total;

    const dataSql = `
      SELECT io.*, 
             io.inbound_date AS inbound_date,
             w.warehouse_name AS warehouse_name,
             s.supplier_name AS supplier_name 
      FROM user_management.inbound_orders io 
      LEFT JOIN user_management.warehouses w ON io.warehouse_id = w.warehouse_id 
      LEFT JOIN user_management.suppliers s ON io.supplier_id = s.supplier_id 
      ${whereClause} 
      ORDER BY io.created_at DESC 
      LIMIT ${Number(pageSize)} OFFSET ${offset}
    `;
    const [dataRows] = await db.execute(dataSql, values);

    return { data: dataRows, total };
  }

  /**
   * 更新入库单及其明细（使用事务处理）
   * @param {number} inbound_order_id 入库单 ID
   * @param {Object} data 更新数据，包含:
   *   - order_number
   *   - warehouse_id
   *   - supplier_id
   *   - inbound_date
   *   - inbound_type
   *   - remarks
   *   - created_by
   *   - owner_id
   *   - items: 入库单明细数组
   */
  static async updateInboundOrder(inbound_order_id, data) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      // Destructure order fields and explicitly convert undefined values to null
      const { order_number, warehouse_id, supplier_id, inbound_date, inbound_type, items } = data;
      const remarks = data.remarks !== undefined ? data.remarks : null;
      const _created_by = data.created_by !== undefined ? data.created_by : null;
      const _owner_id = data.owner_id !== undefined ? data.owner_id : null;
      
      // Helper function to format ISO datetime (e.g. "2025-02-13T17:00:00.000Z")
      // to MySQL format "YYYY-MM-DD HH:MM:SS"
      function formatDateStr(dateStr) {
         if (!dateStr) return null;
         const dt = new Date(dateStr);
         if (isNaN(dt.getTime())) return null;
         return dt.toISOString().slice(0, 19).replace('T', ' ');
      }
      
      const formattedInboundDate = formatDateStr(inbound_date);
      
      const updateOrderSql = `
         UPDATE user_management.inbound_orders
         SET order_number = ?,
             warehouse_id = ?,
             supplier_id = ?,
             inbound_date = ?,
             inbound_type = ?,
             remarks = ?,
             created_by = ?,
             owner_id = ?
         WHERE inbound_order_id = ?
      `;
      const updateOrderValues = [
         order_number,
         warehouse_id,
         supplier_id,
         formattedInboundDate,
         inbound_type,
         remarks,
         _created_by,
         _owner_id,
         inbound_order_id
      ];
      
      await connection.execute(updateOrderSql, updateOrderValues);
      
      // 删除原有明细
      const deleteItemsSql = `
         DELETE FROM user_management.inbound_order_items WHERE inbound_order_id = ?
      `;
      await connection.execute(deleteItemsSql, [inbound_order_id]);
      
      // 插入新的明细记录
      const itemSql = `
         INSERT INTO user_management.inbound_order_items
         (inbound_order_id, material_id, quantity, unit_cost, material_name, unit, category_id, specifications)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const item of items) {
        const unit_cost_value = item.unit_cost !== undefined ? item.unit_cost : 0;
        let material_name_value = item.material_name !== undefined ? item.material_name : '';
        let unit_value = item.unit !== undefined ? item.unit : 0;
        const category_id_value = item.category_id !== undefined ? item.category_id : null;
        const specifications_value = item.specifications !== undefined ? item.specifications : null;
        
        // If material_name or unit is missing, fetch details from the materials table
        if (!material_name_value || !unit_value) {
          const [rows] = await connection.execute(
            "SELECT material_name, unit, category_id, specifications FROM user_management.materials WHERE material_id = ?",
            [item.material_id]
          );
          if (rows.length > 0) {
            const materialData = rows[0];
            if (!material_name_value) {
              material_name_value = materialData.material_name;
            }
            if (!unit_value) {
              unit_value = materialData.unit;
            }
            if (!category_id_value) {
              // Note: category_id_value is already null if undefined; no assignment needed
              // But you can reassign if materialData.category_id is defined.
            }
            if (!specifications_value) {
              // Likewise, specifications_value remains null if undefined.
            }
          }
        }
        
        const itemValues = [
          inbound_order_id,
          item.material_id,
          item.quantity,
          unit_cost_value,
          material_name_value,
          unit_value,
          category_id_value,
          specifications_value
        ];
        
        await connection.execute(itemSql, itemValues);
      }
      
      await connection.commit();
      return inbound_order_id;
    } catch (error) {
      await connection.rollback();
      Logger.error("更新入库单失败: ", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据入库单 ID 查询单个入库单及其明细
   * @param {number} inbound_order_id 入库单 ID
   * @returns {Object|null} 入库单对象，包含主表数据和 items 数组；若未找到返回 null
   */
  static async getInboundOrderById(inbound_order_id, owner_id) {
    const connection = await db.getConnection();
    try {
      // 查询主表数据（同时关联仓库和供应商名称）
      const mainSql = `
        SELECT io.*, w.warehouse_name, s.supplier_name
        FROM user_management.inbound_orders io
        LEFT JOIN user_management.warehouses w ON io.warehouse_id = w.warehouse_id
        LEFT JOIN user_management.suppliers s ON io.supplier_id = s.supplier_id
        WHERE io.inbound_order_id = ? AND io.owner_id = ?
      `;
      const [mainRows] = await connection.execute(mainSql, [inbound_order_id, owner_id]);
      if (mainRows.length === 0) {
        return null;
      }
      const order = mainRows[0];
      
      // 查询对应的明细数据
      const detailSql = `
        SELECT *
        FROM user_management.inbound_order_items
        WHERE inbound_order_id = ?
        ORDER BY order_item_id ASC
      `;
      const [detailRows] = await connection.execute(detailSql, [inbound_order_id]);
      // 将明细数据附加到返回对象中
      order.items = detailRows;
      return order;
    } catch (error) {
      Logger.error("查询入库单失败: ", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除入库单（示例实现：先检查状态，再软删除或物理删除）
   * @param {number} inboundOrderId 入库单ID
   */
  static async deleteInboundOrder(inboundOrderId) {
    const connection = await db.getConnection();
    try {
      // 可根据实际业务判断是否允许删除
      const deleteSql = `DELETE FROM user_management.inbound_orders WHERE inbound_order_id = ?`;
      await connection.execute(deleteSql, [inboundOrderId]);
      return true;
    } catch (error) {
      Logger.error("删除入库单失败: ", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 导出入库单及其关联明细数据
   * @param {Object} params - 包含过滤参数，如 order_number, inbound_type, inbound_date, owner_id
   * @returns {Array} 导出数据数组（入库单和明细信息）
   */
  static async exportInboundOrders(params) {
    const { order_number, inbound_type, inbound_date, owner_id } = params;
    let conditions = [];
    let values = [];

    if (order_number) {
      conditions.push("o.order_number LIKE ?");
      values.push(`%${order_number}%`);
    }

    if (inbound_type) {
      conditions.push("o.inbound_type = ?");
      values.push(inbound_type);
    }

    if (inbound_date && Array.isArray(inbound_date) && inbound_date.length === 2) {
      conditions.push("DATE(o.inbound_date) BETWEEN ? AND ?");
      values.push(inbound_date[0], inbound_date[1]);
    }

    if (owner_id !== undefined && owner_id !== null) {
      conditions.push("o.owner_id = ?");
      values.push(parseInt(owner_id, 10));
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const exportSql = `
      SELECT 
        o.inbound_order_id,
        o.order_number,
        w.warehouse_name,
        s.supplier_name,
        o.inbound_date,
        o.inbound_type,
        o.status,
        u.username AS created_by,
        i.material_name,
        i.quantity,
        i.unit_cost,
        i.unit,
        i.category_id,
        i.specifications
      FROM user_management.inbound_orders o
      LEFT JOIN user_management.inbound_order_items i ON o.inbound_order_id = i.inbound_order_id
      LEFT JOIN user_management.warehouses w ON o.warehouse_id = w.warehouse_id
      LEFT JOIN user_management.suppliers s ON o.supplier_id = s.supplier_id
      LEFT JOIN user_management.users u ON o.created_by = u.user_id
      ${whereClause}
      ORDER BY o.inbound_date DESC
    `;
    
    // 输出调试信息
    console.log("DEBUG: Export SQL:", exportSql);
    console.log("DEBUG: Values:", values);
    
    const [rows] = await db.execute(exportSql, values);
    console.log("DEBUG: Exported rows count:", rows.length);
    
    return rows;
  }

  // 其他如查询、修改、删除可按需要扩展
}

module.exports = InboundOrderModel; 