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
let dbRetryCount = 0;
const MAX_DB_RETRIES = 10; // 增加最大重试次数
const DB_RETRY_INTERVAL = 5000; // 5秒
let dbConnectionCheckInterval = null;

function connectToDatabase() {
  console.log(`尝试连接数据库 (尝试 ${dbRetryCount + 1}/${MAX_DB_RETRIES})...`);

  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10秒超时
    heartbeatFrequencyMS: 15000, // 降低心跳间隔到15秒，更快检测连接问题
    socketTimeoutMS: 45000 // 增加套接字超时时间
  })
  .then(() => {
    console.log('数据库连接成功');
    dbRetryCount = 0; // 重置重试计数

    // 添加连接错误事件处理
    mongoose.connection.on('error', (err) => {
      console.error('数据库连接错误:', err);
      if (mongoose.connection.readyState !== 1) {
        // 如果连接不在"已连接"状态，尝试重新连接
        setTimeout(() => {
          console.log('尝试重新连接数据库...');
          dbRetryCount = 0; // 重置重试计数
          connectToDatabase();
        }, DB_RETRY_INTERVAL);
      }
    });

    // 添加连接断开事件处理
    mongoose.connection.on('disconnected', () => {
      console.log('数据库连接断开');
      if (dbRetryCount < MAX_DB_RETRIES) {
        dbRetryCount++;
        setTimeout(() => {
          connectToDatabase();
        }, DB_RETRY_INTERVAL);
      } else {
        console.error(`数据库重连失败，已达到最大重试次数 ${MAX_DB_RETRIES}`);
        // 重置重试计数，允许将来再次尝试
        setTimeout(() => {
          console.log('重置重试计数，准备再次尝试连接...');
          dbRetryCount = 0;
          connectToDatabase();
        }, 60000); // 1分钟后重置重试计数
      }
    });

    // 添加连接成功事件处理
    mongoose.connection.on('connected', () => {
      console.log('数据库连接成功事件触发');
      // 检查必要的集合是否存在
      checkRequiredCollections();
    });

    // 设置定期检查数据库连接状态
    if (dbConnectionCheckInterval) {
      clearInterval(dbConnectionCheckInterval);
    }

    dbConnectionCheckInterval = setInterval(() => {
      if (mongoose.connection.readyState !== 1) {
        console.log(`定期检查: 数据库连接状态异常: ${mongoose.connection.readyState}`);
        // 尝试重新连接
        if (dbRetryCount < MAX_DB_RETRIES) {
          dbRetryCount++;
          console.log('尝试重新连接数据库...');
          connectToDatabase();
        }
      } else {
        // 如果连接正常，可以发送一个简单的ping查询来确保连接活跃
        mongoose.connection.db.admin().ping()
          .then(() => console.log('数据库连接活跃'))
          .catch(err => {
            console.error('数据库ping失败:', err);
            // 如果ping失败，尝试重新连接
            connectToDatabase();
          });
      }
    }, 30000); // 每30秒检查一次

    // 初始检查必要的集合
    checkRequiredCollections();
  })
  .catch(err => {
    console.error('数据库连接失败:', err);

    if (dbRetryCount < MAX_DB_RETRIES) {
      dbRetryCount++;
      console.log(`将在 ${DB_RETRY_INTERVAL/1000} 秒后重试连接...`);
      setTimeout(connectToDatabase, DB_RETRY_INTERVAL);
    } else {
      console.error(`数据库连接失败，已达到最大重试次数 ${MAX_DB_RETRIES}`);
      // 重置重试计数，允许将来再次尝试
      setTimeout(() => {
        console.log('重置重试计数，准备再次尝试连接...');
        dbRetryCount = 0;
        connectToDatabase();
      }, 60000); // 1分钟后重置重试计数
    }
  });
}

// 检查必要的集合是否存在
async function checkRequiredCollections() {
  try {
    const requiredCollections = ['users', 'notes', 'categories', 'tags', 'shares', 'user_settings', 'system_settings'];
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('检查必要的数据库集合...');
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));

    if (missingCollections.length > 0) {
      console.log(`缺少必要的集合: ${missingCollections.join(', ')}`);

      // 创建缺失的集合
      for (const collName of missingCollections) {
        console.log(`创建集合: ${collName}`);
        await mongoose.connection.db.createCollection(collName);
      }

      // 检查是否有初始化标记
      const initFlag = await mongoose.connection.db.collection('system_settings').findOne({ _id: "init_flag" });

      if (!initFlag) {
        console.log('创建数据库初始化标记');
        await mongoose.connection.db.collection('system_settings').insertOne({
          _id: "init_flag",
          initialized: true,
          initTime: new Date(),
          version: "1.0.0"
        });
      }

      console.log('数据库集合初始化完成');
    } else {
      console.log('所有必要的集合已存在');
    }
  } catch (err) {
    console.error('检查数据库集合时出错:', err);
  }
}

// 初始连接数据库
connectToDatabase();

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