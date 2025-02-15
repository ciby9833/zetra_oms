const db = require('../config/database');
const { generateSalt, hashPassword } = require('../utils/passwordUtils');
const Logger = require('../utils/logger');
const bcrypt = require('bcrypt');

class UserModel {
  static async createUser(userData) {
    try {
      Logger.info('创建用户:', userData);
      
      // 生成密码盐值和哈希
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const sql = `
        INSERT INTO user_management.users (
          username,
          password_hash,
          password_salt,
          email,
          phone_number,
          full_name,
          registration_date,
          last_login_time,
          status,
          address,
          country_region,
          avatar,
          preferences,
          user_role,
          account_type,
          parent_user_id,
          employee_number
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          NULL,
          'active',
          NULL, NULL, NULL, NULL,
          'admin',
          'master',
          NULL,
          NULL
        )
      `;

      const values = [
        userData.username,
        hashedPassword,
        salt,
        userData.email,
        userData.phone_number || null,
        userData.full_name || null
      ];

      const [result] = await db.execute(sql, values);
      Logger.info('用户创建成功:', { userId: result.insertId });
      return result.insertId;
    } catch (error) {
      Logger.error('创建用户失败:', error);
      throw error;
    }
  }

  static async validateParentUser(parentUserId) {
    try {
      if (!parentUserId) {
        Logger.warn('validateParentUser: 父用户ID为空');
        return false;
      }

      Logger.info('验证父用户:', parentUserId);

      const sql = `
        SELECT user_id 
        FROM user_management.users 
        WHERE user_id = ? 
        AND account_type = 'master'
        AND status = 'active'
      `;

      const [rows] = await db.execute(sql, [parentUserId]);
      const isValid = rows.length > 0;
      
      if (!isValid) {
        Logger.warn('validateParentUser: 无效的父用户ID:', parentUserId);
      }

      return isValid;
    } catch (error) {
      Logger.error('验证父用户失败:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    const sql = `
      SELECT 
        user_id,
        username,
        email,
        password_hash as password,
        password_salt,
        account_type,
        user_role,
        status,
        employee_number
      FROM user_management.users 
      WHERE email = ? AND status = 'active'
    `;

    try {
      const [rows] = await db.execute(sql, [email]);
      return rows[0] || null;
    } catch (error) {
      Logger.error('查询用户失败', error);
      throw error;
    }
  }

  static async updateLastLoginTime(userId) {
    const sql = `
      UPDATE user_management.users 
      SET last_login_time = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `;

    try {
      await db.execute(sql, [userId]);
    } catch (error) {
      Logger.error('更新登录时间失败', error);
      throw error;
    }
  }

  static async updatePassword(userId, newPassword) {
    try {
      // 生成新的 salt 和 hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // 更新密码和盐值
      const [result] = await db.query(
        'UPDATE user_management.users SET password_hash = ?, password_salt = ? WHERE user_id = ?',
        [hashedPassword, salt, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新密码失败:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    const sql = `
      SELECT user_id, username, email
      FROM user_management.users 
      WHERE username = ?
    `;

    try {
      const [rows] = await db.execute(sql, [username]);
      return rows[0] || null;
    } catch (error) {
      Logger.error('查询用户名失败', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      if (!userId) {
        throw new Error('用户ID不能为空');
      }

      const sql = `
        SELECT * FROM user_management.users 
        WHERE user_id = ?
      `;

      const [rows] = await db.execute(sql, [userId]);
      return rows[0];
    } catch (error) {
      Logger.error('查询用户失败:', error);
      throw error;
    }
  }

  // 检查用户名是否已存在
  static async isUsernameExists(username) {
    try {
      const [rows] = await db.execute(
        'SELECT COUNT(*) as count FROM user_management.users WHERE username = ?',
        [username]
      );
      return rows[0].count > 0;
    } catch (error) {
      Logger.error('检查用户名失败:', error);
      throw error;
    }
  }

  // 修改创建子用户方法
  static async createSubUser(userData, parentUserId) {
    try {
      // 检查用户名是否已存在
      const exists = await this.isUsernameExists(userData.username);
      if (exists) {
        throw new Error('用户名已存在');
      }

      // 生成密码盐值和哈希
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const sql = `
        INSERT INTO user_management.users (
          username,
          password_hash,
          password_salt,
          email,
          full_name,
          registration_date,
          status,
          user_role,
          account_type,
          parent_user_id,
          employee_number
        ) VALUES (
          ?, ?, ?, ?, ?,
          CURRENT_TIMESTAMP,
          'active',
          ?,
          'child',
          ?,
          ?
        )
      `;

      const values = [
        userData.username,
        hashedPassword,
        salt,
        userData.email,
        userData.full_name || null,
        userData.user_role || 'user',
        parentUserId,
        userData.employee_number || null
      ];

      const [result] = await db.execute(sql, values);
      Logger.info('创建子用户成功:', { 
        userId: result.insertId, 
        username: userData.username,
        parentUserId 
      });
      return result.insertId;
    } catch (error) {
      Logger.error('创建子用户失败:', { error: error.message, parentUserId });
      throw error;
    }
  }

  // 查询子用户
  static async findSubUsers(parentUserId) {
    try {
      // 先验证父用户是否是主账户
      const parentSql = `
        SELECT user_id 
        FROM user_management.users 
        WHERE user_id = ? AND account_type = 'master'
      `;
      const [parentRows] = await db.execute(parentSql, [parentUserId]);
      if (parentRows.length === 0) {
        Logger.warn('非主账户尝试查询子用户:', parentUserId);
        return [];
      }

      // 查询子用户列表
      const query = `
        SELECT 
          user_id as userId, 
          username, 
          email, 
          full_name,
          phone_number,
          account_type as accountType, 
          user_role as userRole, 
          employee_number as employeeNumber,
          status, 
          registration_date as createdAt,
          last_login_time as lastLogin
        FROM user_management.users 
        WHERE parent_user_id = ? 
        AND account_type = 'child'
        ORDER BY registration_date DESC
      `;
      
      const [rows] = await db.execute(query, [parentUserId]);
      Logger.info(`查询到 ${rows.length} 个子用户, 父用户ID: ${parentUserId}`);
      return rows;
    } catch (error) {
      Logger.error('查询子用户失败:', error);
      throw error;
    }
  }

  // 查找特定的子用户
  static async findSubUserById(userId, parentUserId) {
    try {
      if (!userId || !parentUserId) {
        throw new Error('用户ID和父用户ID不能为空');
      }

      const sql = `
        SELECT * FROM user_management.users 
        WHERE user_id = ? AND parent_user_id = ? AND account_type = 'child'
      `;

      const [rows] = await db.execute(sql, [userId, parentUserId]);
      return rows[0];
    } catch (error) {
      Logger.error('查询子用户失败:', error);
      throw error;
    }
  }

  static async updateUserStatus(userId, status) {
    try {
      const sql = `
        UPDATE user_management.users 
        SET status = ?
        WHERE user_id = ?
      `;

      const [result] = await db.execute(sql, [status, userId]);
      Logger.info('更新用户状态:', { userId, status, affected: result.affectedRows });
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新用户状态失败:', error);
      throw error;
    }
  }

  // 添加删除用户方法
  static async deleteUser(userId) {
    try {
      const sql = `
        DELETE FROM user_management.users 
        WHERE user_id = ?
      `;

      const [result] = await db.execute(sql, [userId]);
      Logger.info('删除用户:', { userId, affected: result.affectedRows });
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('删除用户失败:', error);
      throw error;
    }
  }

  // 添加更新用户方法
  static async updateUser(userId, userData) {
    try {
      const sql = `
        UPDATE user_management.users 
        SET 
          email = ?,
          full_name = ?,
          phone_number = ?,
          status = ?
        WHERE user_id = ?
      `;

      const values = [
        userData.email,
        userData.full_name || null,
        userData.phone_number || null,
        userData.status || 'active',
        userId
      ];

      const [result] = await db.execute(sql, values);
      Logger.info('更新用户信息:', { userId, affected: result.affectedRows });
      return result.affectedRows > 0;
    } catch (error) {
      Logger.error('更新用户信息失败:', error);
      throw error;
    }
  }

  // 获取用户的主账户ID
  static async getMasterUserId(userId) {
    try {
      const sql = `
        SELECT 
          CASE 
            WHEN account_type = 'master' THEN user_id
            ELSE parent_user_id
          END as master_user_id
        FROM user_management.users 
        WHERE user_id = ?
      `;

      const [rows] = await db.execute(sql, [userId]);
      if (!rows.length) {
        throw new Error('用户不存在');
      }
      return rows[0].master_user_id;
    } catch (error) {
      Logger.error('获取主账户ID失败:', error);
      throw error;
    }
  }

  // 修改获取权限方法
  static async getUserPermissions(userId) {
    try {
      // 先获取用户信息
      const [userRows] = await db.query(`
        SELECT user_id, user_role, parent_user_id 
        FROM user_management.users 
        WHERE user_id = ?
      `, [userId]);

      if (!userRows.length) {
        throw new Error('用户不存在');
      }

      // 超级管理员拥有所有权限
      if (userRows[0].user_role === 'super_admin') {
        const [allPermissions] = await db.query(`
          SELECT permission_code 
          FROM user_management.permissions
        `);
        return allPermissions.map(p => p.permission_code);
      }

      // 查询用户具体权限
      const [permRows] = await db.query(`
        SELECT p.permission_code
        FROM user_management.permissions p
        JOIN user_management.user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = ?
      `, [userId]);

      return permRows.map(p => p.permission_code);
    } catch (error) {
      Logger.error('获取用户权限失败:', error);
      throw error;
    }
  }

  // 添加权限管理方法
  static async assignPermissions(userId, permissionCodes, createdBy) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 获取权限IDs
      const [permissions] = await conn.query(`
        SELECT id FROM user_management.permissions 
        WHERE permission_code IN (?)
      `, [permissionCodes]);

      // 删除现有权限
      await conn.query(`
        DELETE FROM user_management.user_permissions 
        WHERE user_id = ?
      `, [userId]);

      // 添加新权限
      if (permissions.length > 0) {
        await conn.query(`
          INSERT INTO user_management.user_permissions (user_id, permission_id, created_by)
          VALUES ${permissions.map(() => '(?, ?, ?)').join(',')}
        `, permissions.flatMap(p => [userId, p.id, createdBy]));
      }

      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      Logger.error('分配权限失败:', error);
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = UserModel; 