const WarehouseZoneModel = require('../models/warehouseZoneModel');
const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

class WarehouseZoneController {
  // 获取货区列表
  static async getZones(req, res) {
    try {
      const userId = req.user.userId;
      const { warehouse_id, status, keyword } = req.query;

      Logger.info('获取货区列表:', { userId, warehouse_id, status, keyword });

      const zones = await WarehouseZoneModel.getZones({
        userId,
        warehouse_id: warehouse_id || null,
        status: status || null,
        keyword: keyword || null
      });

      res.json({
        success: true,
        data: zones
      });
    } catch (error) {
      Logger.error('获取货区列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取货区列表失败'
      });
    }
  }

  // 创建货区
  static async createZone(req, res) {
    try {
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;

      // 检查用户角色
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }

      // 获取主账户ID
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 设置创建者和所有者
      data.created_by = userId;
      data.owner_id = masterUserId;  // 所有者始终是主账户

      const zoneId = await WarehouseZoneModel.createZone(data);
      res.json({
        success: true,
        data: { zoneId }
      });
    } catch (error) {
      Logger.error('创建货区失败:', error);
      res.status(error.message.includes('已存在') ? 400 : 500).json({
        success: false,
        message: error.message || '创建货区失败'
      });
    }
  }

  // 更新货区
  static async updateZone(req, res) {
    try {
      const { zoneId } = req.params;
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;

      // 检查用户角色
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }

      const success = await WarehouseZoneModel.updateZone(zoneId, data, userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '货区不存在'
        });
      }

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      Logger.error('更新货区失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新货区失败'
      });
    }
  }

  // 删除货区
  static async deleteZone(req, res) {
    try {
      const { zoneId } = req.params;

      // 检查用户角色
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }

      const success = await WarehouseZoneModel.deleteZone(zoneId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '货区不存在'
        });
      }

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      Logger.error('删除货区失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除货区失败'
      });
    }
  }

  // 下载货区导入模板
  static async downloadTemplate(req, res) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('货区导入模板');

      // 设置表头 - 与图片一致的字段
      worksheet.columns = [
        { header: '所属仓库*', key: 'warehouse_name', width: 15 },
        { header: '货区代码*', key: 'zone_code', width: 15 },
        { header: '货区名称*', key: 'zone_name', width: 15 },
        { header: '楼层', key: 'floor_level', width: 10 },
        { header: '容量(m³)', key: 'capacity', width: 12 },
        { header: '类型', key: 'type', width: 12 }
      ];

      // 设置表头样式
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }  // 灰色背景
      };

      // 添加数据验证
      worksheet.dataValidations.add('F2:F1000', {
        type: 'list',
        allowBlank: true,
        formulae: ['"存储区,拣货区,包装区,收货区"']
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=warehouse_zones_template.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      Logger.error('下载模板失败:', error);
      res.status(500).json({
        success: false,
        message: '下载模板失败'
      });
    }
  }

  // 生成错误报告
  static async generateErrorReport(worksheet, errors) {
    try {
      const workbook = new ExcelJS.Workbook();
      const reportSheet = workbook.addWorksheet('导入失败报告');

      // 复制原始数据和表头
      worksheet.eachRow((row, rowNumber) => {
        reportSheet.addRow(row.values);
        if (rowNumber === 1) {
          // 设置表头样式
          const headerRow = reportSheet.getRow(1);
          headerRow.font = { bold: true };
          headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' }
          };
        }
      });

      // 添加错误信息列
      reportSheet.getColumn(reportSheet.columnCount + 1).header = '错误原因';
      reportSheet.getColumn(reportSheet.columnCount).width = 40;

      // 标记错误行并添加错误信息
      errors.forEach(error => {
        const match = error.match(/第 (\d+) 行: (.*)/);
        if (match) {
          const rowNumber = parseInt(match[1]);
          const errorMessage = match[2];
          const row = reportSheet.getRow(rowNumber);
          
          // 设置错误行样式
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFD7D7' }  // 浅红色背景
          };

          // 添加错误信息
          row.getCell(reportSheet.columnCount).value = errorMessage;
        }
      });

      return workbook;
    } catch (error) {
      Logger.error('生成错误报告失败:', error);
      throw new Error('生成错误报告失败');
    }
  }

  // 导入数据
  static async importData(req, res) {
    const connection = await db.getConnection();
    try {
      if (!req.file) {
        throw new Error('请选择要导入的文件');
      }

      const userId = req.user.userId;
      Logger.info('开始导入货区数据:', { userId, filename: req.file.originalname });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.getWorksheet(1);

      await connection.beginTransaction();

      const errors = [];
      const zones = [];

      // 第一步：验证所有数据
      Logger.info('开始验证数据...');
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        
        // 跳过空行
        if (!row.getCell(1).value) continue;

        try {
          const zoneData = {
            warehouse_name: row.getCell(1).value?.toString().trim(),
            zone_code: row.getCell(2).value?.toString().trim(),
            zone_name: row.getCell(3).value?.toString().trim(),
            floor_level: parseInt(row.getCell(4).value) || 1,
            capacity: parseFloat(row.getCell(5).value) || 0,
            type: row.getCell(6).value?.toString().trim() || '存储区'
          };

          // 验证必填字段
          if (!zoneData.warehouse_name || !zoneData.zone_code || !zoneData.zone_name) {
            throw new Error('缺少必填字段');
          }

          // 查找仓库ID
          const [warehouses] = await connection.execute(
            'SELECT warehouse_id FROM user_management.warehouses WHERE warehouse_name = ? AND owner_id = ?',
            [zoneData.warehouse_name, userId]
          );

          if (warehouses.length === 0) {
            throw new Error(`仓库 "${zoneData.warehouse_name}" 不存在`);
          }

          const warehouseId = warehouses[0].warehouse_id;

          // 检查货区代码是否已存在
          const [existingZones] = await connection.execute(
            'SELECT zone_id FROM user_management.warehouse_zones WHERE warehouse_id = ? AND zone_code = ?',
            [warehouseId, zoneData.zone_code]
          );

          if (existingZones.length > 0) {
            throw new Error(`货区代码 "${zoneData.zone_code}" 已存在`);
          }

          // 验证类型值
          const typeMap = {
            '存储区': 'storage',
            '拣货区': 'picking',
            '包装区': 'packing',
            '收货区': 'receiving'
          };

          if (!typeMap[zoneData.type]) {
            throw new Error(`类型 "${zoneData.type}" 无效，可选值：存储区、拣货区、包装区、收货区`);
          }

          zones.push({
            ...zoneData,
            warehouseId,
            type: typeMap[zoneData.type]
          });

        } catch (error) {
          errors.push(`第 ${i} 行: ${error.message}`);
        }
      }

      // 如果有任何错误，生成错误报告并返回
      if (errors.length > 0) {
        await connection.rollback();
        Logger.warn('导入验证失败:', { errors });

        try {
          // 生成错误报告
          const errorReport = await WarehouseZoneController.generateErrorReport(worksheet, errors);
          
          // 确保错误报告目录存在
          const errorReportsDir = path.join(__dirname, '../../uploads/error-reports');
          if (!fs.existsSync(errorReportsDir)) {
            fs.mkdirSync(errorReportsDir, { recursive: true });
          }

          // 生成文件名
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `import_errors_${timestamp}.xlsx`;
          const reportPath = path.join(errorReportsDir, filename);
          
          // 写入文件
          await errorReport.xlsx.writeFile(reportPath);

          return res.status(400).json({
            success: false,
            message: '导入失败，请查看错误报告',
            errors,
            errorReport: {
              filename: `货区导入失败报告_${timestamp}.xlsx`,
              url: `/warehouse-zones/error-reports/${filename}`
            }
          });

        } catch (error) {
          Logger.error('生成错误报告失败:', error);
          return res.status(500).json({
            success: false,
            message: '生成错误报告失败',
            errors
          });
        }
      }

      // 批量插入数据
      for (const zone of zones) {
        await connection.execute(
          `INSERT INTO user_management.warehouse_zones (
            warehouse_id, zone_code, zone_name, floor_level, 
            capacity, type, status, created_by, owner_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [
            zone.warehouseId,
            zone.zone_code,
            zone.zone_name,
            zone.floor_level,
            zone.capacity,
            zone.type,
            userId,
            userId
          ]
        );
      }

      await connection.commit();
      Logger.info('导入成功:', { totalCount: zones.length });

      res.json({
        success: true,
        message: `成功导入 ${zones.length} 条数据`,
        data: {
          total: zones.length
        }
      });

    } catch (error) {
      await connection.rollback();
      Logger.error('导入失败:', error);
      res.status(500).json({
        success: false,
        message: '导入失败：' + (error.message || '系统错误')
      });
    } finally {
      connection.release();
      // 删除原始上传的临时文件
      if (req.file?.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) Logger.error('删除临时文件失败:', err);
        });
      }
    }
  }

  // 更新货区状态
  static async updateStatus(req, res) {
    try {
      const { zoneId } = req.params;
      const { status } = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;

      // 检查用户角色
      if (req.user.userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '无权操作'
        });
      }

      const success = await WarehouseZoneModel.updateZoneStatus(zoneId, status, userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          message: '货区不存在'
        });
      }

      res.json({
        success: true,
        message: '状态更新成功'
      });
    } catch (error) {
      Logger.error('更新货区状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新状态失败'
      });
    }
  }

  // 获取货区详情
  static async getZone(req, res) {
    try {
      const { zoneId } = req.params;
      const connection = await db.getConnection();

      try {
        const [rows] = await connection.query(
          'SELECT * FROM warehouse_zones WHERE zone_id = ? AND owner_id = ?',
          [zoneId, req.user.userId]
        );

        if (rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: '货区不存在'
          });
        }

        res.json({
          success: true,
          data: rows[0]
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      Logger.error('获取货区详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取货区详情失败'
      });
    }
  }

  // 下载错误报告
  static async downloadErrorReport(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../../uploads/error-reports', filename);

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        Logger.warn('错误报告文件不存在:', { filename, filePath });
        return res.status(404).json({
          success: false,
          message: '错误报告文件已过期，请重新导入'
        });
      }

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=货区导入失败报告.xlsx`);

      // 使用流式传输
      const fileStream = fs.createReadStream(filePath);
      
      // 错误处理
      fileStream.on('error', (error) => {
        Logger.error('读取错误报告文件失败:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: '下载错误报告失败'
          });
        }
      });

      // 传输完成后删除文件
      fileStream.on('end', () => {
        fs.unlink(filePath, (err) => {
          if (err) Logger.error('删除错误报告文件失败:', err);
        });
      });

      // 开始传输
      fileStream.pipe(res);

    } catch (error) {
      Logger.error('下载错误报告失败:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: '下载错误报告失败'
        });
      }
    }
  }
}

module.exports = WarehouseZoneController; 