const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
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