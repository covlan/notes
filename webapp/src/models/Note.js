const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '请提供笔记标题'],
    trim: true,
    maxlength: [200, '标题不能超过200个字符']
  },
  content: {
    type: String,
    required: [true, '请提供笔记内容']
  },
  fileName: {
    type: String,
    required: [true, '请提供文件名'],
    unique: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  starred: {
    type: Boolean,
    default: false
  },
  inTrash: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段 - 笔记的标签
NoteSchema.virtual('tags', {
  ref: 'NoteTag',
  localField: '_id',
  foreignField: 'noteId',
  justOne: false
});

// 更新时间
NoteSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Note', NoteSchema); 