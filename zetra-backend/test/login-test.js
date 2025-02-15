const axios = require('axios');
const crypto = require('crypto');
const readline = require('readline');

const API_KEY = 'admin_key';
const SECRET_KEY = 'e2cc8b2029cdc3f07cf6bec47361fe9f2222eec8f52987764f6250604d76330d';
const BASE_URL = 'http://127.0.0.1:3000/api';

// 创建 axios 实例
const axiosInstance = axios.create({
  withCredentials: true,
  baseURL: BASE_URL,
  headers: {
    Cookie: ''
  }
});

// 统一的签名生成函数
function generateSignature(params, secretKey) {
  // 使用 URLSearchParams 生成查询字符串
  const paramString = new URLSearchParams({
    Xzetra: JSON.stringify(params.Xzetra)
  }).toString();
  
  // 与密钥拼接
  const signString = paramString + secretKey;
  console.log('签名字符串:', signString);
  
  // MD5 哈希
  const md5Hash = crypto.createHash('md5')
    .update(signString)
    .digest('hex');
  
  // Base64 编码并转大写
  const signature = Buffer.from(md5Hash).toString('base64').toUpperCase();
  console.log('生成的签名:', signature);
  
  return signature;
}

// 获取用户输入
function getUserInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// 测试获取验证码
async function testGetCaptcha(email) {
  try {
    console.log('\n1. 获取验证码');
    
    // 调用验证码接口
    const response = await axiosInstance({
      method: 'get',
      url: `/users/captcha`,
      params: { email }
    });

    // 保存 session cookie
    if (response.headers['set-cookie']) {
      const sessionCookie = response.headers['set-cookie'][0];
      axiosInstance.defaults.headers.Cookie = sessionCookie;
      console.log('Session Cookie:', sessionCookie);
    }

    // 获取验证码文本（仅开发环境）
    const captchaResponse = await axiosInstance({
      method: 'get',
      url: `/users/captcha/text`,
      params: { email }
    });

    if (captchaResponse.data && captchaResponse.data.captcha) {
      console.log('\n======================');
      console.log('验证码:', captchaResponse.data.captcha);
      console.log('======================\n');
      return true;
    }

    throw new Error('获取验证码文本失败');
  } catch (error) {
    console.error('验证码获取失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试登录
async function testLogin(email, password, captcha) {
  try {
    console.log('\n2. 测试登录');
    
    // 准备登录数据
    const loginData = { email, password, captcha };
    
    // 准备请求参数
    const params = {
      Xzetra: loginData
    };

    // 生成签名
    const timestamp = Date.now().toString();
    const signature = generateSignature(params, SECRET_KEY);

    // 设置请求头
    const headers = {
      'x-timestamp': timestamp,
      'x-api-key': API_KEY,
      'x-signature': signature
    };

    // 准备请求体
    const requestParams = {
      Xzetra: JSON.stringify(loginData)
    };

    console.log('请求参数:', requestParams);
    console.log('Headers:', headers);

    // 发送登录请求
    const response = await axiosInstance({
      method: 'post',
      url: `/users/login`,
      headers: headers,
      data: new URLSearchParams(requestParams)
    });

    console.log('\n登录响应:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    return true;
  } catch (error) {
    console.error('\n登录失败:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    return false;
  }
}

// 运行测试
async function runTests() {
  console.log('开始登录测试流程...\n');

  const testEmail = 'testadmin1@example.com';
  const testPassword = 'SecurePass123';

  // 1. 获取验证码
  const captchaSuccess = await testGetCaptcha(testEmail);
  if (!captchaSuccess) {
    console.log('验证码获取失败，终止测试');
    return;
  }

  // 2. 等待用户输入验证码
  const captcha = await getUserInput('请输入验证码: ');

  // 3. 测试登录
  await testLogin(testEmail, testPassword, captcha);
}

// 执行测试
runTests().catch(console.error); 