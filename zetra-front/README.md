# Zetra Front

基于 Vue 3 + TypeScript + Vite 的 Zetra 前端项目。
zetra-front/
├── src/
│   ├── api/
│   │   ├── auth.ts          # 认证相关 API
│   │   └── request.ts       # Axios 配置
│   ├── assets/
│   │   └── main.scss    # 全局样式
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.vue  # 登录组件
│   │   │   └── RegisterForm.vue  # 注册组件
│   │   └── common/
│   │       └── Captcha.vue  # 验证码组件
│   ├── router/
│   │   └── index.ts         # 路由配置
│   ├── stores/
│   │   └── auth.ts          # 认证状态管理
│   ├── utils/
│   │   └── signature.ts     # 签名生成工具
│   ├── views/
│   │   ├── LoginView.vue    # 登录视图
│   │   └── RegisterView.vue # 注册视图
│   ├── App.vue            # 主应用组件
│   ├── main.ts            # 入口文件       
└── package.json          # 依赖管理
    env.development      # 开发环境
    env.production       # 生产环境
    env.d.ts            # 类型声明

## 推荐的 IDE 设置

- [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 项目设置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码格式化
npm run format
```

## 环境变量配置

创建 `.env.development` 文件：

```plaintext
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_KEY=zetra_keyadmin
VITE_SECRET_KEY=your_secret_key



前端网页界面布局结构
dashboard-container (fixed 全屏容器)
└── dashboard-layout (el-container 弹性布局)
    ├── dashboard-header (el-header 顶部导航)
    │   └── header-content (flex 两端对齐)
    │       ├── logo (左侧标题)
    │       └── user-info (右侧用户信息)
    │           └── el-dropdown (下拉菜单)
    └── main-container (el-container 主内容区)
        ├── dashboard-aside (el-aside 侧边栏)
        │   └── dashboard-menu (el-menu 导航菜单)
        └── dashboard-main (el-main 路由视图区)
            └── router-view (动态内容)
框架部分
store 来管理表单状态：form.ts   
auth 来管理认证状态：auth.ts
common 来管理公共组件：Captcha.vue
api 来管理 API 请求：request.ts
router 来管理路由：index.ts
utils 来管理工具函数：signature.ts
components 来管理组件：
views 来管理视图：


我来分析前端项目的文档结构和作用：

### 1. 核心目录结构

```
zetra-front/
├── src/
│   ├── api/          # API 接口定义
│   ├── assets/       # 静态资源
│   ├── components/   # 组件
│   ├── composables/  # 组合式函数
│   ├── layouts/      # 布局组件
│   ├── router/       # 路由配置
│   ├── stores/       # 状态管理
│   ├── types/        # TypeScript 类型定义
│   ├── utils/        # 工具函数
│   └── views/        # 页面视图
```

### 2. 各模块分析

#### API 模块 (/api)
- material/目录下分散了多个文件(index.ts, category.ts, unit.ts, conversion.ts)
- **建议优化**: 可以考虑统一到一个文件，或者使用统一的请求处理模式

#### 组件模块 (/components)
- material/common - 通用物料组件
- material/form - 物料表单组件
- auth/ - 认证相关组件
- common/ - 通用组件
- **合理性**: 结构清晰，但common目录可能需要更细致的分类

#### Store 模块 (/stores)
- material/下分散了多个store文件
- auth.ts - 认证状态管理
- form.ts - 表单状态管理
- tabs.ts - 标签页状态管理
- view.ts - 视图状态管理
- **建议优化**: 可以考虑按业务领域整合，减少store数量

#### 视图模块 (/views)
- dashboard/material/ - 物料相关视图
- dashboard/ - 仪表盘视图
- auth/ - 认证相关视图
- **合理性**: 结构合理，但可以考虑更细致的分类

### 3. 不合理的部分

1. **状态管理过度分散**:
   - material相关的store分得过细
   - 可以合并相关的状态管理

2. **API接口分散**:
   - material相关的API接口分散在多个文件
   - 可以统一管理或使用更好的组织方式

3. **类型定义不集中**:
   - 类型定义散布在不同文件中
   - 建议在types目录下统一管理

4. **工具函数碎片化**:
   - utils下的功能可能存在重复
   - 建议整合相似功能

### 4. 建议改进

1. **API层改进**:
   - 实现统一的API请求处理
   - 使用API类封装相关接口

2. **状态管理优化**:
   - 按业务域整合store
   - 减少store之间的依赖

3. **类型定义集中化**:
   - 建立统一的类型定义目录
   - 按模块组织类型定义

4. **组件结构优化**:
   - 建立更清晰的组件分类
   - 提取更多通用组件

5. **工具函数整合**:
   - 合并相似功能
   - 建立统一的工具函数库

组件的作用和关系：
MaterialFormDialog.vue - 对话框组件
用于快速创建/编辑物料的弹窗表单
适用于从物料列表中快速添加或编辑物料
包含基本信息和批次管理两个标签页
使用了 MaterialBaseForm 和 MaterialBatchForm 作为子组件
MaterialBaseForm.vue - 基本信息表单组件
包含物料的基本信息字段（编码、名称、分类等）
被 MaterialFormDialog 和 MaterialFormView 复用
纯表单组件，不包含提交逻辑
MaterialBatchForm.vue - 批次管理表单组件
包含批次和序列号相关的配置字段
被 MaterialFormDialog 和 MaterialFormView 复用
纯表单组件，不包含提交逻辑
MaterialFormView.vue - 完整的表单页面
作为独立的路由页面存在
提供更完整的物料编辑功能
使用了 MaterialBaseForm 和 MaterialBatchForm 作为子组件
包含更多的操作和验证逻辑
它们之间的关系：
MaterialFormDialog.vue (弹窗)
├── MaterialBaseForm.vue
└── MaterialBatchForm.vue

MaterialFormView.vue (页面)
├── MaterialBaseForm.vue
└── MaterialBatchForm.vue


