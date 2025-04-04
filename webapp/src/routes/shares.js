const express = require('express');
const {
  createShare,
  getShares,
  getShare,
  accessShare,
  deleteShare
} = require('../controllers/shares');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 访问分享（不需要认证）
router.post('/access/:shareId', accessShare);

// 获取分享详情（如果是公开的，不需要认证）
router.get('/:id', getShare);

// 其他路由需要认证
router.use(protect);

router.route('/')
  .get(getShares)
  .post(createShare);

router.route('/:id')
  .delete(deleteShare);

module.exports = router; 