const Logger = require('../utils/logger');

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { permissions = [], userRole } = req.user;
      
      Logger.info('权限检查:', {
        userId: req.user.userId,
        required: requiredPermission,
        userRole,
        userPermissions: permissions
      });

      // 超级管理员跳过权限检查
      if (userRole === 'super_admin') {
        return next();
      }
      
      // 管理员对仓库和物料模块有完整权限
      if (userRole === 'admin' && 
          (requiredPermission.startsWith('material.') || 
           requiredPermission.startsWith('warehouse.'))) {
        return next();
      }

      if (!permissions.includes(requiredPermission)) {
        Logger.warn('权限不足:', {
          userId: req.user.userId,
          required: requiredPermission,
          userPermissions: permissions
        });
        
        return res.status(403).json({
          success: false,
          message: '没有操作权限'
        });
      }
      
      next();
    } catch (error) {
      Logger.error('权限检查失败:', error);
      res.status(500).json({
        success: false,
        message: '权限检查失败'
      });
    }
  };
};

module.exports = { checkPermission }; 