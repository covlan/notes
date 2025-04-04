const mongoose = require('mongoose');

const UserSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  language: {
    type: String,
    default: 'zh-CN'
  },
  fontSize: {
    type: Number,
    default: 14
  },
  editorFontFamily: {
    type: String,
    default: 'sans-serif'
  },
  autoSave: {
    type: Boolean,
    default: true
  },
  defaultView: {
    type: String,
    enum: ['grid', 'list'],
    default: 'grid'
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false
  },
  notificationEnabled: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间
UserSettingSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('UserSetting', UserSettingSchema); 