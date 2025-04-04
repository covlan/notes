const express = require('express');
const {
  createTag,
  getTags,
  updateTag,
  deleteTag
} = require('../controllers/tags');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 标签路由
router.route('/')
  .get(getTags)
  .post(createTag);

router.route('/:id')
  .put(updateTag)
  .delete(deleteTag);

module.exports = router; 