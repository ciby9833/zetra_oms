// zetra-backend/src/middleware/materialUploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/logger');

// 上传目录：uploads/materials
const uploadDir = path.join(__dirname, '../../uploads/materials');

// 确保上传目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// 文件过滤，只允许 Excel 文件（.xlsx, .xls）
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 Excel 文件 (.xlsx, .xls)'));
  }
};

// 限制文件大小，例如 5MB
const limits = {
  fileSize: 5 * 1024 * 1024
};

const upload = multer({ storage, fileFilter, limits });

// 单文件上传中间件，要求字段名称为 "file"
const materialUploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      Logger.error('文件上传失败:', err);
      return res.status(400).json({
        success: false,
        message: err.message || '文件上传失败'
      });
    }
    if (!req.file) {
      Logger.error('未找到上传的文件');
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }
    // 输出请求中的文件信息进行调试
    Logger.info('上传文件信息:', req.file);
    next();
  });
};

module.exports = materialUploadMiddleware;