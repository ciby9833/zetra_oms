const UserModel = require('../models/userModel');
const Logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { redis } = require('../config/redis');
const svgCaptcha = require('svg-captcha');

class UserController {
  // 登录
  static async login(req, res) {
    try {
      Logger.info('登录请求数据:', req.body);
      const { email, password, captcha } = JSON.parse(req.body.Xzetra);
      
      // 验证验证码
      const storedCaptcha = await redis.get(`captcha_${email}`);
      Logger.info('验证码比对:', { input: captcha, stored: storedCaptcha });
      
      if (!storedCaptcha || storedCaptcha.toLowerCase() !== captcha.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: '验证码错误'
        });
      }

      // 验证用户名和密码
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: '密码错误'
        });
      }

      // 检查是否已经有其他设备登录
      const existingToken = await redis.get(`user_token:${user.user_id}`);
      if (existingToken) {
        // 发送强制下线消息
        await redis.publish('user_logout', JSON.stringify({
          userId: user.user_id,
          reason: 'new_login',
          timestamp: Date.now()
        }));
        
        // 等待消息发送完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 删除旧的 token
        await redis.del(`user_token:${user.user_id}`);
        Logger.info('强制下线其他设备', { userId: user.user_id });
      }

      // 生成新的 token
      const token = jwt.sign(
        { 
          userId: user.user_id,
          email: user.email,
          accountType: user.account_type,
          userRole: user.user_role,
          timestamp: Date.now()
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // 保存新 token 到 Redis
      await redis.set(`user_token:${user.user_id}`, token, 'EX', 7 * 24 * 60 * 60);
      
      // 更新最后登录时间
      await UserModel.updateLastLoginTime(user.user_id);

      // 获取用户权限
      let permissions = [];
      try {
        permissions = await UserModel.getUserPermissions(user.user_id);
      } catch (error) {
        Logger.warn('获取用户权限失败，使用默认权限:', error);
        // 使用基于角色的默认权限
        if (user.user_role === 'admin') {
          permissions = ['material.view', 'material.add', 'material.edit', 'material.delete'];
        }
      }

      Logger.info('登录成功', { userId: user.user_id });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          user: {
            userId: user.user_id,
            username: user.username,
            email: user.email,
            accountType: user.account_type,
            userRole: user.user_role,
            employeeNumber: user.employee_number
          },
          permissions
        }
      });
    } catch (error) {
      Logger.error('登录失败', error);
      res.status(500).json({
        success: false,
        message: error.message || '登录失败'
      });
    }
  }

  // 获取验证码
  static async getCaptcha(req, res) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: '邮箱参数不能为空'
        });
      }

      // 生成 SVG 验证码
      const captcha = svgCaptcha.create({
        size: 4,          // 验证码长度
        noise: 2,         // 干扰线条数
        width: 120,       // 宽度
        height: 40,       // 高度
        fontSize: 40,     // 字体大小
        color: true,      // 开启彩色
        background: '#f0f0f0'  // 背景色
      });
      
      // 保存到 Redis，设置 5 分钟过期
      const key = `captcha_${email}`;
      await redis.set(key, captcha.text.toLowerCase(), 'EX', 300);
      
      Logger.info('验证码生成成功:', { email, captcha: captcha.text });

      // 返回 SVG 图片
      res.type('svg');
      res.status(200).send(captcha.data);
    } catch (error) {
      Logger.error('生成验证码失败:', error);
      res.status(500).json({
        success: false,
        message: '生成验证码失败'
      });
    }
  }

  // 注册
  static async register(req, res) {
    try {
      const userData = JSON.parse(req.body.Xzetra);
      Logger.info('注册请求:', { ...userData, password: '***' });

      // 基本验证
      if (!userData.username || !userData.password || !userData.email) {
        return res.status(400).json({
          success: false,
          message: '请填写所有必填字段'
        });
      }

      // 检查邮箱是否已存在
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该邮箱已被注册'
        });
      }

      // 检查用户名是否已存在
      const existingUsername = await UserModel.findByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: '该用户名已被使用'
        });
      }

      // 创建用户
      const userId = await UserModel.createUser({
        ...userData,
        account_type: 'master',  // 注册的用户默认为主账户
        user_role: 'admin'       // 默认角色
      });

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: { userId }
      });
    } catch (error) {
      Logger.error('注册失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '注册失败'
      });
    }
  }

  // 获取用户信息
  static async getProfile(req, res) {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: {
          userId: user.user_id,
          username: user.username,
          accountType: user.account_type,
          userRole: user.user_role,
          email: user.email,
          phoneNumber: user.phone_number
        }
      });
    } catch (error) {
      Logger.error('获取用户信息失败', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }

  // 更新用户信息
  static async updateProfile(req, res) {
    try {
      const userData = JSON.parse(req.body.Xzetra);
      const success = await UserModel.updateUser(req.user.userId, userData);
      
      if (success) {
        res.json({
          success: true,
          message: '更新成功'
        });
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      Logger.error('更新用户信息失败', error);
      res.status(500).json({
        success: false,
        message: '更新用户信息失败'
      });
    }
  }

  // 修改密码
  static async changePassword(req, res) {
    try {
      const email = req.user.email;
      const { oldPassword, newPassword } = JSON.parse(req.body.Xzetra);

      // 验证旧密码
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 验证旧密码
      const isValidPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: '原密码错误'
        });
      }

      // 验证新密码格式
      if (newPassword.length < 6 || newPassword.length > 20) {
        return res.status(400).json({
          success: false,
          message: '新密码长度必须在6-20个字符之间'
        });
      }

      // 更新密码
      const success = await UserModel.updatePassword(user.user_id, newPassword);
      if (success) {
        // 修改密码成功后，使当前 token 失效
        await redis.del(`user_token:${user.user_id}`);

        // 发送强制下线消息
        await redis.publish('user_logout', JSON.stringify({
          userId: user.user_id,
          reason: 'password_changed',
          timestamp: Date.now()
        }));

        Logger.info('密码修改成功', { userId: user.user_id });

        res.json({
          success: true,
          message: '密码修改成功，请重新登录'
        });
      } else {
        throw new Error('密码修改失败');
      }
    } catch (error) {
      Logger.error('修改密码失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '修改密码失败'
      });
    }
  }

  // 退出登录
  static async logout(req, res) {
    try {
      const userId = req.user.userId;
      // 删除 Redis 中的 token
      await redis.del(`user_token:${userId}`);
      Logger.info('用户登出成功', { userId });

      res.json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      Logger.error('登出失败', error);
      res.status(500).json({
        success: false,
        message: error.message || '登出失败'
      });
    }
  }

  // 获取用户列表
  static async getUsers(req, res) {
    try {
      const users = await UserModel.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      Logger.error('获取用户列表失败', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      });
    }
  }

  // 获取单个用户
  static async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      Logger.error('获取用户信息失败', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }

  // 创建用户
  static async createUser(req, res) {
    try {
      const userData = JSON.parse(req.body.Xzetra);
      const userId = await UserModel.createUser(userData);
      
      res.status(201).json({
        success: true,
        message: '创建成功',
        data: { userId }
      });
    } catch (error) {
      Logger.error('创建用户失败', error);
      res.status(500).json({
        success: false,
        message: '创建用户失败'
      });
    }
  }

  // 更新用户
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const userData = JSON.parse(req.body.Xzetra);
      const success = await UserModel.updateUser(id, userData);
      
      if (success) {
        res.json({
          success: true,
          message: '更新成功'
        });
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      Logger.error('更新用户失败', error);
      res.status(500).json({
        success: false,
        message: '更新用户失败'
      });
    }
  }

  // 删除用户
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const success = await UserModel.deleteUser(id);
      
      if (success) {
        res.json({
          success: true,
          message: '删除成功'
        });
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      Logger.error('删除用户失败', error);
      res.status(500).json({
        success: false,
        message: '删除用户失败'
      });
    }
  }

  // 检查 token 状态
  static async checkToken(req, res) {
    try {
      const userId = req.user.userId;
      const token = req.headers.authorization?.split(' ')[1];

      // 检查 Redis 中的 token
      const storedToken = await redis.get(`user_token:${userId}`);
      
      if (!storedToken || storedToken !== token) {
        return res.status(401).json({
          success: false,
          message: 'forced_logout'
        });
      }

      res.json({
        success: true,
        message: 'token_valid'
      });
    } catch (error) {
      Logger.error('检查 token 失败', error);
      res.status(500).json({
        success: false,
        message: error.message || '检查 token 失败'
      });
    }
  }

  // 刷新 token
  static async refreshToken(req, res) {
    try {
      const oldToken = req.headers.authorization?.split(' ')[1];
      if (!oldToken) {
        return res.status(401).json({
          success: false,
          message: 'token_invalid'
        });
      }

      // 解析旧 token（即使过期也要尝试解析）
      let decoded;
      try {
        decoded = jwt.verify(oldToken, process.env.JWT_SECRET || 'your-secret-key', {
          ignoreExpiration: true // 忽略过期检查
        });
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'token_invalid'
        });
      }

      // 验证用户
      const user = await UserModel.findByEmail(decoded.email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }

      // 生成新 token
      const newToken = jwt.sign(
        { 
          userId: user.user_id,
          email: user.email,
          accountType: user.account_type,
          userRole: user.user_role,
          timestamp: Date.now()
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // 更新 Redis 中的 token
      await redis.set(`user_token:${user.user_id}`, newToken, 'EX', 7 * 24 * 60 * 60);

      res.json({
        success: true,
        data: {
          token: newToken
        }
      });
    } catch (error) {
      Logger.error('刷新 token 失败:', error);
      res.status(500).json({
        success: false,
        message: '刷新 token 失败'
      });
    }
  }

  // 验证 token
  static async validateToken(req, res) {
    try {
      // token 已经在 authenticateToken 中间件验证过了
      // 如果能到这里，说明 token 是有效的
      return res.json({
        success: true,
        message: 'Token 有效'
      });
    } catch (error) {
      Logger.error('验证token失败:', error);
      return res.status(401).json({
        success: false,
        message: 'token_invalid'
      });
    }
  }
}

module.exports = UserController; 