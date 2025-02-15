const InboundOrderModel = require('../models/inboundOrderModel');
const Logger = require('../utils/logger');
const { createInboundOrderSchema } = require('../validators/inboundOrderValidator');

class InboundOrderController {
  /**
   * 创建入库单
   */
  static async createInboundOrder(req, res) {
    try {
      // 校验请求数据，由验证器返回 error 与 validated value
      const { error, value } = createInboundOrderSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }
      // Ensure the owner_id (and optionally created_by) is set based on the logged-in user
      if (req.user) {
        value.owner_id = req.user.accountType === 'child' ? req.user.parentUserId : req.user.userId;
        // Optionally, you can also override created_by if desired
        value.created_by = req.user.userId;
        console.log("createInboundOrder - 设置 owner_id:", value.owner_id);
      }
      // 调用模型创建入库单
      const inboundOrderId = await InboundOrderModel.createInboundOrder(value);
      return res.status(201).json({
        success: true,
        message: '入库单创建成功',
        inboundOrderId
      });
    } catch (err) {
      Logger.error('创建入库单失败: ', err);
      // 若遇到同一归属账号下的重复订单号，则返回相应错误提示
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: '当前账号下入库单号已存在' });
      }
      return res.status(500).json({ success: false, message: '创建入库单失败' });
    }
  }

  /**
   * 获取入库单列表接口，支持分页和条件过滤
   */
  static async getInboundOrders(req, res) {
    try {
      const params = { ...req.query };
      if (req.user) {
        // For a child account, always use parent's ID (if defined), otherwise use own ID.
        const owner_id = (req.user.accountType === 'child' && req.user.parentUserId)
          ? req.user.parentUserId
          : req.user.userId;
        params.owner_id = owner_id;
        console.log("getInboundOrders - 使用 owner_id:", owner_id);
      }
      const result = await InboundOrderModel.getInboundOrders(params);
      return res.json({
        success: true,
        data: result.data,
        total: result.total
      });
    } catch (err) {
      Logger.error("查询入库单列表失败:", err);
      return res.status(500).json({ success: false, message: "查询入库单列表失败" });
    }
  }

  /**
   * 更新入库单（订单状态不允许编辑时返回错误）
   */
  static async updateInboundOrder(req, res) {
    try {
      const inboundOrderId = req.params.inboundOrderId;
      // Override owner_id and created_by based on the logged-in user.
      // This ensures that a child account uses its parent's ID instead of the (incorrect) value from the request
      if (req.user) {
        req.body.owner_id = req.user.accountType === 'child' ? req.user.parentUserId : req.user.userId;
        req.body.created_by = req.user.userId; // Optionally override created_by as well
      }
      // 此处建议对更新数据再进行相应的验证（可定义 updateInboundOrderSchema）
      await InboundOrderModel.updateInboundOrder(inboundOrderId, req.body);
      return res.json({ success: true, message: '入库单更新成功' });
    } catch (err) {
      Logger.error('更新入库单失败: ', err);
      return res.status(400).json({ success: false, message: err.message || '更新入库单失败' });
    }
  }

  /**
   * 删除入库单（订单状态不允许删除时返回错误）
   */
  static async deleteInboundOrder(req, res) {
    try {
      const inboundOrderId = req.params.inboundOrderId;
      await InboundOrderModel.deleteInboundOrder(inboundOrderId);
      return res.json({ success: true, message: '入库单删除成功' });
    } catch (err) {
      Logger.error('删除入库单失败: ', err);
      return res.status(400).json({ success: false, message: err.message || '删除入库单失败' });
    }
  }

  /**
   * 获取单个入库单及其明细
   */
  static async getInboundOrderById(req, res) {
    try {
      // 从 URL 参数中获取 inbound_order_id (例如 /api/inbound-orders/:id)
      const id = req.params.id;
      // 根据当前登录用户确定归属owner_id
      let owner_id;
      if (req.user) {
        owner_id = (req.user.accountType === 'child' && req.user.parentUserId)
          ? req.user.parentUserId
          : req.user.userId;
        console.log("getInboundOrderById - 使用 owner_id:", owner_id);
      }

      const order = await InboundOrderModel.getInboundOrderById(id, owner_id);
      if (!order) {
        return res.status(404).json({ success: false, message: "未找到该入库单" });
      }
      res.json({ success: true, data: order });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * 导出入库单及关联明细为 Excel 文件
   */
  static async exportInboundOrders(req, res) {
    try {
      const params = { ...req.query };
      if (req.user) {
        const owner_id = (req.user.accountType === 'child' && req.user.parentUserId)
          ? req.user.parentUserId
          : req.user.userId;
        params.owner_id = owner_id;
      }

      const exportData = await InboundOrderModel.exportInboundOrders(params);

      // 使用 ExcelJS 生成 Excel 文件
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inbound Orders');

      // 定义表头，与查询中返回的字段对应
      worksheet.columns = [
        { header: '入库单ID', key: 'inbound_order_id', width: 10 },
        { header: '入库单号', key: 'order_number', width: 15 },
        { header: '仓库名称', key: 'warehouse_name', width: 15 },
        { header: '供应商名称', key: 'supplier_name', width: 15 },
        { header: '入库日期', key: 'inbound_date', width: 20 },
        { header: '入库类型', key: 'inbound_type', width: 10 },
        { header: '状态', key: 'status', width: 10 },
        { header: '创建者', key: 'created_by', width: 15 },
        { header: '物料名称', key: 'material_name', width: 15 },
        { header: '数量', key: 'quantity', width: 10 },
        { header: '单价', key: 'unit_cost', width: 10 },
        { header: '单位', key: 'unit', width: 10 },
        { header: '分类ID', key: 'category_id', width: 10 },
        { header: '规格', key: 'specifications', width: 20 }
      ];

      // 添加数据行（如果有数据），并转换部分字段以确保格式正确
      if (exportData && exportData.length > 0) {
        exportData.forEach(row => {
          console.log("DEBUG: 行数据:", row);
          // 转换 inbound_date 为 Date 对象（或为空字符串）
          if (row.inbound_date) {
            const dt = new Date(row.inbound_date);
            row.inbound_date = isNaN(dt.getTime()) ? '' : dt;
          }

          // 确保其它字段不为 undefined
          row.inbound_order_id = row.inbound_order_id || '';
          row.order_number = row.order_number || '';
          row.warehouse_name = row.warehouse_name || '';
          row.supplier_name = row.supplier_name || '';
          row.inbound_type = row.inbound_type || '';
          row.status = row.status || '';
          row.created_by = row.created_by || '';
          row.material_name = row.material_name || '';
          row.quantity = row.quantity || '';
          row.unit_cost = row.unit_cost || '';
          row.unit = row.unit || '';
          row.category_id = row.category_id || '';
          row.specifications = row.specifications || '';

          worksheet.addRow(row);
        });
      }

      // 设置响应头
      res.set({
        'Content-Disposition': 'attachment; filename="inbound_orders.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // 生成 Excel 文件为 Buffer 并返回
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      Logger.error("导出入库单失败:", error);
      return res.status(500).json({ success: false, message: "导出入库单失败" });
    }
  }
}

module.exports = InboundOrderController; 