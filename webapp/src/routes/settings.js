const express = require('express');
const {
  getUserSettings,
  updateUserSettings,
  getSiteSettings,
  updateSiteSettings,
  uploadSiteLogo,
  getPublicSiteInfo,
  getSecuritySettings,
  updateSecuritySettings
} = require('../controllers/settings');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// 用户设置路由
router.route('/')
  .get(protect, getUserSettings)
  .put(protect, updateUserSettings);

// 站点设置路由 (需要管理员权限)
router.route('/site')
  .get(protect, authorize('admin'), getSiteSettings)
  .put(protect, authorize('admin'), updateSiteSettings);

// 站点Logo上传路由
router.route('/site/logo')
  .post(protect, authorize('admin'), upload.single('siteLogo'), uploadSiteLogo);

// 系统安全设置路由 (需要管理员权限)
router.route('/security')
  .get(protect, authorize('admin'), getSecuritySettings)
  .put(protect, authorize('admin'), updateSecuritySettings);

// 公共站点信息路由 (无需认证)
router.route('/public-info')
  .get(getPublicSiteInfo);

module.exports = router; 