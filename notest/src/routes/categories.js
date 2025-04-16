const express = require('express');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categories');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 分类路由
router.route('/')
  .get(getCategories)
  .post(createCategory);

router.route('/:id')
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);

module.exports = router; 