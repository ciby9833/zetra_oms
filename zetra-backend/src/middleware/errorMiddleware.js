const Logger = require('../utils/logger');

function errorMiddleware(err, req, res, next) {
  // 记录详细错误信息
  Logger.error('服务器错误', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params
    }
  });

  // 根据错误类型返回不同的状态码
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

module.exports = errorMiddleware; 