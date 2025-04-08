const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ShareSchema = new mongoose.Schema({
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shareType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  password: {
    type: String,
    select: false
  },
  shareLink: {
    type: String,
    unique: true
  },
  expiry: {
    type: Date,
    default: null
  },
  isCanceled: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  stars: {
    type: Number,
    default: 0
  },
  sharedAt: {
    type: Date,
    default: Date.now
  }
});

// 生成分享链接
ShareSchema.pre('save', function(next) {
  // 如果已经有分享链接，则不需要生成
  if (this.shareLink) {
    return next();
  }

  // 生成随机字符串作为分享ID
  const shareId = crypto.randomBytes(6).toString('hex');
  this.shareLink = `${process.env.FRONTEND_URL}/share/${shareId}`;
  
  next();
});

// 如果需要密码，加密密码
ShareSchema.pre('save', async function(next) {
  if (this.shareType !== 'private' || !this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 验证密码
ShareSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Share', ShareSchema); 