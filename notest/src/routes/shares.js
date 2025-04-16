const express = require('express');
const {
  createShare,
  getShares,
  getShare,
  accessShare,
  deleteShare,
  checkShare
} = require('../controllers/shares');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ==== 顺序很重要：先定义特定路由，再定义通用路由 ====

// 公共路由（不需要认证）
// 访问分享
router.post('/access/:shareId', accessShare);

// 获取分享详情（如果是公开的，不需要认证）
router.get('/:id', getShare);

// 需要认证的路由
router.use(protect);

// 检查笔记分享状态 - 使用完全不同的路径前缀，避免与/:id冲突
router.get('/status/:noteId', checkShare);

// 集合路由
router.route('/')
  .get(getShares)
  .post(createShare);

// 删除分享
router.delete('/:id', deleteShare);

module.exports = router; 