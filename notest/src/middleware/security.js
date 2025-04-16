const SystemSetting = require('../models/SystemSetting');
const jwt = require('jsonwebtoken');

/**
 * 验证注册功能是否开启
 * 如果关闭注册，则返回403错误
 */
exports.checkRegistrationAllowed = async (req, res, next) => {
  try {
    // 获取系统设置
    const systemSettings = await SystemSetting.findOne();
    
    // 如果没有设置，使用默认值(允许注册)
    if (!systemSettings) {
      return next();
    }
    
    // 如果禁止注册，返回错误
    if (!systemSettings.allowRegistration) {
      return res.status(403).json({
        success: false,
        message: '当前系统不允许新用户注册'
      });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 验证密码长度是否符合要求
 */
exports.validatePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    // 获取系统设置
    const systemSettings = await SystemSetting.findOne();
    
    // 如果没有设置，使用默认值(8位密码)
    const minLength = systemSettings ? systemSettings.passwordMinLength : 8;
    
    // 验证密码长度
    if (!password || password.length < minLength) {
      return res.status(400).json({
        success: false,
        message: `密码长度不能小于${minLength}位`
      });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 处理登录失败尝试计数
 * 需要在用户登录失败后调用
 */
exports.handleLoginAttempt = async (req, res, next) => {
  try {
    const { username } = req.body;
    
    // 获取系统设置
    const systemSettings = await SystemSetting.findOne();
    
    // 如果没有设置，使用默认值
    const attemptLimit = systemSettings ? systemSettings.loginAttemptLimit : 5;
    const lockoutDuration = systemSettings ? systemSettings.lockoutDuration : 30; // 分钟
    
    // 从请求中获取登录失败次数(这里需要在认证中间件中设置)
    let failedAttempts = req.failedAttempts || 0;
    failedAttempts += 1;
    
    // 如果超过限制，锁定账户
    if (failedAttempts >= attemptLimit) {
      // 这里应该设置账户锁定状态
      // 实际应用中需要将锁定信息存储到数据库
      const lockUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
      
      return res.status(403).json({
        success: false,
        message: `账户已被临时锁定，请在${lockoutDuration}分钟后重试`,
        lockUntil
      });
    }
    
    // 更新失败次数到请求对象，供后续中间件使用
    req.failedAttempts = failedAttempts;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 重置登录失败尝试计数
 * 需要在用户登录成功后调用
 */
exports.resetLoginAttempts = async (req, res, next) => {
  try {
    const { username } = req.body;
    
    // 这里应该重置用户的登录失败计数
    // 实际应用中需要更新数据库中的失败次数
    
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * 设置会话有效期
 */
exports.setSessionLifetime = async (req, res, next) => {
  try {
    // 获取系统设置
    const systemSettings = await SystemSetting.findOne();
    
    // 如果没有设置，使用默认值(7天)
    const sessionLifetime = systemSettings ? systemSettings.sessionLifetime : 168; // 7天 = 24 * 7 小时
    
    // 设置会话过期时间（小时转毫秒）
    req.sessionLifetime = sessionLifetime;
    
    // 如果请求中包含token，检查是否需要刷新
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const tokenAge = Date.now() - decoded.iat * 1000;
        const refreshThreshold = (sessionLifetime * 3600000) * 0.7; // 当token使用超过70%时刷新
        
        if (tokenAge > refreshThreshold) {
          // 生成新token
          const newToken = jwt.sign(
            { userId: decoded.userId },
            process.env.JWT_SECRET,
            { expiresIn: `${sessionLifetime}h` }
          );
          
          // 将新token添加到响应头
          res.setHeader('X-New-Token', newToken);
        }
      } catch (err) {
        // token验证失败，继续处理
        throw err;
      }
    }
    
    next();
  } catch (err) {
    next(err);
  }
}; 