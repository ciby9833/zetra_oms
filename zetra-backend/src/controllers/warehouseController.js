const WarehouseModel = require('../models/warehouseModel');
const Logger = require('../utils/logger');
const UserModel = require('../models/userModel');

class WarehouseController {
  // 获取仓库列表
  static async getWarehouses(req, res) {
    try {
      const userId = req.user.userId;
      const searchParams = {
        keyword: req.query.keyword,
        status: req.query.status
      };

      Logger.info('获取仓库列表:', { userId, searchParams });
      
      const warehouses = await WarehouseModel.searchWarehouses(userId, searchParams);
      
      res.json({
        success: true,
        data: warehouses
      });
    } catch (error) {
      Logger.error('获取仓库列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取仓库列表失败'
      });
    }
  }

  // 获取单个仓库
  static async getWarehouse(req, res) {
    try {
      const { id } = req.params;
      const warehouse = await WarehouseModel.findById(id);
      
      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: '仓库不存在'
        });
      }

      res.json({
        success: true,
        data: warehouse
      });
    } catch (error) {
      Logger.error('获取仓库信息失败', error);
      res.status(500).json({
        success: false,
        message: '获取仓库信息失败'
      });
    }
  }

  // 创建仓库
  static async createWarehouse(req, res) {
    try {
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      data.created_by = userId;
      data.owner_id = masterUserId;

      const warehouseId = await WarehouseModel.createWarehouse(data);
      
      res.json({
        success: true,
        data: { warehouseId }
      });
    } catch (error) {
      Logger.error('创建仓库失败:', error);
      res.status(error.message.includes('已存在') ? 400 : 500).json({
        success: false,
        message: error.message || '创建仓库失败'
      });
    }
  }

  // 更新仓库
  static async updateWarehouse(req, res) {
    try {
      const { id } = req.params;
      const warehouseData = JSON.parse(req.body.Xzetra);

      // 检查仓库是否存在
      const existing = await WarehouseModel.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: '仓库不存在'
        });
      }

      // 更新仓库
      await WarehouseModel.updateWarehouse(id, warehouseData);

      // 获取更新后的完整数据
      const warehouse = await WarehouseModel.findById(id);

      res.json({
        success: true,
        message: '更新成功',
        data: warehouse
      });
    } catch (error) {
      Logger.error('更新仓库失败', error);
      res.status(500).json({
        success: false,
        message: '更新仓库失败'
      });
    }
  }

  // 删除仓库
  static async deleteWarehouse(req, res) {
    try {
      const { id } = req.params;
      const success = await WarehouseModel.deleteWarehouse(id);
      
      if (success) {
        res.json({
          success: true,
          message: '删除成功'
        });
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      Logger.error('删除仓库失败', error);
      res.status(500).json({
        success: false,
        message: '删除仓库失败'
      });
    }
  }

  // 添加调试方法
  static async debugCreateWarehouse(req, res) {
    try {
      const data = JSON.parse(req.body.Xzetra);
      Logger.info('接收到的数据:', {
        原始数据: data,
        地区字段: {
          country: data.country,
          province: data.province,
          city: data.city,
          district: data.district,
          township: data.township
        },
        地区ID: {
          country_id: data.country_id,
          province_id: data.province_id,
          city_id: data.city_id,
          district_id: data.district_id,
          township_id: data.township_id
        }
      });
      res.json({ success: true, data });
    } catch (error) {
      Logger.error('调试失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = WarehouseController; 