const UserModel = require('../models/userModel');
const { Logger } = require('../utils/logger');

class PermissionController {
  // 获取用户权限
  static async getUserPermissions(req, res) {
    try {
      const userId = req.params.userId || req.user.userId;
      const permissions = await UserModel.getUserPermissions(userId);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      Logger.error('获取用户权限失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // 分配用户权限
  static async assignPermissions(req, res) {
    try {
      const { userId, permissions } = req.body;
      const createdBy = req.user.userId;
      
      await UserModel.assignPermissions(userId, permissions, createdBy);
      
      res.json({
        success: true,
        message: '权限分配成功'
      });
    } catch (error) {
      Logger.error('分配权限失败:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = PermissionController; 