/**
 * HTML头部组件
 * 用于设置正确的MIME类型和其他必要的元数据
 */
class HtmlHeader {
  constructor(options = {}) {
    this.options = Object.assign({
      title: '笔记应用',
      description: '一个简单易用的个人笔记管理平台',
      keywords: '笔记,Markdown,知识管理',
      charset: 'UTF-8',
      viewport: 'width=device-width, initial-scale=1.0',
      themeColor: '#4a6bff',
      favicon: '/favicon.ico',
      baseUrl: '/',
      noCache: false
    }, options);
  }

  /**
   * 生成HTML头部
   * @returns {String} HTML头部字符串
   */
  generate() {
    const {
      title,
      description,
      keywords,
      charset,
      viewport,
      themeColor,
      favicon,
      baseUrl,
      noCache
    } = this.options;

    // 构建缓存控制头
    const cacheControl = noCache 
      ? 'no-cache, no-store, must-revalidate' 
      : 'public, max-age=3600';

    // 构建HTML头部
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="${charset}">
    <meta name="viewport" content="${viewport}">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="theme-color" content="${themeColor}">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Cache-Control" content="${cacheControl}">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <base href="${baseUrl}">
    <link rel="icon" href="${favicon}" type="image/x-icon">
    <link rel="shortcut icon" href="${favicon}" type="image/x-icon">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- 引入站点信息加载脚本 -->
    <script src="component/site-info.js"></script>
    <script>
        // 设置正确的MIME类型
        document.documentElement.setAttribute('data-mime-type', 'text/html');
        
        // 强制使用无后缀URL
        (function() {
            // 检查当前URL是否包含.html后缀
            if (window.location.pathname.endsWith('.html')) {
                // 重定向到无后缀URL
                const newPath = window.location.pathname.replace('.html', '');
                window.history.replaceState({}, '', newPath + window.location.search + window.location.hash);
            }
            
            // 拦截所有链接点击事件
            document.addEventListener('click', function(e) {
                // 查找最近的<a>标签
                const link = e.target.closest('a');
                if (link) {
                    const href = link.getAttribute('href');
                    if (href && href.endsWith('.html') && !href.startsWith('http')) {
                        e.preventDefault();
                        const newHref = href.replace('.html', '');
                        window.location.href = newHref;
                    }
                }
            });
            
            // 拦截表单提交
            document.addEventListener('submit', function(e) {
                const form = e.target;
                const action = form.getAttribute('action');
                if (action && action.endsWith('.html') && !action.startsWith('http')) {
                    e.preventDefault();
                    form.setAttribute('action', action.replace('.html', ''));
                    form.submit();
                }
            });
            
            // 拦截所有AJAX请求
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                if (typeof url === 'string' && url.endsWith('.html') && !url.startsWith('http')) {
                    url = url.replace('.html', '');
                }
                return originalFetch(url, options);
            };
            
            // 拦截所有XHR请求
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                if (typeof url === 'string' && url.endsWith('.html') && !url.startsWith('http')) {
                    url = url.replace('.html', '');
                }
                return originalOpen.call(this, method, url, ...args);
            };
        })();
    </script>
</head>
    `;
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HtmlHeader;
} else {
  window.HtmlHeader = HtmlHeader;
} 