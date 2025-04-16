const mongoose = require('mongoose');

const NoteTagSchema = new mongoose.Schema({
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true
  },
  tagId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 复合索引确保一个笔记不会重复添加同一个标签
NoteTagSchema.index({ noteId: 1, tagId: 1 }, { unique: true });

module.exports = mongoose.model('NoteTag', NoteTagSchema); 