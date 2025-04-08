const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 验证用户是否已登录
exports.protect = async (req, res, next) => {
  let token;

  // 尝试从请求头中获取token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // 获取Bearer token
    token = req.headers.authorization.split(' ')[1];
  } 
  // 如果请求头中没有，尝试从cookies中获取
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 如果没有token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未授权，请登录'
    });
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 获取用户信息
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '找不到该用户'
      });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: '无效的令牌'
    });
  }
};

// 检查用户角色权限
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '您无权执行此操作'
      });
    }
    next();
  };
}; 