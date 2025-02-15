const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const Logger = require('./logger');

class TokenUtils {
  static async generateToken(userId) {
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 存储到 Redis，设置相同的过期时间
    await redis.redis.setex(
      `token:${token}`,
      24 * 60 * 60,
      JSON.stringify({ userId, valid: true })
    );

    return token;
  }

  static async invalidateUserTokens(userId) {
    try {
      // 获取该用户的所有 token
      const keys = await redis.keys(`token:${userId}:*`);
      
      if (keys.length > 0) {
        // 删除所有旧 token
        await redis.del(...keys);
        Logger.info('已清除用户旧 token', {
          userId,
          tokenCount: keys.length
        });
      }
    } catch (error) {
      Logger.error('清除用户 token 失败', error);
      throw error;
    }
  }

  static async validateToken(token) {
    try {
      // 验证 token 格式
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      );

      // 检查 token 是否在 Redis 中有效
      const isValid = await redis.exists(
        `token:${decoded.userId}:${token}`
      );

      return {
        valid: isValid === 1,
        userId: decoded.userId
      };
    } catch (error) {
      Logger.error('Token 验证失败', error);
      return { valid: false, userId: null };
    }
  }

  static async refreshToken(oldToken) {
    try {
      const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // 检查旧token是否在redis中有效
      const tokenData = await redis.redis.get(`token:${oldToken}`);
      if (!tokenData) {
        return { valid: false, message: 'token已失效' };
      }

      // 生成新token
      const newToken = await this.generateToken(userId);

      // 使旧token失效
      await redis.redis.del(`token:${oldToken}`);

      return {
        valid: true,
        token: newToken,
        userId
      };
    } catch (error) {
      Logger.error('刷新token失败:', error);
      return { valid: false, message: 'token刷新失败' };
    }
  }
}

module.exports = TokenUtils; 