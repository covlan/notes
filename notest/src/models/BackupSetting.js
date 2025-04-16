const mongoose = require('mongoose');

const BackupSettingSchema = new mongoose.Schema({
  autoBackup: {
    type: Number,
    default: 7, // 0: 禁用, 1: 每天, 7: 每周, 30: 每月
    enum: [0, 1, 7, 30]
  },
  backupRetention: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  backupLocation: {
    type: String,
    default: './backups'
  },
  lastBackupTime: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间
BackupSettingSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('BackupSetting', mongoose.connection.models.BackupSetting || BackupSettingSchema);
