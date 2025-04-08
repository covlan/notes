require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

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

// 导入HTML处理中间件
const htmlHandler = require('./src/middleware/html-handler');

const app = express();
const PORT = process.env.PORT || 5660;

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || true, // 允许所有来源，或指定来源
  credentials: true // 允许携带凭证（cookies）
})); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 解析cookies

// 设置静态文件目录，提供前端页面访问
app.use(express.static(path.join(__dirname, 'pages'), {
  setHeaders: (res, filePath) => {
    // 为HTML文件设置正确的MIME类型
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

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

// 使用HTML处理中间件处理无后缀的URL请求
app.use(htmlHandler);

// 获取所有HTML页面列表
function getHtmlPages() {
  const pagesDir = path.join(__dirname, 'pages');
  const htmlFiles = fs.readdirSync(pagesDir)
    .filter(file => file.endsWith('.html'))
    .map(file => '/' + file);
  
  return htmlFiles;
}

// 处理前端路由，所有不匹配API的请求都返回login.html
app.get('*', (req, res) => {
  // 获取所有HTML页面
  const htmlPages = getHtmlPages();
  
  // 从URL中提取请求的路径
  const urlPath = req.path;
  
  // 如果路径以.html结尾，重定向到无后缀URL
  if (urlPath.endsWith('.html')) {
    const newPath = urlPath.replace('.html', '');
    return res.redirect(301, newPath + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : ''));
  }
  
  // 特殊处理分享笔记页面 - 即使有查询参数也允许访问
  if (urlPath === '/view-shared-note' || urlPath.startsWith('/view-shared-note?')) {
    return res.sendFile(path.join(__dirname, 'pages', 'view-shared-note.html'), {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
  
  // 处理不带.html后缀的页面请求
  const pageWithoutExtension = htmlPages.find(page => urlPath === page.replace('.html', ''));
  if (pageWithoutExtension) {
    return res.sendFile(path.join(__dirname, 'pages', pageWithoutExtension.substring(1)), {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
  
  // 检查是否是对分享笔记页面的请求但路径不完整
  if (urlPath.includes('view-shared-note')) {
    return res.sendFile(path.join(__dirname, 'pages', 'view-shared-note.html'), {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
  
  // 如果是根路径或其他不匹配的路径，默认返回login.html
  return res.sendFile(path.join(__dirname, 'pages', 'login.html'), {
    headers: {
      'Content-Type': 'text/html'
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('应用程序错误:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`应用运行在 http://localhost:${PORT}`);
  console.log('支持无后缀URL访问，例如:');
  console.log(`  http://localhost:${PORT}/login`);
  console.log(`  http://localhost:${PORT}/register`);
  console.log(`  http://localhost:${PORT}/dashboard`);
}); 