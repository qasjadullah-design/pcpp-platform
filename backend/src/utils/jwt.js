const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user.id);
  res.status(statusCode).json({ success: true, token, user });
};

module.exports = { generateToken, sendTokenResponse };
