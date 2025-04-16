const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  refreshToken
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const {
  checkRegistrationAllowed, 
  validatePassword,
  setSessionLifetime
} = require('../middleware/security');

const router = express.Router();

// 注册和登录路由
router.post('/register', checkRegistrationAllowed, validatePassword, register);
router.post('/login', setSessionLifetime, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validatePassword, resetPassword);
router.post('/refresh-token', refreshToken);

module.exports = router; 