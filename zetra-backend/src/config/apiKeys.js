const apiKeys = new Map([
  ['zetra_keyadmin', {                          // 这是API密钥的名称
    secret: '5d4da3195a64df85721f735625fcbcca0481150d2469aec17ab8c45106f08a9f',             // 这是API密钥的值
    permissions: ['user.register']              // 这是API密钥的权限
  }],
  ['admin_key', {
    secret: 'e2cc8b2029cdc3f07cf6bec47361fe9f2222eec8f52987764f6250604d76330d',
    permissions: ['user.register', 'user.login', 'data.read']
  }]
]);

module.exports = apiKeys; 