const express = require('express');
const cors = require('cors');
const Logger = require('./utils/logger');
const routes = require('./routes');
const { redis, subRedis } = require('./config/redis');
const userRoutes = require('./routes/userRoutes');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// CORS 配置
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// 配置请求体解析
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// 文件上传路由的特殊处理
app.use((req, res, next) => {
  if (req.path === '/api/material/materials/import') {
    return next();
  }
  bodyParser.json()(req, res, next);
});

// API 路由
app.use('/api', routes);
app.use('/api/users', userRoutes);
// 添加静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 错误处理
app.use((err, req, res, next) => {
  Logger.error('服务器错误', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// Redis 订阅和消息处理已经移到 redis.js 中处理
// 不需要在这里重复订阅

const port = process.env.PORT || 3000;
app.listen(port, () => {
  Logger.info(`服务器运行在端口 ${port}`);
}); 