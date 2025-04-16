const express = require('express');
const {
  updateProfile,
  changePassword,
  uploadAvatar,
  upload
} = require('../controllers/users');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 更新个人资料
router.put('/profile', updateProfile);

// 更改密码
router.put('/change-password', changePassword);

// 上传头像
router.post('/avatar', upload, uploadAvatar);

module.exports = router; 