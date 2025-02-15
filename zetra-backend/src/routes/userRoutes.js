const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const SubUserController = require('../controllers/subUserController');
const PermissionController = require('../controllers/permissionController');
const { authenticateToken } = require('../middleware/authMiddleware');

// 公开路由 - 不需要认证
router.post('/login', UserController.login);
router.post('/register', UserController.register);
router.get('/captcha', UserController.getCaptcha);
router.post('/refresh-token', UserController.refreshToken);

// 需要认证的路由
router.use(authenticateToken);

// 用户基本功能路由
router.post('/change-password', UserController.changePassword);
router.post('/logout', UserController.logout);
router.get('/validate-token', UserController.validateToken);

// 子用户管理路由
router.get('/sub-users', SubUserController.getSubUsers);
router.post('/sub-users', SubUserController.createSubUser);
router.put('/sub-users/:userId/status', SubUserController.updateSubUserStatus);
router.delete('/sub-users/:userId', SubUserController.deleteSubUser);
router.put('/sub-users/:userId', SubUserController.updateSubUser);

// 权限管理路由
router.get('/permissions/:userId', PermissionController.getUserPermissions);
router.post('/permissions/assign', PermissionController.assignPermissions);

module.exports = router; 