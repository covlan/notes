const crypto = require('crypto');
const User = require('../models/User');
const UserSetting = require('../models/UserSetting');
const jwt = require('jsonwebtoken');
const SystemSetting = require('../models/SystemSetting');
const bcrypt = require('bcryptjs');

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

    // 检查系统中是否已有用户，如果没有则将第一个注册用户设为管理员
    const totalUsers = await User.countDocuments({});
    const userRole = totalUsers === 0 ? 'admin' : 'user';

    // 创建用户，根据是否是第一个用户决定角色
    const user = await User.create({
      username,
      email,
      password,
      displayName: username, // 默认使用用户名作为显示名称
      role: userRole, // 第一个用户为管理员，其他为普通用户
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
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

    try {
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


      // 检查账户是否被锁定
      if (user.isLocked && typeof user.isLocked === 'function' && user.isLocked()) {
        const remainingTime = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60)); // 剩余分钟数
        return res.status(403).json({
          success: false,
          message: `账户已被临时锁定，请在${remainingTime}分钟后重试`,
          lockUntil: user.lockUntil
        });
      }

      // 常规登录流程
      let isMatch = false;
      
      try {
        // 正常密码匹配
        isMatch = await user.matchPassword(password);
      } catch (matchError) {
        return res.status(500).json({
          success: false,
          message: '密码验证失败',
          error: matchError.message
        });
      }

      if (!isMatch) {
        
        // 获取系统设置
        const systemSettings = await SystemSetting.findOne();
        
        // 如果没有设置，使用默认值
        const attemptLimit = systemSettings ? systemSettings.loginAttemptLimit : 5;
        const lockoutDuration = systemSettings ? systemSettings.lockoutDuration : 30; // 分钟
        
        // 增加登录失败次数
        if (user.incrementLoginAttempts && typeof user.incrementLoginAttempts === 'function') {
          try {
            await user.incrementLoginAttempts();
          } catch (err) {
            // 手动增加
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            await user.save();
          }
        } else {
          // 手动增加登录失败次数
          user.loginAttempts = (user.loginAttempts || 0) + 1;
          await user.save();
        }
        
        // 如果超过限制，锁定账户
        if (user.loginAttempts >= attemptLimit) {
          if (user.lockAccount && typeof user.lockAccount === 'function') {
            await user.lockAccount(lockoutDuration);
          } else {
            // 手动锁定账户
            user.lockUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
            await user.save();
          }
          
          return res.status(403).json({
            success: false,
            message: `账户已被临时锁定，请在${lockoutDuration}分钟后重试`,
            lockUntil: user.lockUntil
          });
        }
        
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误',
          attempts: user.loginAttempts,
          maxAttempts: attemptLimit
        });
      }

      // 登录成功，重置登录失败次数
      if (user.resetLoginAttempts && typeof user.resetLoginAttempts === 'function') {
        try {
          await user.resetLoginAttempts();
        } catch (err) {
          // 手动重置
          user.loginAttempts = 0;
          user.lockUntil = null;
          await user.save();
        }
      } else {
        // 手动重置登录失败次数
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }

      // 发送JWT令牌
      sendTokenResponse(user, 200, res, remember);
    } catch (dbError) {
      return res.status(500).json({
        success: false,
        message: '数据库查询失败',
        error: dbError.message
      });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    用户登出
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // 清除cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10秒后过期
      httpOnly: true
    });

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

  // Cookie过期时间
  const cookieExpire = parseInt(process.env.JWT_COOKIE_EXPIRE || '7');
  
  // 创建cookie选项
  const options = {
    expires: new Date(
      Date.now() + (remember ? cookieExpire * 30 : cookieExpire) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'Strict', // 防止CSRF攻击
    path: '/'
  };

  // 在生产环境中使用secure选项
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // 设置Cookie
  res.cookie('token', token, options);

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
    token // 同时返回token供前端存储，便于API调用
  });
};

// @desc    刷新访问令牌
// @route   POST /api/auth/refresh-token
// @access  Public (使用过期的令牌)
exports.refreshToken = async (req, res, next) => {
  try {
    // 从请求头中获取令牌
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 检查令牌是否存在
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '需要提供令牌以刷新访问权限'
      });
    }

    try {
      // 验证令牌，即使已过期也尝试解码
      let decoded;
      try {
        // 首先尝试正常验证
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (verifyError) {
        // 如果验证失败，检查是否是因为令牌过期
        if (verifyError.name === 'TokenExpiredError') {
          // 尝试解码过期的令牌以获取用户ID
          const decodedExpired = jwt.decode(token);
          if (decodedExpired && decodedExpired.id) {
            decoded = decodedExpired;
          } else {
            throw new Error('无效的令牌格式');
          }
        } else {
          // 如果是其他验证错误，直接抛出
          throw verifyError;
        }
      }

      // 根据令牌中的用户ID查找用户
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '找不到该用户'
        });
      }

      // 创建新的访问令牌
      const newToken = user.getSignedJwtToken();

      // 返回新令牌
      res.status(200).json({
        success: true,
        message: '令牌已刷新',
        token: newToken
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '无效的令牌，无法刷新'
      });
    }
  } catch (err) {
    next(err);
  }
}; 