const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录详细错误信息
  console.error('错误详情:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    path: req.originalUrl,
    method: req.method
  });

  // Mongoose错误处理
  if (err.name === 'CastError') {
    const message = '资源不存在';
    error = { message, statusCode: 400 };
  }

  // Mongoose重复键
  if (err.code === 11000) {
    const message = '该字段已存在重复值';
    error = { message, statusCode: 400 };
  }

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || '服务器错误'
  });
};

module.exports = errorHandler; 