const express = require('express');
const {
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证和管理员权限
router.use(protect);
router.use(authorize('admin'));

// 系统设置路由
router.route('/settings')
  .get(getSystemSettings)
  .put(updateSystemSettings);

module.exports = router; 