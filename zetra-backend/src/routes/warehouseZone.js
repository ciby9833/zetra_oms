const express = require('express');
const router = express.Router();
const WarehouseZoneController = require('../controllers/warehouseZoneController');
const { checkPermission } = require('../middleware/permission');
const uploadMiddleware = require('../middleware/uploadMiddleware');

// 获取货区列表 - 所有用户可查看
router.get('/', WarehouseZoneController.getZones);

// 导入相关路由
router.get('/download-template', checkPermission('warehouse.zone.import'), 
  WarehouseZoneController.downloadTemplate);

router.post('/import', 
  checkPermission('warehouse.zone.import'),
  uploadMiddleware,
  WarehouseZoneController.importData
);

// 修改下载错误报告的路由
router.get('/error-reports/:filename', 
  checkPermission('warehouse.zone.import'),
  WarehouseZoneController.downloadErrorReport
);

// 创建货区
router.post('/', checkPermission('warehouse.zone.add'), WarehouseZoneController.createZone);

// 更新货区
router.put('/:id', checkPermission('warehouse.zone.edit'), WarehouseZoneController.updateZone);

// 删除货区
router.delete('/:id', checkPermission('warehouse.zone.delete'), WarehouseZoneController.deleteZone);

// 更新货区状态
router.patch('/:id/status', checkPermission('warehouse.zone.edit'), WarehouseZoneController.updateStatus);

// 获取单个货区
router.get('/:id', checkPermission('warehouse.zone.view'), WarehouseZoneController.getZone);

module.exports = router; 