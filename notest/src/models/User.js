const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '请提供用户名'],
    unique: true,
    trim: true,
    maxlength: [50, '用户名不能超过50个字符']
  },
  email: {
    type: String,
    required: [true, '请提供邮箱'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      '请提供有效的邮箱'
    ]
  },
  password: {
    type: String,
    required: [true, '请提供密码'],
    minlength: [6, '密码至少6个字符'],
    select: false
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, '显示名称不能超过50个字符']
  },
  avatarUrl: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, '个人简介不能超过500个字符']
  },
  phone: {
    type: String,
    match: [/^1[3-9]\d{9}$/, '请提供有效的手机号']
  },
  // 新增个人信息字段
  birthday: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', ''],
    default: ''
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, '地址不能超过100个字符']
  },
  occupation: {
    type: String,
    trim: true,
    maxlength: [100, '职业信息不能超过100个字符']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, '个人网站地址不能超过200个字符']
  },
  socialLinks: {
    weibo: { type: String, default: '' },
    wechat: { type: String, default: '' },
    github: { type: String, default: '' },
    zhihu: { type: String, default: '' }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // 新增字段：登录失败次数
  loginAttempts: {
    type: Number,
    default: 0
  },
  // 新增字段：账户锁定时间
  lockUntil: {
    type: Date,
    default: null
  }
});

// 加密密码
UserSchema.pre('save', async function(next) {
  // 只有当密码字段被修改时才进行哈希处理
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('密码哈希处理失败:', error);
    next(error);
  }
});

// 更新时间
UserSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// 匹配密码
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 生成JWT令牌
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// 生成重置密码的令牌
UserSchema.methods.getResetPasswordToken = function() {
  // 生成令牌
  const resetToken = crypto.randomBytes(20).toString('hex');

  // 哈希令牌并设置到resetPasswordToken字段
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 设置过期时间
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10分钟

  return resetToken;
};

// 判断账户是否被锁定
UserSchema.methods.isLocked = function() {
  // 检查是否设置了锁定时间
  if (!this.lockUntil) return false;
  
  // 检查锁定时间是否已过期
  return this.lockUntil > Date.now();
};

// 增加登录失败次数
UserSchema.methods.incrementLoginAttempts = async function() {
  // 更新登录失败次数
  this.loginAttempts += 1;
  await this.save();
};

// 锁定账户
UserSchema.methods.lockAccount = async function(minutes) {
  // 设置锁定时间
  this.lockUntil = new Date(Date.now() + minutes * 60 * 1000);
  await this.save();
};

// 重置登录失败次数
UserSchema.methods.resetLoginAttempts = async function() {
  // 重置登录失败次数和锁定时间
  this.loginAttempts = 0;
  this.lockUntil = null;
  await this.save();
};

module.exports = mongoose.model('User', UserSchema); 