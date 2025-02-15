const redis = require('../config/redis');
const Logger = require('./logger');

class SessionUtils {
  static async getSession(sessionId) {
    try {
      const session = await redis.hgetall(`session:${sessionId}`);
      return Object.keys(session).length > 0 ? session : null;
    } catch (error) {
      Logger.error('获取会话失败', error);
      return null;
    }
  }

  static async setSession(sessionId, data, ttl = 24 * 60 * 60) {
    try {
      const key = `session:${sessionId}`;
      await redis.hmset(key, {
        ...data,
        lastActivity: Date.now()
      });
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      Logger.error('设置会话失败', error);
      return false;
    }
  }

  static async updateSession(sessionId, data) {
    try {
      const key = `session:${sessionId}`;
      await redis.hmset(key, {
        ...data,
        lastActivity: Date.now()
      });
      return true;
    } catch (error) {
      Logger.error('更新会话失败', error);
      return false;
    }
  }

  static async deleteSession(sessionId) {
    try {
      await redis.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      Logger.error('删除会话失败', error);
      return false;
    }
  }
}

module.exports = SessionUtils; 