const jwt = require('jsonwebtoken');
const Logger = require('../utils/logger');
const { redis } = require('../config/redis');

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      Logger.warn('请求缺少认证令牌');
      return res.status(401).json({
        success: false,
        message: 'token_invalid'
      });
    }

    try {
      // 验证 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // 检查 Redis 中的 token
      const storedToken = await redis.get(`user_token:${decoded.userId}`);
      
      if (!storedToken) {
        Logger.warn('Token已过期:', decoded.userId);
        return res.status(401).json({
          success: false,
          message: 'token_expired'
        });
      }

      // 检查 token 是否匹配
      if (storedToken !== token) {
        Logger.warn('Token不匹配:', decoded.userId);
        return res.status(401).json({
          success: false,
          message: 'token_invalid'
        });
      }

      req.user = decoded;
      next();
    } catch (jwtError) {
      // JWT 验证失败（包括过期）
      Logger.warn('Token验证失败:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: jwtError.name === 'TokenExpiredError' ? 'token_expired' : 'token_invalid'
      });
    }
  } catch (error) {
    Logger.error('认证中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

module.exports = {
  authenticateToken
}; 