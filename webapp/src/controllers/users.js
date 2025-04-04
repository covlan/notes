const User = require('../models/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// 配置头像上传存储
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const userId = req.user.id;
    const uploadPath = path.join(process.env.FILE_UPLOAD_PATH, userId.toString(), 'avatar');
    
    // 确保目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    // 使用固定名称，方便替换
    cb(null, 'avatar' + path.extname(file.originalname));
  }
});

// 文件过滤器 - 只允许图片
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片'), false);
  }
};

// 配置multer
exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
}).single('avatar');

// @desc    更新用户个人资料
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { username, email, displayName, phone, bio } = req.body;

    // 检查用户名、邮箱是否重复
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.user.id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已被使用'
        });
      }
    }

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user.id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被使用'
        });
      }
    }

    // 更新用户信息
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        username,
        email,
        displayName,
        phone,
        bio
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    更改密码
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // 检查新密码是否匹配
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的新密码不一致'
      });
    }

    // 获取当前用户（包含密码）
    const user = await User.findById(req.user.id).select('+password');

    // 检查当前密码是否正确
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 设置新密码
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: '密码已更新'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    上传头像
// @route   POST /api/users/avatar
// @access  Private
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传头像图片'
      });
    }

    // 构建头像URL
    const avatarUrl = `/uploads/${req.user.id}/avatar/${req.file.filename}`;

    // 更新用户头像
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      avatarUrl
    });
  } catch (err) {
    next(err);
  }
}; 