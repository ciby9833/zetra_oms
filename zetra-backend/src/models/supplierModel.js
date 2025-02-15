const db = require('../config/database');
const Logger = require('../utils/logger');

class SupplierModel {
  // 创建供应商
  static async createSupplier(data) {
    try {
      // 检查同一 owner 下供应商编码是否已存在
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_management.suppliers WHERE supplier_code = ? AND owner_id = ?',
        [data.supplier_code, data.owner_id]
      );
      if (rows[0].count > 0) {
        throw new Error('供应商编码已存在');
      }

      const sql = `
        INSERT INTO user_management.suppliers (
          supplier_code,
          supplier_name,
          description,
          contact_person,
          contact_phone,
          email,
          address,
          tax_number,
          category_id,
          status,
          created_by,
          owner_id,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        data.supplier_code,
        data.supplier_name,
        data.description || null,
        data.contact_person || null,
        data.contact_phone || null,
        data.email || null,
        data.address || null,
        data.tax_number || null,
        data.category_id || null,
        data.status || 'active',
        data.created_by,
        data.owner_id,
        data.notes || null
      ];
      const [result] = await db.execute(sql, values);
      return result.insertId;
    } catch (error) {
      Logger.error('创建供应商失败:', error);
      throw error;
    }
  }

  // 根据 ID 获取供应商详情
  static async getSupplierById(supplierId) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM user_management.suppliers WHERE supplier_id = ?',
        [supplierId]
      );
      return rows[0] || null;
    } catch (error) {
      Logger.error('获取供应商失败:', error);
      throw error;
    }
  }

  // 查询供应商列表（可根据编码或名称模糊匹配）
  static async getSuppliers(filters = {}) {
    try {
      let sql = 'SELECT * FROM user_management.suppliers WHERE 1=1';
      const params = [];
      if (filters.supplier_code) {
        sql += ' AND supplier_code LIKE ?';
        params.push(`%${filters.supplier_code}%`);
      }
      if (filters.supplier_name) {
        sql += ' AND supplier_name LIKE ?';
        params.push(`%${filters.supplier_name}%`);
      }
      if (filters.created_by) {
        sql += ' AND created_by = ?';
        params.push(filters.created_by);
      } else if (filters.owner_id) {
        sql += ' AND owner_id = ?';
        params.push(filters.owner_id);
      }
      sql += ' ORDER BY created_at DESC';
      const [rows] = await db.execute(sql, params);
      return rows;
    } catch (error) {
      Logger.error('查询供应商列表失败:', error);
      throw error;
    }
  }

  // 更新供应商信息
  static async updateSupplier(supplierId, data) {
    try {
      const sql = `
        UPDATE user_management.suppliers
        SET
          supplier_name = ?,
          description = ?,
          contact_person = ?,
          contact_phone = ?,
          email = ?,
          address = ?,
          tax_number = ?,
          category_id = ?,
          status = ?,
          notes = ?
        WHERE supplier_id = ?
      `;
      const values = [
        data.supplier_name,
        data.description === undefined ? null : data.description,
        data.contact_person === undefined ? null : data.contact_person,
        data.contact_phone === undefined ? null : data.contact_phone,
        data.email === undefined ? null : data.email,
        data.address === undefined ? null : data.address,
        data.tax_number === undefined ? null : data.tax_number,
        data.category_id === undefined ? null : data.category_id,
        data.status || 'active',
        data.notes === undefined ? null : data.notes,
        supplierId
      ];
      const [result] = await db.execute(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新供应商失败:', error);
      throw error;
    }
  }

  // 删除供应商
  static async deleteSupplier(supplierId) {
    try {
      const [result] = await db.execute(
        'DELETE FROM user_management.suppliers WHERE supplier_id = ?',
        [supplierId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('删除供应商失败:', error);
      throw error;
    }
  }

  // 分页查询供应商列表
  static async getSuppliersPaginated(filters = {}) {
    try {
      let baseSql = 'FROM user_management.suppliers WHERE 1=1';
      const params = [];
      if (filters.supplier_code) {
        baseSql += ' AND supplier_code LIKE ?';
        params.push(`%${filters.supplier_code}%`);
      }
      if (filters.supplier_name) {
        baseSql += ' AND supplier_name LIKE ?';
        params.push(`%${filters.supplier_name}%`);
      }
      if (filters.created_by) {
        baseSql += ' AND created_by = ?';
        params.push(filters.created_by);
      } else if (filters.owner_id) {
        baseSql += ' AND owner_id = ?';
        params.push(filters.owner_id);
      }
      // 查询总数
      const [countRows] = await db.execute(`SELECT COUNT(*) as total ${baseSql}`, params);
      const total = countRows[0].total;
  
      const page = filters.page ? parseInt(filters.page, 10) : 1;
      const pageSize = filters.pageSize ? parseInt(filters.pageSize, 10) : 10;
      const offset = (page - 1) * pageSize;
  
      // 直接内嵌 LIMIT 和 OFFSET 值，避免预编译参数问题
      const sql = `SELECT * ${baseSql} ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
      const [rows] = await db.execute(sql, params);
  
      return { total, data: rows };
    } catch (error) {
      Logger.error('查询供应商列表失败:', error);
      throw error;
    }
  }
}

module.exports = SupplierModel; 