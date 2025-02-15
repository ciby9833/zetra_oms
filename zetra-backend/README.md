# Zetra Backend

## 项目设置

### 1. 安装依赖
```bash
npm install
### 2. 运行开发服务器
npm run dev

### 3. 启动项目
npm start
```
### 4. 项目停止
npm stop

项目结构
zetra-backend/
├── src/
│ ├── config/ # 配置文件
│ ├── controllers/ # 控制器
│ ├── models/ # 数据模型
│ ├── routes/ # 路由
│ ├── utils/ # 工具函数
│ └── app.js # 主应用文件
├── .env # 环境变量
└── package.json # 项目配置

login测试
# 安装依赖
npm install axios --save-dev

# 运行测试
node test/login-test.js



  "Xzetra": 
    "username": "testuser",
    "password": "Password123",
    "email": "test@example.com",
    "account_type": "child",        // 可选，默认为 "master"
    "parent_user_id": 123,          // 如果是子账号，则必填
    "phone_number": "13800138000",
    "full_name": "Test User",
    "address": "Test Address",
    "country_region": "China",
    "avatar": "https://example.com/avatar.jpg",
    "preferences": 
      "language": "zh-CN",
      "timezone": "Asia/Shanghai",
      "notifications": 
        "email": true,
        "sms": false




--------物料导入相关

1. **前端**  
   - 在上传组件中将 `name` 属性修改为 `"file"` 以与后端上传中间件一致  
   - 在上传前检查 token 是否存在，并在上传时附带 Authorization 头  
   - 自定义上传函数将文件（直接使用 `option.file`）放入 FormData 后提交

2. **后端**  
   - 新增文件上传中间件 `materialUploadMiddleware.js`（基于 multer），设置上传目录、过滤 Excel 文件、限制文件大小，并要求字段名称为 `"file"`  
   - 控制器中 `importMaterials` 接口调用服务层（`MaterialImportService.js`）进行 Excel 文件的解析和数据导入，完成后清理临时上传的文件

---

## 1. 前端修改：MaterialImportDialog.vue

对文件 `zetra-front/src/components/material/dialog/MaterialImportDialog.vue` 做如下修改：

- 修改 `<el-upload>` 组件的 `name` 属性为 `"file"`  
- 在 `handleUpload` 函数中，增加 token 的存在判断  
- 自定义上传函数中直接使用 `option.file`（与后端中间件字段一致）


## 2. 后端修改

### 2.1 新增【文件上传中间件】  
创建或修改文件 `zetra-backend/src/middleware/materialUploadMiddleware.js`（基于 multer），配置上传目录、文件过滤和大小限制，并确保字段名称为 `"file"`。


### 2.2 修改【物料导入控制器】

在文件 `zetra-backend/src/controllers/materialController.js` 中，导入接口已调用服务层（`MaterialImportService`），确保上传中间件在路由中使用。你已有部分修改内容如下（供参考）：



### 2.3 新增【物料导入服务层】

创建文件 `zetra-backend/src/services/MaterialImportService.js`，完整内容如下：


---

## 整体流程检查

- **前端**：上传组件名称为 `"file"` 且验证 token 存在；上传时把选中的文件包装到 FormData 中提交，并附带 `Authorization` 请求头。  
- **后端**：上传中间件 `materialUploadMiddleware.js` 根据字段 `"file"` 拦截上传文件，并保存到 `uploads/materials` 目录；控制器中调用服务层 `MaterialImportService` 解析 Excel 文件、批量入库，并在结束后删除临时文件。  

按以上整合修改后，整个物料导入功能即符合统计要求，也便于未来扩展与维护。

