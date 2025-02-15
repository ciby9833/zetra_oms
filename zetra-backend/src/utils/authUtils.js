const crypto = require('crypto');
const Logger = require('./logger');

class AuthUtils {
  static verifySignature(req) {
    try {
      const apiKey = req.headers['x-api-key'];
      const signature = req.headers['x-signature'];
      const timestamp = req.headers['x-timestamp'];

      // 构建签名字符串
      let data = '';
      if (req.method === 'POST' && req.body.Xzetra) {
        data = req.body.Xzetra + apiKey;
      } else if (req.method === 'GET' && req.query) {
        data = JSON.stringify(req.query) + apiKey;
      }

      // 计算签名
      const calculatedSignature = Buffer.from(data).toString('base64');

      Logger.info('签名字符串', data);
      Logger.info('生成的签名', calculatedSignature);
      Logger.info('签名对比', {
        received: signature,
        calculated: calculatedSignature
      });

      return {
        isValid: signature === calculatedSignature,
        error: signature === calculatedSignature ? null : '签名验证失败'
      };
    } catch (error) {
      Logger.error('验证签名时发生错误', error);
      return {
        isValid: false,
        error: '签名验证失败'
      };
    }
  }
}

module.exports = AuthUtils; 