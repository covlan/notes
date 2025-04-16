const express = require('express');
const {
  getBackupSettings,
  updateBackupSettings,
  createBackup,
  restoreBackup
} = require('../controllers/backup');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// 所有路由都需要认证和管理员权限
router.use(protect);
router.use(authorize('admin'));

// 备份设置路由
router.route('/settings')
  .get(getBackupSettings)
  .put(updateBackupSettings);

// 创建备份路由
router.route('/create')
  .post(createBackup);

// 恢复备份路由
router.route('/restore')
  .post(upload.single('backupFile'), restoreBackup);

module.exports = router;
