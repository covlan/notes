const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请提供标签名称'],
    trim: true,
    maxlength: [30, '标签名称不能超过30个字符']
  },
  color: {
    type: String,
    default: '#4a6bff',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, '请提供有效的颜色值']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间
TagSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Tag', TagSchema); 