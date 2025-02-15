const Joi = require('joi');

// 用于创建供应商的 schema（供新增操作使用）
const createSupplierSchema = Joi.object({
  supplier_id: Joi.number().integer().optional(),
  supplier_code: Joi.string().max(50).required(),
  supplier_name: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  contact_person: Joi.string().allow('', null),
  contact_phone: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  address: Joi.string().allow('', null),
  tax_number: Joi.string().allow('', null),
  category_id: Joi.number().integer().allow(null),
  status: Joi.string().valid('active', 'inactive').default('active'),
  created_by: Joi.number().integer().required(),
  owner_id: Joi.number().integer().required(),
  notes: Joi.string().allow('', null)
});

// 用于更新供应商的 schema：不需要 supplier_code、supplier_id、created_by、owner_id、created_at 这些只读字段
const updateSupplierSchema = Joi.object({
  supplier_name: Joi.string().max(100).required(),
  description: Joi.string().allow('', null),
  contact_person: Joi.string().allow('', null),
  contact_phone: Joi.string().allow('', null),
  email: Joi.string().email().allow('', null),
  address: Joi.string().allow('', null),
  tax_number: Joi.string().allow('', null),
  category_id: Joi.number().integer().allow(null),
  status: Joi.string().valid('active', 'inactive'),
  notes: Joi.string().allow('', null),
  updated_at: Joi.any()
});

function validateSupplier(req, res, next) {
  const data = req.body;
  console.log("supplierValidator: Data to validate =", data);
  
  // 对解析后的数据运行 Joi 验证，允许未知字段（如 supplier_id）
  const { error, value } = createSupplierSchema.validate(data, { abortEarly: true, allowUnknown: true });
  if (error) {
    console.error("Joi validation error:", error);
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  // 将验证通过的数据赋值回 req.body
  req.body = value;
  next();
}

module.exports = {
  createSupplierSchema,
  updateSupplierSchema,
  validateSupplier
}; 