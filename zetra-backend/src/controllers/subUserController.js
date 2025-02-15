const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');

class SubUserController {
  // 获取子用户列表
  static async getSubUsers(req, res) {
    try {
      Logger.info('获取子用户列表请求');
      
      // 确保从 req.user 中获取到 userId
      const userId = req.user?.userId;
      if (!userId) {
        Logger.error('未获取到用户ID', userId);
        return res.status(401).json({
          success: false,
          message: 'token_invalid'
        });
      }

      // 使用 UserModel 查询子用户
      const subUsers = await UserModel.findSubUsers(userId);
      Logger.info(`查询到 ${subUsers.length} 个子用户`);
      
      return res.json({
        success: true,
        data: subUsers
      });
    } catch (error) {
      Logger.error('获取子用户列表失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取子用户列表失败'
      });
    }
  }

  // 创建子用户
  static async createSubUser(req, res) {
    try {
      const userData = JSON.parse(req.body.Xzetra);
      const parentUserId = req.user.userId;

      Logger.info('创建子用户请求:', { 
        ...userData, 
        parentUserId,
        password: '***'
      });

      // 基本验证
      if (!userData.username || !userData.password || !userData.email) {
        return res.status(400).json({
          success: false,
          message: '缺少必要字段'
        });
      }

      try {
        const userId = await UserModel.createSubUser(userData, parentUserId);
        res.status(201).json({
          success: true,
          message: '创建成功',
          data: { userId }
        });
      } catch (error) {
        if (error.message === '用户名已存在') {
          return res.status(400).json({
            success: false,
            message: '用户名已被使用'
          });
        }
        throw error;
      }
    } catch (error) {
      Logger.error('创建子用户失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '创建失败'
      });
    }
  }

  // 更新子用户状态
  static async updateSubUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = JSON.parse(req.body.Xzetra);
      const parentUserId = req.user.userId;

      // 验证是否为该用户的子用户
      const subUser = await UserModel.findSubUserById(userId, parentUserId);
      if (!subUser) {
        return res.status(404).json({
          success: false,
          message: '子用户不存在或无权操作'
        });
      }

      await UserModel.updateUserStatus(userId, status);
      Logger.info('更新子用户状态成功:', { userId, status });

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      Logger.error('更新子用户状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新失败'
      });
    }
  }

  // 删除子用户
  static async deleteSubUser(req, res) {
    try {
      const { userId } = req.params;
      const parentUserId = req.user.userId;

      // 验证是否为该用户的子用户
      const subUser = await UserModel.findSubUserById(userId, parentUserId);
      if (!subUser) {
        return res.status(404).json({
          success: false,
          message: '子用户不存在或无权操作'
        });
      }

      await UserModel.deleteUser(userId);
      Logger.info('删除子用户成功:', { userId });

      res.json({
        success: true,
        message: '删除成功'
      });
    } catch (error) {
      Logger.error('删除子用户失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '删除失败'
      });
    }
  }

  // 更新子用户
  static async updateSubUser(req, res) {
    try {
      const { userId } = req.params;
      const userData = JSON.parse(req.body.Xzetra);
      const parentUserId = req.user.userId;

      // 验证是否为该用户的子用户
      const subUser = await UserModel.findSubUserById(userId, parentUserId);
      if (!subUser) {
        return res.status(404).json({
          success: false,
          message: '子用户不存在或无权操作'
        });
      }

      // 更新用户信息
      await UserModel.updateUser(userId, userData);
      Logger.info('更新子用户成功:', { userId });

      res.json({
        success: true,
        message: '更新成功'
      });
    } catch (error) {
      Logger.error('更新子用户失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '更新失败'
      });
    }
  }
}

module.exports = SubUserController; 