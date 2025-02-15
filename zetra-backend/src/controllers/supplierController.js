const SupplierModel = require('../models/supplierModel');
const Logger = require('../utils/logger');
const { createSupplierSchema, updateSupplierSchema } = require('../validators/supplierValidator');
const ExcelJS = require('exceljs');

class SupplierController {
  // 创建供应商
  static async createSupplier(req, res) {
    try {
      console.log("Controller (create): Received data =", req.body);
      // 检查用户权限（如仅允许 admin 进行创建，可增加判断）
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }
      // 若前端采用 multipart/form-data 包含 JSON 字符串，可采用 JSON.parse(req.body.Xzetra)
      let data = req.body;
      // 校验请求数据
      const { error: validationError, value: validData } = createSupplierSchema.validate(data, { abortEarly: true, allowUnknown: true });
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.details[0].message
        });
      }
      data = validData;
      // 设置创建者和所有者
      data.created_by = req.user.userId;
      if (req.user.account_type === 'child') {
        data.owner_id = req.user.parent_user_id;  // 子账号的 owner_id 为主账号 ID
      } else {
        data.owner_id = req.user.userId;
      }
  
      const supplierId = await SupplierModel.createSupplier(data);
      res.status(201).json({
        success: true,
        message: '供应商创建成功',
        supplierId
      });
    } catch (error) {
      Logger.error('创建供应商失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建供应商失败'
      });
    }
  }

  // 获取供应商详情
  static async getSupplier(req, res) {
    try {
      const { supplierId } = req.params;
      const supplier = await SupplierModel.getSupplierById(supplierId);
      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: '供应商不存在'
        });
      }
      res.json({
        success: true,
        data: supplier
      });
    } catch (error) {
      Logger.error('获取供应商详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取供应商详情失败'
      });
    }
  }

  // 查询供应商列表（支持分页查询）
  static async getSuppliers(req, res) {
    try {
      const filters = {
        supplier_code: req.query.supplier_code,
        supplier_name: req.query.supplier_name,
        page: req.query.page,
        pageSize: req.query.pageSize
      };
      if (req.user.account_type === 'child') {
        filters.created_by = req.user.userId;
      } else {
        filters.owner_id = req.user.userId;
      }
      
      if (filters.page || filters.pageSize) {
        const result = await SupplierModel.getSuppliersPaginated(filters);
        if (!result || result.total === 0) {
          return res.status(200).json({
            success: true,
            data: [],
            total: 0,
            page: parseInt(filters.page, 10) || 1,
            pageSize: parseInt(filters.pageSize, 10) || 10
          });
        }
        return res.status(200).json({
          success: true,
          data: result.data,
          total: result.total,
          page: parseInt(filters.page, 10) || 1,
          pageSize: parseInt(filters.pageSize, 10) || 10
        });
      } else {
        const suppliers = await SupplierModel.getSuppliers(filters);
        return res.status(200).json({
          success: true,
          data: suppliers
        });
      }
    } catch (error) {
      Logger.error('查询供应商列表失败:', error);
      return res.status(500).json({
        success: false,
        message: error.message || '查询供应商列表失败'
      });
    }
  }

  // 更新供应商信息
  static async updateSupplier(req, res) {
    try {
      console.log("Controller (update): Received data =", req.body);
      // 检查权限
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }
      const { supplierId } = req.params;
      let data = req.body;
      // 使用更新时的验证规则
      const { error: validationError, value: validData } = updateSupplierSchema.validate(data, { presence: 'optional' });
      if (validationError) {
        return res.status(400).json({
          success: false,
          message: validationError.details[0].message
        });
      }
      data = validData;
      const success = await SupplierModel.updateSupplier(supplierId, data);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '供应商不存在或更新失败'
        });
      }
      res.json({
        success: true,
        message: '供应商更新成功'
      });
    } catch (error) {
      Logger.error('更新供应商失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新供应商失败'
      });
    }
  }

  // 删除供应商
  static async deleteSupplier(req, res) {
    try {
      // 检查权限
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }
      const { supplierId } = req.params;
      const success = await SupplierModel.deleteSupplier(supplierId);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '供应商不存在或删除失败'
        });
      }
      res.json({
        success: true,
        message: '供应商删除成功'
      });
    } catch (error) {
      Logger.error('删除供应商失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除供应商失败'
      });
    }
  }

  // 导入供应商数据（接收上传的 Excel 文件）
  static async importSuppliers(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: '未上传文件' });
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.getWorksheet(1);
      let importedCount = 0;
      const errors = [];

      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        const data = {
          supplier_code: row.getCell(1).text.trim(),
          supplier_name: row.getCell(2).text.trim(),
          description: row.getCell(3).text.trim(),
          contact_person: row.getCell(4).text.trim(),
          contact_phone: row.getCell(5).text.trim(),
          email: row.getCell(6).text.trim(),
          address: row.getCell(7).text.trim(),
          tax_number: row.getCell(8).text.trim(),
          category_id: row.getCell(9).value || null,
          status: row.getCell(10).text.trim() || 'active',
          created_by: req.user.userId,
          owner_id: req.user.userId,
          notes: row.getCell(11).text.trim()
        };

        // 校验数据
        const { error } = supplierSchema.validate(data);
        if (error) {
          errors.push({ row: i, error: error.details[0].message });
          continue;
        }

        try {
          await SupplierModel.createSupplier(data);
          importedCount++;
        } catch (e) {
          errors.push({ row: i, error: e.message });
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: '部分记录导入失败',
          errors: errors
        });
      }

      res.json({
        success: true,
        message: `成功导入 ${importedCount} 条记录`
      });
    } catch (error) {
      Logger.error('导入供应商失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导入供应商失败'
      });
    }
  }

  // 导出供应商数据，生成 Excel 文件下载
  static async exportSuppliers(req, res) {
    try {
      const filters = {
        supplier_code: req.query.supplier_code,
        supplier_name: req.query.supplier_name
      };
      const suppliers = await SupplierModel.getSuppliers(filters);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('供应商数据');

      // 添加表头行
      worksheet.addRow([
        '供应商编码',
        '供应商名称',
        '描述',
        '联系人',
        '联系电话',
        '邮箱',
        '地址',
        '税号',
        '分类ID',
        '状态',
        '创建时间',
        '更新时间'
      ]);

      suppliers.forEach(supplier => {
        worksheet.addRow([
          supplier.supplier_code,
          supplier.supplier_name,
          supplier.description,
          supplier.contact_person,
          supplier.contact_phone,
          supplier.email,
          supplier.address,
          supplier.tax_number,
          supplier.category_id,
          supplier.status,
          supplier.created_at,
          supplier.updated_at
        ]);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=suppliers.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      Logger.error('导出供应商失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出供应商失败'
      });
    }
  }
}

module.exports = SupplierController; 