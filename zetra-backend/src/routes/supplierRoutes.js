const express = require('express');
const SupplierController = require('../controllers/supplierController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

// 创建供应商 (POST /api/suppliers)
router.post('/', SupplierController.createSupplier);

// 查询供应商列表 (GET /api/suppliers)
router.get(['/', '/'], SupplierController.getSuppliers);

// 获取供应商详情 (GET /api/suppliers/:supplierId)
// 仅匹配数字 ID
router.get('/:supplierId(\\d+)', SupplierController.getSupplier);

// 更新供应商 (PUT /api/suppliers/:supplierId)
router.put('/:supplierId', SupplierController.updateSupplier);

// 删除供应商 (DELETE /api/suppliers/:supplierId)
router.delete('/:supplierId', SupplierController.deleteSupplier);

// 导入供应商数据（文件上传，字段名为 file）
router.post('/import', upload.single('file'), SupplierController.importSuppliers);

// 导出供应商数据
router.get('/export', SupplierController.exportSuppliers);

module.exports = router; 