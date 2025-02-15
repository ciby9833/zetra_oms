const { checkPermission } = require('../middleware/permission');

router.get('/materials', 
  checkPermission('material.view'), 
  MaterialController.getMaterials
);

router.post('/materials',
  checkPermission('material.add'),
  MaterialController.createMaterial
);

router.put('/materials/:id',
  checkPermission('material.edit'),
  MaterialController.updateMaterial
);

router.delete('/materials/:id',
  checkPermission('material.delete'),
  MaterialController.deleteMaterial
); 

router.post(
  '/import',
  checkPermission('material.import'),  // 如系统需要做权限校验
  materialUploadMiddleware,            // 处理文件上传
  MaterialController.importMaterials   // 控制器中处理导入逻辑
);