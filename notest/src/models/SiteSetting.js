const mongoose = require('mongoose');

const SiteSettingSchema = new mongoose.Schema({
  siteTitle: {
    type: String,
    default: '笔记平台'
  },
  siteDescription: {
    type: String,
    default: '一个简单易用的个人笔记管理平台'
  },
  siteKeywords: {
    type: String,
    default: '笔记,Markdown,知识管理'
  },
  siteLogo: {
    type: String,
    default: '/images/default-logo.png'
  },
  footerText: {
    type: String,
    default: '© 2023 笔记平台 - 版权所有'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间
SiteSettingSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('SiteSetting', SiteSettingSchema); 