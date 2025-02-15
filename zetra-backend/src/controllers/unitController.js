const MaterialUnitModel = require('../models/materialUnitModel');
const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');

class UnitController {
  // 获取单位列表
  static async getUnits(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);
      
      const params = {
        ...req.query,
        owner_id: masterUserId
      };

      const result = await MaterialUnitModel.getUnits(params);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      Logger.error('获取单位列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取单位列表失败'
      });
    }
  }

  // 创建单位
  static async createUnit(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);
      
      // 确保从 Xzetra 字段获取数据
      const data = JSON.parse(req.body.Xzetra);
      
      // 添加创建者和所有者信息
      const unitData = {
        ...data,
        created_by: userId,
        owner_id: masterUserId
      };

      Logger.info('创建单位:', unitData);
      const result = await MaterialUnitModel.createUnit(unitData);
      
      res.json({
        success: true,
        message: '创建成功',
        data: result
      });
    } catch (error) {
      Logger.error('创建单位失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建单位失败'
      });
    }
  }

  // 更新单位
  static async updateUnit(req, res) {
    try {
      const { id } = req.params;
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 验证单位是否存在且属于当前用户
      const unit = await MaterialUnitModel.getUnitById(id);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: '单位不存在'
        });
      }

      if (unit.owner_id !== masterUserId) {
        return res.status(403).json({
          success: false,
          message: '无权操作此单位'
        });
      }

      const success = await MaterialUnitModel.updateUnit(id, data);
      if (!success) {
        throw new Error('更新失败');
      }

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      Logger.error('更新单位失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新单位失败'
      });
    }
  }

  // 删除单位
  static async deleteUnit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 检查单位使用情况
      const usage = await MaterialUnitModel.checkUnitUsage(id, masterUserId);
      if (usage.inUse) {
        return res.status(400).json({
          success: false,
          message: '单位已被使用，无法删除',
          data: usage
        });
      }

      const success = await MaterialUnitModel.deleteUnit(id, masterUserId);
      if (!success) {
        throw new Error('删除失败');
      }

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      Logger.error('删除单位失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除单位失败'
      });
    }
  }

  // 获取单位详情
  static async getUnit(req, res) {
    try {
      const { id } = req.params;
      const unit = await MaterialUnitModel.getUnitById(id);
      
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: '单位不存在'
        });
      }

      res.json({
        success: true,
        data: unit
      });
    } catch (error) {
      Logger.error('获取单位详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取单位详情失败'
      });
    }
  }

  // 检查单位使用情况
  static async checkUnitUsage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      Logger.info('检查单位使用情况:', { unitId: id, userId, masterUserId });

      // 验证单位是否存在且属于当前用户
      const unit = await MaterialUnitModel.getUnitById(id);
      if (!unit) {
        return res.status(404).json({
          success: false,
          message: '单位不存在'
        });
      }

      if (unit.owner_id !== masterUserId) {
        return res.status(403).json({
          success: false,
          message: '无权操作此单位'
        });
      }

      const usage = await MaterialUnitModel.checkUnitUsage(id, masterUserId);
      
      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      Logger.error('检查单位使用情况失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '检查单位使用情况失败'
      });
    }
  }
}

module.exports = UnitController; 