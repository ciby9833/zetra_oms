const ExcelJS = require('exceljs');
const db = require('../config/database');
const Logger = require('../utils/logger');

class MaterialImportService {
  /**
   * 解析 Excel 文件并批量导入物料数据
   * @param {string} filePath 上传文件的存储路径
   * @param {number} ownerId 当前用户的所属ID
   * @returns {Promise<Array>} 返回每一行的导入结果，格式如：[{row: 2, success: true}, {row: 3, success: false, error: 'xxx'}]
   */
  static async importFile(filePath, ownerId) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    const results = [];

    if (!worksheet) {
      throw new Error('Excel文件无内容或格式不正确');
    }

    // 标准表头映射
    const expectedHeaders = {
      '物料编码*': 'material_code',
      '物料名称*': 'material_name',
      '物料分类*': 'category_name',
      '基本单位*': 'unit_name',
      '规格型号': 'specifications',
      '保质期(天)': 'shelf_life',
      '批次管理(是/否)': 'batch_control',
      '序列号管理(是/否)': 'serial_control',
      '存储条件': 'storage_conditions',
      '出库要求': 'retrieval_conditions'
    };

    // 解析表头列索引
    const columnMapping = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const headerText = cell.value ? cell.value.toString().trim() : '';
      if (expectedHeaders[headerText]) {
        columnMapping[expectedHeaders[headerText]] = colNumber;
      }
    });

    // 确保所有必填字段都存在
    const requiredFields = ['material_code', 'material_name', 'category_name', 'unit_name'];
    for (const field of requiredFields) {
      if (!columnMapping[field]) {
        throw new Error(`Excel模板缺少必填字段: ${Object.keys(expectedHeaders).find(key => expectedHeaders[key] === field)}`);
      }
    }

    // 获取数据库连接并开启事务
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 获取分类ID和单位ID映射
      const [categories] = await connection.query('SELECT category_id, category_name FROM user_management.material_categories WHERE owner_id = ?', [ownerId]);
      const [units] = await connection.query('SELECT unit_id, unit_name FROM user_management.material_units WHERE owner_id = ?', [ownerId]);

      const categoryMap = new Map(categories.map(c => [c.category_name, c.category_id]));
      const unitMap = new Map(units.map(u => [u.unit_name, u.unit_id]));

      const insertValues = [];

      // 遍历数据行
      for (let i = 2; i <= worksheet.actualRowCount; i++) {
        const row = worksheet.getRow(i);
        try {
          const materialCode = row.getCell(columnMapping.material_code).text.trim();
          const materialName = row.getCell(columnMapping.material_name).text.trim();
          const categoryName = row.getCell(columnMapping.category_name).text.trim();
          const unitName = row.getCell(columnMapping.unit_name).text.trim();
          const specifications = row.getCell(columnMapping.specifications)?.text.trim() || null;
          const shelfLife = parseInt(row.getCell(columnMapping.shelf_life)?.text) || null;
          const batchControl = row.getCell(columnMapping.batch_control)?.text.trim() === '是' ? 1 : 0;
          const serialControl = row.getCell(columnMapping.serial_control)?.text.trim() === '是' ? 1 : 0;
          const storageConditions = row.getCell(columnMapping.storage_conditions)?.text.trim() || null;
          const retrievalConditions = row.getCell(columnMapping.retrieval_conditions)?.text.trim() || null;

          // 校验必填项
          if (!materialCode || !materialName || !categoryName || !unitName) {
            throw new Error('物料编码、名称、分类、基本单位为必填项');
          }

          // 分类ID转换
          let categoryId = categoryMap.get(categoryName);
          if (!categoryId) {
            // 尝试归一化比较：转换为小写，去掉前后空格和重音符号
            const normalizeStr = str => 
              str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            const normalizedCategoryName = normalizeStr(categoryName);
            for (const [key, value] of categoryMap) {
              if (normalizeStr(key) === normalizedCategoryName) {
                categoryId = value;
                break;
              }
            }
          }
          if (!categoryId) {
            throw new Error(`物料分类 "${categoryName}" 不存在`);
          }

          // 单位ID转换
          const unitId = unitMap.get(unitName);
          if (!unitId) {
            throw new Error(`基本单位 "${unitName}" 不存在`);
          }

          // 检查物料编码是否已存在
          const [existing] = await connection.query('SELECT material_id FROM user_management.materials WHERE material_code = ? AND owner_id = ?', [materialCode, ownerId]);
          if (existing.length > 0) {
            throw new Error(`物料编码 ${materialCode} 已存在`);
          }

          // 插入数据
          insertValues.push([
            materialCode, materialName, categoryId, unitId, specifications,
            shelfLife, batchControl, serialControl, storageConditions, retrievalConditions, ownerId
          ]);

          results.push({ row: i, success: true });
        } catch (rowError) {
          Logger.error(`导入第 ${i} 行失败:`, rowError);
          results.push({ row: i, success: false, error: rowError.message });
        }
      }

      // 完成所有行处理后，检查是否存在失败项
      const errors = results.filter(item => !item.success);
      if (errors.length > 0) {
        await connection.rollback();
        Logger.warn('导入验证失败:', { errors });
        // 构造错误信息数组，每一项为：第 x 行: xxx
        const errorMessages = errors.map(item => `第 ${item.row} 行: ${item.error || '处理失败'}`);
        // 抛出错误时将错误信息通过 JSON 字符串传递
        throw new Error(JSON.stringify({ errors: errorMessages }));
      }

      // 批量插入数据
      if (insertValues.length > 0) {
        const insertSql = `          INSERT INTO user_management.materials (
            material_code, material_name, category_id, unit, specifications, 
            shelf_life, batch_control, serial_control, storage_conditions, 
            retrieval_conditions, owner_id, created_by
          ) VALUES ?
        `;
        // 为每条插入数据添加 created_by 字段（此处假设创建者就是 ownerId）
        const insertValuesWithCreatedBy = insertValues.map(row => [...row, ownerId]);
        await connection.query(insertSql, [insertValuesWithCreatedBy]);
      }

      await connection.commit();
      return results;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = MaterialImportService;
