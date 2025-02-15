const db = require('../config/database');
const Logger = require('../utils/logger');

class AdministrativeDivisionModel {
  // 获取省份列表
  static async getProvinces() {
    try {
      const [rows] = await db.query(`
        SELECT DISTINCT province_code, province_name 
        FROM user_management.administrative_divisions 
        WHERE country_code = 'ID'
        ORDER BY province_code
      `);
      return rows;
    } catch (error) {
      Logger.error('获取省份列表失败:', error);
      throw error;
    }
  }

  // 获取城市列表
  static async getCities(provinceCode) {
    try {
      const [rows] = await db.query(`
        SELECT DISTINCT city_code, city_name 
        FROM user_management.administrative_divisions 
        WHERE country_code = 'ID'
        AND province_code = ?
        ORDER BY city_code
      `, [provinceCode]);
      return rows;
    } catch (error) {
      Logger.error('获取城市列表失败:', error);
      throw error;
    }
  }

  // 获取区县列表
  static async getDistricts(provinceCode, cityCode) {
    try {
      const [rows] = await db.query(`
        SELECT DISTINCT district_code, district_name 
        FROM user_management.administrative_divisions 
        WHERE country_code = 'ID'
        AND province_code = ?
        AND city_code = ?
        ORDER BY district_code
      `, [provinceCode, cityCode]);
      return rows;
    } catch (error) {
      Logger.error('获取区县列表失败:', error);
      throw error;
    }
  }

  // 获取乡镇列表
  static async getTownships(provinceCode, cityCode, districtCode) {
    try {
      const [rows] = await db.query(`
        SELECT DISTINCT township_code, township_name 
        FROM user_management.administrative_divisions 
        WHERE country_code = 'ID'
        AND province_code = ?
        AND city_code = ?
        AND district_code = ?
        ORDER BY township_code
      `, [provinceCode, cityCode, districtCode]);
      return rows;
    } catch (error) {
      Logger.error('获取乡镇列表失败:', error);
      throw error;
    }
  }
}

module.exports = AdministrativeDivisionModel; 