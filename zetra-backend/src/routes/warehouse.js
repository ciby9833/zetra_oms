const express = require('express');
const router = express.Router();
const WarehouseController = require('../controllers/warehouseController');
const { checkPermission } = require('../middleware/permission');

// 获取仓库列表 - 所有用户都可以查看
router.get('/', WarehouseController.getWarehouses);

// 获取单个仓库
router.get('/:id', checkPermission('warehouse.view'), WarehouseController.getWarehouse);

// 创建仓库
router.post('/', checkPermission('warehouse.add'), WarehouseController.createWarehouse);

// 更新仓库
router.put('/:id', checkPermission('warehouse.edit'), WarehouseController.updateWarehouse);

// 删除仓库
router.delete('/:id', checkPermission('warehouse.delete'), WarehouseController.deleteWarehouse);

module.exports = router; 