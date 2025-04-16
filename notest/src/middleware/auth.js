const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

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

    // 检查数据库连接状态
    if (mongoose.connection.readyState !== 1) {

      // 尝试重新连接数据库而不是立即返回错误
      try {
        // 如果连接已关闭，尝试重新连接
        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000 // 5秒超时，快速尝试
          });
        } else {
          // 如果连接状态不是已关闭，可能是正在连接或断开中，等待一下
          await new Promise(resolve => setTimeout(resolve, 1000));

          // 如果等待后仍然不是已连接状态，则返回错误
          if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
              success: false,
              message: '数据库连接异常，请稍后重试',
              code: 'DB_CONNECTION_ERROR'
            });
          }
        }
      } catch (connError) {
        return res.status(500).json({
          success: false,
          message: '数据库连接异常，请稍后重试',
          code: 'DB_CONNECTION_ERROR'
        });
      }
    }

    // 在继续查询用户之前，先检查数据库状态
    try {
      // 使用更可靠的方式检查集合是否存在
      let userCollectionExists = false;
      try {
        // 尝试直接查询users集合中的文档数量
        const count = await mongoose.connection.db.collection('users').countDocuments({}, { limit: 1 });
        userCollectionExists = true;
      } catch (collErr) {
        // 如果出错，可能是集合不存在
        if (collErr.message && collErr.message.includes('ns does not exist')) {
          userCollectionExists = false;
        } else {
          // 尝试使用listCollections方法检查
          try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            userCollectionExists = collections.some(collection => collection.name === 'users');
          } catch (listErr) {
            // 如果仍然出错，返回数据库错误
            return res.status(500).json({
              success: false,
              message: '数据库查询失败，请稍后重试',
              code: 'DB_QUERY_ERROR'
            });
          }
        }
      }

      // 如果用户集合不存在，返回特定错误而不是自动初始化
      // 这样可以避免在跨设备登录时意外重置数据
      if (!userCollectionExists) {
        return res.status(401).json({
          success: false,
          message: '系统数据库需要初始化，请联系管理员',
          code: 'DB_NEEDS_INIT'
        });
      }
    } catch (collectionError) {
      console.error('检查数据库集合时出错:', collectionError);
      return res.status(500).json({
        success: false,
        message: '数据库操作失败，请稍后重试',
        code: 'DB_OPERATION_ERROR'
      });
    }

    // 获取用户信息
    let user;
    try {
      user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '找不到该用户，系统可能已重置，请重新登录',
          code: 'USER_NOT_FOUND'
        });
      }
    } catch (userError) {
      return res.status(500).json({
        success: false,
        message: '查询用户信息失败，请稍后重试',
        code: 'USER_QUERY_ERROR'
      });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: '认证失败：' + (err.name === 'JsonWebTokenError' ? '无效的令牌' : err.message),
      code: err.name === 'JsonWebTokenError' ? 'INVALID_TOKEN' : 'AUTH_ERROR'
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