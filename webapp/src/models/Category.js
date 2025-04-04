const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请提供分类名称'],
    trim: true,
    maxlength: [50, '分类名称不能超过50个字符']
  },
  description: {
    type: String,
    maxlength: [500, '分类描述不能超过500个字符']
  },
  color: {
    type: String,
    default: '#1a73e8',
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
CategorySchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Category', CategorySchema); 