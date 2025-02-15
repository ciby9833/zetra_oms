const svgCaptcha = require('svg-captcha');
const redis = require('../config/redis');
const Logger = require('./logger');

class CaptchaUtils {
  // 内存存储作为备份
  static captchaStore = new Map();

  static generateCaptcha() {
    return svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
      background: '#f0f0f0'
    });
  }

  static async saveCaptcha(email, code) {
    try {
      // 先尝试保存到 Redis
      await redis.set(`captcha:${email}`, code, 'EX', 300);
      Logger.info('验证码保存到 Redis 成功', { email });
    } catch (error) {
      Logger.error('保存验证码到 Redis 失败:', error);
      // Redis 失败时使用内存存储
      this.captchaStore.set(email, {
        code,
        timestamp: Date.now()
      });
      Logger.info('验证码保存到内存成功', { email });
    }
  }

  static async verifyCaptcha(email, code) {
    if (!code) return false;
    
    try {
      // 先检查内存存储
      const memoryCode = this.captchaStore.get(email);
      if (memoryCode && Date.now() - memoryCode.timestamp < 300000) {
        this.captchaStore.delete(email);
        const isValid = memoryCode.code === code.toLowerCase();
        Logger.info('从内存验证验证码', { email, isValid });
        return isValid;
      }

      // 再检查 Redis
      const savedCode = await redis.get(`captcha:${email}`);
      if (savedCode) {
        await redis.del(`captcha:${email}`);
        const isValid = savedCode === code.toLowerCase();
        Logger.info('从Redis验证验证码', { email, isValid });
        return isValid;
      }

      Logger.info('验证码不存在或已过期', { email });
      return false;
    } catch (error) {
      Logger.error('验证码验证失败:', error);
      return false;
    }
  }
}

module.exports = CaptchaUtils; 