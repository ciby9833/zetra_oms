const express = require('express');
const router = express.Router();
const AdministrativeDivisionController = require('../controllers/administrativeDivisionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// 获取省份列表
router.get('/provinces', AdministrativeDivisionController.getProvinces);

// 获取城市列表
router.get('/cities/:provinceCode', AdministrativeDivisionController.getCities);

// 获取区县列表
router.get('/districts/:provinceCode/:cityCode', AdministrativeDivisionController.getDistricts);

// 获取乡镇列表
router.get('/townships/:provinceCode/:cityCode/:districtCode', AdministrativeDivisionController.getTownships);

module.exports = router; 