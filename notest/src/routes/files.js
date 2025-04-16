const express = require('express');
const {
  uploadFile,
  getFiles,
  deleteFile,
  upload
} = require('../controllers/files');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 文件上传路由
router.post('/upload', upload, uploadFile);

// 获取文件列表
router.get('/', getFiles);

// 删除文件
router.delete('/:id', deleteFile);

module.exports = router; 