const express = require('express');
const router = express.Router();
const MaterialController = require('../controllers/materialController');
const CategoryController = require('../controllers/categoryController');
const UnitController = require('../controllers/unitController');
const ConversionController = require('../controllers/conversionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permission');
const MaterialModel = require('../models/materialModel');
const Logger = require('../utils/logger');
const { validateMaterial } = require('../middleware/validationMiddleware');
const materialUploadMiddleware = require('../middleware/materialUploadMiddleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 所有路由都需要认证
router.use(authenticateToken);

// 物料导入导出路由必须放在 /materials/:id 路由之前
router.get('/materials/export', 
  checkPermission('material.export'),
  MaterialController.exportMaterials
);

router.get('/materials/template', 
  checkPermission('material.import'),
  MaterialController.downloadTemplate
);

const upload = multer({ dest: 'uploads/' });

// 物料导入
router.post(
  '/import',
  checkPermission('material.import'),  // 如系统需要做权限校验
  materialUploadMiddleware,            // 处理文件上传
  MaterialController.importMaterials   // 控制器中处理导入逻辑
);

// 物料基础信息路由
router.get('/materials', checkPermission('material.view'), MaterialController.getMaterials);
router.post('/materials', checkPermission('material.add'), validateMaterial, MaterialController.createMaterial);
router.get('/materials/:id', checkPermission('material.view'), MaterialController.getMaterial);
router.put('/materials/:id', checkPermission('material.edit'), MaterialController.updateMaterial);
router.delete('/materials/:id', checkPermission('material.delete'), MaterialController.deleteMaterial);

// 物料分类路由
router.get('/categories/tree', 
  checkPermission('material.category.view'), 
  CategoryController.getCategoryTree
);

router.get('/categories', 
  checkPermission('material.category.view'), 
  CategoryController.getCategories
);

router.post('/categories', 
  checkPermission('material.category.add'), 
  CategoryController.createCategory
);

router.put('/categories/:id', 
  checkPermission('material.category.edit'), 
  CategoryController.updateCategory
);

router.delete('/categories/:id', 
  checkPermission('material.category.delete'), 
  CategoryController.deleteCategory
);

// 物料单位路由
router.get('/units', 
  checkPermission('material.unit.view'), 
  UnitController.getUnits
);

router.post('/units', 
  checkPermission('material.unit.add'), 
  UnitController.createUnit
);

router.put('/units/:id', 
  checkPermission('material.unit.edit'), 
  UnitController.updateUnit
);

router.delete('/units/:id', 
  checkPermission('material.unit.delete'), 
  UnitController.deleteUnit
);

router.get('/units/:id/usage', 
  checkPermission('material.unit.view'), 
  UnitController.checkUnitUsage
);

// 单位换算路由
router.get('/unit-conversions', 
  checkPermission('material.conversion.view'), 
  ConversionController.getConversions
);

router.post('/unit-conversions', 
  checkPermission('material.conversion.add'), 
  ConversionController.createConversion
);

router.get('/unit-conversions/:id', 
  checkPermission('material.conversion.view'), 
  ConversionController.getConversion
);

router.put('/unit-conversions/:id', 
  checkPermission('material.conversion.edit'), 
  ConversionController.updateConversion
);

router.delete('/unit-conversions/:id', 
  checkPermission('material.conversion.delete'), 
  ConversionController.deleteConversion
);

router.post('/unit-conversions/check-circular', 
  checkPermission('material.conversion.view'), 
  ConversionController.checkCircularConversion
);

router.post('/unit-conversions/validate', 
  checkPermission('material.conversion.view'), 
  ConversionController.validateConversion
);

router.get('/unit-conversions/path', 
  checkPermission('material.conversion.view'), 
  ConversionController.getConversionPath
);

router.get('/materials', 
  checkPermission('material.view'),
  async (req, res) => {
    try {
      const { page = 1, pageSize = 20, ...query } = req.query;
      const userId = req.user.userId;
      
      Logger.info('获取物料列表请求:', { userId, page, pageSize, query });
      
      const result = await MaterialModel.getMaterials({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        ...query,
        owner_id: userId
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      Logger.error('获取物料列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取物料列表失败'
      });
    }
  }
);

module.exports = router; 