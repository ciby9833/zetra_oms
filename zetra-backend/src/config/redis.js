const Redis = require('ioredis');
const Logger = require('../utils/logger');

// Redis 连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// 创建两个 Redis 客户端实例
const redis = new Redis(redisConfig);
const subRedis = new Redis(redisConfig);

// 普通客户端连接事件
redis.on('connect', () => {
  Logger.info('Redis 主客户端连接成功');
});

redis.on('error', (error) => {
  Logger.error('Redis 主客户端错误:', error);
});

// 订阅客户端连接事件
subRedis.on('connect', () => {
  Logger.info('Redis 订阅客户端连接成功');
});

subRedis.on('error', (error) => {
  Logger.error('Redis 订阅客户端错误:', error);
});

// 订阅用户登出频道
subRedis.subscribe('user_logout', (err) => {
  if (err) {
    Logger.error('Redis 订阅错误:', err);
    return;
  }
  Logger.info('已订阅 user_logout 频道');
});

// 处理订阅消息
subRedis.on('message', (channel, message) => {
  if (channel === 'user_logout') {
    try {
      const data = JSON.parse(message);
      Logger.info('收到登出消息:', data);
      
      // 删除旧的 token
      redis.del(`user_token:${data.userId}`).catch(error => {
        Logger.error('删除 token 失败:', error);
      });
    } catch (error) {
      Logger.error('处理登出消息失败:', error);
    }
  }
});

module.exports = {
  redis,      // 用于普通操作
  subRedis    // 用于发布/订阅
}; 