const path = require('path');
const fs = require('fs');

/**
 * HTML处理中间件
 * 用于处理无后缀的URL请求，并设置正确的MIME类型
 */
const htmlHandler = (req, res, next) => {
  // 获取请求路径
  const urlPath = req.path;
  
  // 如果路径以.html结尾，重定向到无后缀URL
  if (urlPath.endsWith('.html')) {
    const newPath = urlPath.replace('.html', '');
    return res.redirect(301, newPath + (req.originalUrl.includes('?') ? req.originalUrl.substring(req.originalUrl.indexOf('?')) : ''));
  }
  
  // 检查是否是API请求
  if (urlPath.startsWith('/api/')) {
    return next();
  }
  
  // 检查是否是静态资源请求
  if (urlPath.includes('.')) {
    return next();
  }
  
  // 检查是否是根路径
  if (urlPath === '/') {
    return res.sendFile(path.join(__dirname, '../../pages', 'login.html'), {
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
  
  // 尝试查找对应的HTML文件
  const possiblePaths = [
    // 直接匹配
    path.join(__dirname, '../../pages', `${urlPath}.html`),
    // 尝试匹配index.html
    path.join(__dirname, '../../pages', urlPath, 'index.html'),
    // 尝试匹配login.html作为默认页面
    path.join(__dirname, '../../pages', 'login.html')
  ];
  
  // 检查文件是否存在
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath, {
        headers: {
          'Content-Type': 'text/html'
        }
      });
    }
  }
  
  // 如果找不到对应的HTML文件，继续下一个中间件
  next();
};

module.exports = htmlHandler; 