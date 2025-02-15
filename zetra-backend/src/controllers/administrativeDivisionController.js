const AdministrativeDivisionModel = require('../models/administrativeDivisionModel');
const Logger = require('../utils/logger');

class AdministrativeDivisionController {
  // 获取省份列表
  static async getProvinces(req, res) {
    try {
      Logger.info('开始获取省份列表');
      const provinces = await AdministrativeDivisionModel.getProvinces();
      Logger.info('获取到的省份数据:', provinces);
      res.json({
        success: true,
        data: provinces
      });
    } catch (error) {
      Logger.error('获取省份列表失败', error);
      res.status(500).json({
        success: false,
        message: '获取省份列表失败'
      });
    }
  }

  // 获取城市列表
  static async getCities(req, res) {
    try {
      const { provinceCode } = req.params;
      const cities = await AdministrativeDivisionModel.getCities(provinceCode);
      res.json({
        success: true,
        data: cities
      });
    } catch (error) {
      Logger.error('获取城市列表失败', error);
      res.status(500).json({
        success: false,
        message: '获取城市列表失败'
      });
    }
  }

  // 获取区县列表
  static async getDistricts(req, res) {
    try {
      const { provinceCode, cityCode } = req.params;
      const districts = await AdministrativeDivisionModel.getDistricts(provinceCode, cityCode);
      res.json({
        success: true,
        data: districts
      });
    } catch (error) {
      Logger.error('获取区县列表失败', error);
      res.status(500).json({
        success: false,
        message: '获取区县列表失败'
      });
    }
  }

  // 获取乡镇列表
  static async getTownships(req, res) {
    try {
      const { provinceCode, cityCode, districtCode } = req.params;
      const townships = await AdministrativeDivisionModel.getTownships(
        provinceCode,
        cityCode,
        districtCode
      );
      res.json({
        success: true,
        data: townships
      });
    } catch (error) {
      Logger.error('获取乡镇列表失败', error);
      res.status(500).json({
        success: false,
        message: '获取乡镇列表失败'
      });
    }
  }
}

module.exports = AdministrativeDivisionController; 