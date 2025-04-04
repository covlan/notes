require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// 导入路由
const authRoutes = require('./src/routes/auth');
const noteRoutes = require('./src/routes/notes');
const categoryRoutes = require('./src/routes/categories');
const tagRoutes = require('./src/routes/tags');
const shareRoutes = require('./src/routes/shares');
const fileRoutes = require('./src/routes/files');
const settingRoutes = require('./src/routes/settings');
const userRoutes = require('./src/routes/users');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 5660;

// 中间件
app.use(cors()); // 允许跨域请求
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置静态文件目录，提供前端页面访问
app.use(express.static(path.join(__dirname, 'pages')));

// 设置上传文件目录为静态资源
app.use('/uploads', express.static(path.join(__dirname, 'src', 'uploads')));

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 数据库连接
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('数据库连接成功'))
.catch(err => console.error('数据库连接失败:', err));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 处理前端路由，所有不匹配API的请求都返回index.html
app.get('*', (req, res) => {
  // 检查请求是否是HTML页面
  const htmlPages = [
    '/index.html',
    '/register.html',
    '/dashboard.html',
    '/note-editor.html',
    '/note-editor-modal.html',
    '/note-categories.html',
    '/note-share.html',
    '/profile-edit.html',
    '/settings.html',
    '/starred-notes.html',
    '/tags.html',
    '/trash.html',
    '/view-shared-note.html'
  ];
  
  // 从URL中提取请求的路径
  const urlPath = req.path;
  
  // 特殊处理分享笔记页面 - 即使有查询参数也允许访问
  if (urlPath === '/view-shared-note.html' || urlPath.startsWith('/view-shared-note.html?')) {
    return res.sendFile(path.join(__dirname, 'pages', '/view-shared-note.html'));
  }
  
  // 如果是具体的HTML页面路径，则直接提供该页面
  if (htmlPages.includes(urlPath)) {
    return res.sendFile(path.join(__dirname, 'pages', urlPath));
  }
  
  // 处理不带.html后缀的页面请求
  const pageWithoutExtension = htmlPages.find(page => urlPath === page.replace('.html', ''));
  if (pageWithoutExtension) {
    return res.sendFile(path.join(__dirname, 'pages', pageWithoutExtension));
  }
  
  // 检查是否是对分享笔记页面的请求但路径不完整
  if (urlPath.includes('view-shared-note')) {
    return res.sendFile(path.join(__dirname, 'pages', '/view-shared-note.html'));
  }
  
  // 如果是根路径或其他不匹配的路径，默认返回index.html
  return res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`应用运行在 http://localhost:${PORT}`);
}); 