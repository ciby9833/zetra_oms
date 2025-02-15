const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const warehouseRoutes = require('./warehouse');
const warehouseZoneRoutes = require('./warehouseZone');
const administrativeDivisionRoutes = require('./administrativeDivision');
const { authenticateToken } = require('../middleware/authMiddleware');
const supplierRoutes = require('./supplierRoutes');


// 公开路由
router.use('/users', userRoutes);

// 需要认证的路由
router.use(authenticateToken);

// 仓库相关路由
router.use('/warehouses', warehouseRoutes);
router.use('/warehouse-zones', warehouseZoneRoutes);
router.use('/administrative-divisions', administrativeDivisionRoutes);

// 物料相关路由
router.use('/material', require('./material'));

// 供应商相关路由
router.use('/suppliers', supplierRoutes);

// 入库单相关路由
router.use('/inbound-orders', require('./inboundOrderRoutes'));


module.exports = router; 
