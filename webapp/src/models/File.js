const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: [true, '请提供文件名']
  },
  fileType: {
    type: String,
    required: [true, '请提供文件类型']
  },
  fileSize: {
    type: Number,
    required: [true, '请提供文件大小']
  },
  filePath: {
    type: String,
    required: [true, '请提供文件路径']
  },
  url: {
    type: String,
    required: [true, '请提供文件URL']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  noteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('File', FileSchema); 