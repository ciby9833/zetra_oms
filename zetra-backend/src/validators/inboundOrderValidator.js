const Joi = require('joi');

const createInboundOrderSchema = Joi.object({
  // 入库单编号，开发时可以选择后端生成，这里要求前端传入则做校验
  order_number: Joi.string().max(50).required().label('入库单号'),
  // 仓库ID，必须为整数
  warehouse_id: Joi.number().integer().required().label('仓库ID'),
  // 供应商ID，必须为整数
  supplier_id: Joi.number().integer().required().label('供应商ID'),
  // 入库日期，必须为日期格式
  inbound_date: Joi.date().required().label('入库日期'),
  // 入库类型，必须为以下其中一个值
  inbound_type: Joi.string()
    .valid('采购', '调拨', '退货', '盘盈单')
    .required()
    .label('入库类型'),
  // 入库单明细，至少包含一条记录
  items: Joi.array()
    .items(
      Joi.object({
        material_id: Joi.number().integer().required().label('物料ID'),
        quantity: Joi.number().positive().required().label('数量'),
        unit_cost: Joi.number().precision(2).required().label('单价')
      })
    )
    .min(1)
    .required()
    .label('入库单明细'),
  // 创建者ID，必须为整数
  created_by: Joi.number().integer().required().label('创建者ID'),
  // 所属主账号ID，必须为整数
  owner_id: Joi.number().integer().required().label('主账号ID'),
  // 备注，非必填
  remarks: Joi.string().optional().allow('', null).label('备注')
});

module.exports = {
  createInboundOrderSchema
}; 