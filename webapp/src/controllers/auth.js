const crypto = require('crypto');
const User = require('../models/User');
const UserSetting = require('../models/UserSetting');

// @desc    注册用户
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // 检查密码是否匹配
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的密码不一致'
      });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: '用户名已被使用'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: '邮箱已被使用'
      });
    }

    // 创建用户
    const user = await User.create({
      username,
      email,
      password
    });

    // 为新用户创建默认设置
    await UserSetting.create({
      userId: user._id
    });

    // 发送JWT令牌
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    用户登录
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, password, remember } = req.body;

    // 检查是否提供了用户名和密码
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名和密码'
      });
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 检查密码是否匹配
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 发送JWT令牌
    sendTokenResponse(user, 200, res, remember);
  } catch (err) {
    next(err);
  }
};

// @desc    用户登出
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: '已成功登出'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    获取当前用户信息
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    忘记密码
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '该邮箱未注册'
      });
    }

    // 获取重置令牌
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // 创建重置URL（前端页面URL）
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 发送邮件的逻辑应放在这里
    // 暂时不实现，只返回重置URL用于测试
    console.log('重置密码URL:', resetUrl);

    res.status(200).json({
      success: true,
      message: '密码重置邮件已发送',
      resetUrl // 在实际应用中不应该返回此字段
    });
  } catch (err) {
    next(err);
  }
};

// @desc    重置密码
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // 检查密码是否匹配
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: '两次输入的密码不一致'
      });
    }

    // 获取哈希后的令牌
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 查找有效的令牌
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或已过期的令牌'
      });
    }

    // 设置新密码
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: '密码重置成功'
    });
  } catch (err) {
    next(err);
  }
};

// 发送JWT令牌响应
const sendTokenResponse = (user, statusCode, res, remember = false) => {
  // 创建令牌
  const token = user.getSignedJwtToken();

  // 创建cookie选项
  const options = {
    expires: new Date(
      Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // 在生产环境中使用secure选项
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).json({
    success: true,
    message: statusCode === 201 ? '注册成功' : '登录成功',
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    },
    token
  });
}; 