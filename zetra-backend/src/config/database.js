const mysql = require('mysql2/promise');
const Logger = require('../utils/logger');
require('dotenv').config();

// 检查必要的环境变量
if (!process.env.DB_PASSWORD) {
  Logger.error('数据库密码未配置');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zetra',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 测试数据库连接
pool.getConnection()
  .then(connection => {
    Logger.info('数据库连接成功');
    connection.release();
  })
  .catch(error => {
    Logger.error('数据库连接失败:', error);
    // 如果是关键服务，可以选择在连接失败时退出程序
    // process.exit(1);
  });

module.exports = pool; 