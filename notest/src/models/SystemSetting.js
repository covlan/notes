const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
  // 安全设置
  allowRegistration: {
    type: Boolean,
    default: true
  },
  sessionLifetime: {
    type: Number,
    default: 24 // 小时
  },
  passwordMinLength: {
    type: Number,
    default: 8
  },
  loginAttemptLimit: {
    type: Number,
    default: 5
  },
  lockoutDuration: {
    type: Number,
    default: 30 // 分钟
  },
  storageLimit: {
    type: Number,
    default: 1024 // MB
  },
  attachmentSizeLimit: {
    type: Number,
    default: 10 // MB
  },

  // 高级设置
  editorDefaultMode: {
    type: String,
    enum: ['wysiwyg', 'markdown', 'split'],
    default: 'wysiwyg'
  },
  uploadMaxSize: {
    type: Number,
    default: 10, // MB
    min: 1,
    max: 100
  },
  cacheLifetime: {
    type: Number,
    default: 60, // 分钟
    min: 5
  },
  systemLanguage: {
    type: String,
    default: 'zh-CN'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间
SystemSettingSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);