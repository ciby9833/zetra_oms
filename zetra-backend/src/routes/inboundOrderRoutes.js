const express = require('express');
const InboundOrderController = require('../controllers/inboundOrderController');
const router = express.Router();

// 创建入库单 (POST /api/inbound-orders)
router.post('/', InboundOrderController.createInboundOrder);

// 获取入库单列表（支持分页、过滤） (GET /api/inbound-orders)
router.get('/', InboundOrderController.getInboundOrders);

// 更新入库单 (PUT /api/inbound-orders/:inboundOrderId)
router.put('/:inboundOrderId', InboundOrderController.updateInboundOrder);

// 删除入库单 (DELETE /api/inbound-orders/:inboundOrderId)
router.delete('/:inboundOrderId', InboundOrderController.deleteInboundOrder);

// 导出入库单 (GET /api/inbound-orders/export)
router.get('/export', InboundOrderController.exportInboundOrders);

// 获取单个入库单详情 (GET /api/inbound-orders/:id)
router.get('/:id', InboundOrderController.getInboundOrderById);

module.exports = router; 