const File = require('../models/File');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 配置文件存储
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const fileType = req.body.type || 'misc';
    const uploadPath = path.join(process.cwd(), 'files', fileType);
    
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // 生成文件名: 时间戳-原始文件名
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

// 配置multer
exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10000000
  },
  fileFilter: fileFilter
}).single('file');

// @desc    上传文件
// @route   POST /api/files/upload
// @access  Private
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    const { type, noteId } = req.body;

    // 创建文件记录
    const file = await File.create({
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      url: `/uploads/${req.user.id}/${type || 'misc'}/${req.file.filename}`,
      userId: req.user.id,
      noteId: noteId || null
    });

    res.status(201).json({
      success: true,
      file
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取文件列表
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res, next) => {
  try {
    const { type, noteId } = req.query;

    // 构建查询条件
    const query = { userId: req.user.id };
    
    if (type) {
      // 查询文件类型
      query.fileType = new RegExp(type);
    }

    if (noteId) {
      query.noteId = noteId;
    }

    const files = await File.find(query).sort({ uploadedAt: -1 });

    res.status(200).json({
      success: true,
      files
    });
  } catch (err) {
    next(err);
  }
};

// @desc    删除文件
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res, next) => {
  try {
    // 查找文件
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 从磁盘中删除文件
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // 从数据库中删除记录
    await file.remove();

    res.status(200).json({
      success: true,
      message: '文件已删除'
    });
  } catch (err) {
    next(err);
  }
}; 