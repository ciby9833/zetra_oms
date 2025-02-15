const Logger = require('../utils/logger');
const SessionUtils = require('../utils/sessionUtils');

async function sessionMiddleware(req, res, next) {
  try {
    // 如果已经登录，刷新会话
    if (req.session.userId) {
      await SessionUtils.updateSession(req.sessionID, {
        lastActivity: Date.now()
      });
    }
    next();
  } catch (error) {
    Logger.error('会话中间件错误', error);
    next(error);
  }
}

module.exports = sessionMiddleware; 