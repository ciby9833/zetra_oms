const MaterialModel = require('../models/materialModel');
const MaterialCategoryModel = require('../models/materialCategoryModel');
const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const db = require('../config/database');  // 添加数据库引用
const fs = require('fs');
const MaterialImportService = require('../services/MaterialImportService');

class MaterialController {
  // 获取物料列表
  static async getMaterials(req, res) {
    try {
      const { page = 1, pageSize = 20, ...query } = req.query;
      const userId = req.user.userId;
      
      Logger.info('获取物料列表请求:', { userId, page, pageSize, query });
      
      const result = await MaterialModel.getMaterials({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        keyword: query.keyword || '',
        category_id: query.category_id || null,
        status: query.status || null,
        owner_id: userId
      });
      
      // 直接返回 Model 的结果
      res.json(result);
    } catch (error) {
      Logger.error('获取物料列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取物料列表失败'
      });
    }
  }

  // 创建物料
  static async createMaterial(req, res) {
    try {
      const userId = req.user.userId;
      const materialData = JSON.parse(req.body.Xzetra);
      
      Logger.info('创建物料数据:', materialData);

      // 获取主账号ID
      const masterUserId = await UserModel.getMasterUserId(userId);
      
      // 检查物料编码在主账号下是否已存在
      const exists = await MaterialModel.checkMaterialCodeExists(
        materialData.material_code,
        masterUserId
      );
      
      if (exists) {
        return res.status(400).json({
          success: false,
          message: '当前用户下该物料编码已存在'
        });
      }

      // 创建物料时使用主账号ID
      const materialId = await MaterialModel.createMaterial(materialData, masterUserId);
      
      res.json({
        success: true,
        message: '创建成功',
        data: { material_id: materialId }
      });
    } catch (error) {
      Logger.error('创建物料失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建物料失败'
      });
    }
  }

  // 更新物料
  static async updateMaterial(req, res) {
    try {
      const { id } = req.params;
      const data = JSON.parse(req.body.Xzetra);

      // 验证分类是否存在
      if (data.category_id) {
        const category = await MaterialCategoryModel.getCategoryById(data.category_id);
        if (!category) {
          return res.status(400).json({
            success: false,
            message: '物料分类不存在'
          });
        }
      }

      const success = await MaterialModel.updateMaterial(id, data);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '物料不存在'
        });
      }

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      Logger.error('更新物料失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新物料失败'
      });
    }
  }

  // 删除物料
  static async deleteMaterial(req, res) {
    try {
      const { id } = req.params;
      Logger.info('删除物料请求:', { id });

      const result = await MaterialModel.deleteMaterial(id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      Logger.error('删除物料失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除物料失败'
      });
    }
  }

  // 获取物料详情
  static async getMaterial(req, res) {
    try {
      const { id } = req.params;
      const material = await MaterialModel.getMaterialById(id);
      
      if (!material) {
        return res.status(404).json({
          success: false,
          message: '物料不存在'
        });
      }

      res.json({
        success: true,
        data: material
      });
    } catch (error) {
      Logger.error('获取物料详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取物料详情失败'
      });
    }
  }

  // 导出物料
  static async exportMaterials(req, res) {
    try {
      const userId = req.user.userId;
      const params = JSON.parse(req.query.Xzetra || '{}');

      Logger.info('导出物料请求:', { userId, params });

      // 获取导出数据
      const data = await MaterialModel.getMaterialsForExport({
        ...params,
        owner_id: userId
      });

      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('物料列表');

      // 设置表头
      worksheet.columns = [
        { header: '物料编码', key: 'material_code', width: 15 },
        { header: '物料名称', key: 'material_name', width: 20 },
        { header: '物料分类', key: 'category_name', width: 15 },
        { header: '规格型号', key: 'specifications', width: 15 },
        { header: '基本单位', key: 'basic_unit_name', width: 10 },
        { header: '子单位', key: 'sub_unit_name', width: 10 },
        { header: '换算比例', key: 'conversion_rate', width: 10 },
        { header: '保质期(天)', key: 'shelf_life', width: 12 },
        { header: '批次管理', key: 'batch_control', width: 10 },
        { header: '序列号管理', key: 'serial_control', width: 10 },
        { header: '存储条件', key: 'storage_conditions', width: 15 },
        { header: '提取条件', key: 'retrieval_conditions', width: 15 },
        { header: '状态', key: 'status', width: 10 }
      ];

      // 添加数据
      worksheet.addRows(data);

      // 设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=materials.xlsx'
      );

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      Logger.error('导出物料失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '导出失败'
      });
    }
  }

  // 下载导入模板
  static async downloadTemplate(req, res) {
    try {
      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('物料导入模板');

      // 设置表头
      worksheet.columns = [
        { header: '物料编码*', key: 'code', width: 15 },
        { header: '物料名称*', key: 'name', width: 20 },
        { header: '物料分类*', key: 'category', width: 15 },
        { header: '基本单位*', key: 'unit', width: 15 },
        { header: '规格型号', key: 'spec', width: 15 },
        { header: '保质期(天)', key: 'shelf_life', width: 15 },
        { header: '批次管理(是/否)', key: 'batch', width: 15 },
        { header: '序列号管理(是/否)', key: 'serial', width: 15 },
        { header: '存储条件', key: 'storage', width: 20 },
        { header: '出库要求', key: 'retrieval', width: 20 }
      ];

      // 添加示例数据
      worksheet.addRow({
        code: 'M001',
        name: '示例物料',
        category: '电子产品',
        unit: '个',
        spec: 'Type-A',
        shelf_life: '365',
        batch: '是',
        serial: '否',
        storage: '常温干燥',
        retrieval: '包装完整'
      });

      // 添加说明行
      worksheet.addRow({
        code: '必填',
        name: '必填',
        category: '必填',
        unit: '必填',
        spec: '选填',
        shelf_life: '选填数字',
        batch: '选填是/否',
        serial: '选填是/否',
        storage: '选填',
        retrieval: '选填'
      });

      // 设置响应头
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=material_import_template.xlsx'
      );

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      Logger.error('生成模板失败:', error);
      res.status(500).json({
        success: false,
        message: '生成模板失败'
      });
    }
  }

  // 导入物料
  static async importMaterials(req, res) {
    try {
      // 假设 filePath 与 ownerId 均已获取
      const filePath = req.file.path;
      const ownerId = req.user.userId; // 或从 req.user 中获取

      const result = await MaterialImportService.importFile(filePath, ownerId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      Logger.error('物料导入失败:', error);
      let errorResponse;
      try {
        // 尝试解析错误中包含的 JSON 错误信息
        errorResponse = JSON.parse(error.message);
      } catch (parseErr) {
        errorResponse = { errors: [error.message || '导入失败'] };
      }
      res.status(400).json({
        success: false,
        ...errorResponse
      });
    }
  }
}

module.exports = MaterialController; 