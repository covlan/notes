require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const categoryRoutes = require('./routes/categories');
const tagRoutes = require('./routes/tags');
const shareRoutes = require('./routes/shares');
const fileRoutes = require('./routes/files');
const settingRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件目录
app.use('/uploads', express.static('uploads'));

// 连接数据库
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})


// 路由
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/backup', require('./routes/backup'));

// 错误处理
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

app.listen(PORT, () => {
});