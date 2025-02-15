const Joi = require('joi');
const Logger = require('../utils/logger');
const AuthUtils = require('../utils/authUtils');

// 验证规则
const schemas = {
  'user.register': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true),
  
  'user.login': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true),
  
  'user.sendResetCode': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true),
  
  'user.verifyResetCode': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true),
  
  'user.resetPassword': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true),
  
  'user.sendChangePasswordCode': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true),
  
  'user.changePassword': Joi.object({
    Xzetra: Joi.string().required()
  }).unknown(true)
};

// API 请求验证中间件
const validateApiRequest = (schemaName) => {
  return (req, res, next) => {
    try {
      // 1. 验证签名
      const validationResult = AuthUtils.verifySignature(req);
      
      if (!validationResult.isValid) {
        Logger.error('API验证失败', {
          error: validationResult.error
        });
        return res.status(401).json({
          success: false,
          message: validationResult.error
        });
      }

      // 2. 验证请求参数
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`未找到验证规则: ${schemaName}`);
      }

      const { error } = schema.validate(req.body);
      if (error) {
        Logger.error('参数验证失败', {
          schema: schemaName,
          error: error.details[0].message
        });
        return res.status(400).json({
          success: false,
          message: '请求参数错误',
          error: error.details[0].message
        });
      }

      next();
    } catch (error) {
      Logger.error('请求验证失败', error);
      next(error);
    }
  };
};

// 添加物料相关的验证规则
const materialSchema = Joi.object({
  material_code: Joi.string().required(),
  material_name: Joi.string().required(),
  category_id: Joi.number().allow(null),
  specifications: Joi.string().allow(null, ''),
  unit: Joi.number().required(),
  sub_unit: Joi.number().allow(null),
  conversion_ratio: Joi.number().positive().allow(null),
  shelf_life: Joi.number().min(0).allow(null),
  batch_control: Joi.boolean().default(false),
  serial_control: Joi.boolean().default(false),
  status: Joi.string().valid('active', 'inactive').default('active'),
  storage_conditions: Joi.string().allow(null, ''),
  retrieval_conditions: Joi.string().allow(null, '')
});

const categorySchema = Joi.object({
  category_code: Joi.string().required(),
  category_name: Joi.string().required(),
  parent_id: Joi.number().allow(null),
  // ... 其他字段验证
});

const unitSchema = Joi.object({
  unit_code: Joi.string().required(),
  unit_name: Joi.string().required(),
  unit_type: Joi.string().valid('basic', 'sub').required(),
  // ... 其他字段验证
});

const conversionSchema = Joi.object({
  from_unit_id: Joi.number().required(),
  to_unit_id: Joi.number().required(),
  conversion_rate: Joi.number().positive().required(),
  // ... 其他字段验证
});

const validateMaterial = async (req, res, next) => {
  try {
    Logger.info('验证物料数据 - 原始请求:', req.body);
    
    if (!req.body || !req.body.Xzetra) {
      return res.status(400).json({
        success: false,
        message: '缺少 Xzetra 参数'
      });
    }

    let data;
    try {
      data = typeof req.body.Xzetra === 'string' 
        ? JSON.parse(req.body.Xzetra)
        : req.body.Xzetra;
    } catch (error) {
      Logger.error('解析 Xzetra 数据失败:', error);
      return res.status(400).json({
        success: false,
        message: '无效的 Xzetra 数据格式'
      });
    }

    Logger.info('验证物料数据 - 解析后:', data);

    const { error } = materialSchema.validate(data, {
      abortEarly: false,
      allowUnknown: true
    });
    
    if (error) {
      Logger.error('物料数据验证失败:', error.details);
      return res.status(400).json({
        success: false,
        message: error.details.map(detail => detail.message).join('; ')
      });
    }

    // 将解析后的数据保存到请求对象中
    req.materialData = data;
    next();
  } catch (error) {
    Logger.error('物料验证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  validateApiRequest,
  validateMaterial
}; 