const bcrypt = require('bcryptjs');

const generateSalt = async () => {
  return await bcrypt.genSalt(10);
};

const hashPassword = async (password, salt) => {
  return await bcrypt.hash(password, salt);
};

module.exports = {
  generateSalt,
  hashPassword
}; 