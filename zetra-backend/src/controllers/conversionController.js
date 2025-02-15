const UnitConversionModel = require('../models/unitConversionModel');
const MaterialUnitModel = require('../models/materialUnitModel');
const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');

class ConversionController {
  // 获取换算关系列表
  static async getConversions(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);
      
      Logger.info('获取换算关系列表, 参数:', { 
        ...req.query, 
        userId,
        masterUserId 
      });

      const params = {
        ...req.query,
        owner_id: masterUserId
      };

      const result = await UnitConversionModel.getConversions(params);
      
      res.json({
        success: true,
        data: {
          list: result,
          total: result.length
        }
      });
    } catch (error) {
      Logger.error('获取换算关系列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取换算关系列表失败'
      });
    }
  }

  // 创建换算关系
  static async createConversion(req, res) {
    try {
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);
      
      // 从 Xzetra 字段获取数据
      const data = JSON.parse(req.body.Xzetra);
      
      // 添加创建者和所有者信息
      const conversionData = {
        ...data,
        created_by: userId,
        owner_id: masterUserId
      };

      const result = await UnitConversionModel.createConversion(conversionData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      Logger.error('创建换算关系失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建换算关系失败'
      });
    }
  }

  // 更新换算关系
  static async updateConversion(req, res) {
    try {
      const { id } = req.params;
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 验证换算关系是否存在且属于当前用户
      const conversion = await UnitConversionModel.getConversionById(id);
      if (!conversion) {
        return res.status(404).json({
          success: false,
          message: '换算关系不存在'
        });
      }

      if (conversion.owner_id !== masterUserId) {
        return res.status(403).json({
          success: false,
          message: '无权操作此换算关系'
        });
      }

      const success = await UnitConversionModel.updateConversion(id, data);
      if (!success) {
        throw new Error('更新失败');
      }

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      Logger.error('更新换算关系失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新换算关系失败'
      });
    }
  }

  // 删除换算关系
  static async deleteConversion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      // 验证换算关系是否存在且属于当前用户
      const conversion = await UnitConversionModel.getConversionById(id);
      if (!conversion) {
        return res.status(404).json({
          success: false,
          message: '换算关系不存在'
        });
      }

      if (conversion.owner_id !== masterUserId) {
        return res.status(403).json({
          success: false,
          message: '无权操作此换算关系'
        });
      }

      const success = await UnitConversionModel.deleteConversion(id);
      if (!success) {
        throw new Error('删除失败');
      }

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      Logger.error('删除换算关系失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除换算关系失败'
      });
    }
  }

  // 获取换算关系详情
  static async getConversion(req, res) {
    try {
      const { id } = req.params;
      const conversion = await UnitConversionModel.getConversionById(id);
      
      if (!conversion) {
        return res.status(404).json({
          success: false,
          message: '换算关系不存在'
        });
      }

      res.json({
        success: true,
        data: conversion
      });
    } catch (error) {
      Logger.error('获取换算关系详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取换算关系详情失败'
      });
    }
  }

  // 检查循环换算
  static async checkCircularConversion(req, res) {
    try {
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      const hasCircular = await UnitConversionModel.checkCircularConversion({
        ...data,
        owner_id: masterUserId
      });

      res.json({
        success: true,
        data: hasCircular
      });
    } catch (error) {
      Logger.error('检查循环换算失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '检查循环换算失败'
      });
    }
  }

  // 验证换算关系
  static async validateConversion(req, res) {
    try {
      const data = JSON.parse(req.body.Xzetra);
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      const isValid = await UnitConversionModel.validateConversion({
        ...data,
        owner_id: masterUserId
      });

      res.json({
        success: true,
        data: isValid
      });
    } catch (error) {
      Logger.error('验证换算关系失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '验证换算关系失败'
      });
    }
  }

  // 获取换算路径
  static async getConversionPath(req, res) {
    try {
      const { fromUnit, toUnit, materialId } = req.query;
      const userId = req.user.userId;
      const masterUserId = await UserModel.getMasterUserId(userId);

      const path = await UnitConversionModel.getConversionPath({
        fromUnit: Number(fromUnit),
        toUnit: Number(toUnit),
        materialId: materialId ? Number(materialId) : undefined,
        owner_id: masterUserId
      });

      res.json({
        success: true,
        data: path
      });
    } catch (error) {
      Logger.error('获取换算路径失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取换算路径失败'
      });
    }
  }
}

module.exports = ConversionController; 