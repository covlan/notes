const fs = require('fs');
const path = require('path');

/**
 * HTML处理器
 * 用于在服务器端处理HTML文件，确保它们被正确解析
 */
class HtmlProcessor {
  /**
   * 构造函数
   * @param {String} pagesDir - 页面目录路径
   */
  constructor(pagesDir) {
    this.pagesDir = pagesDir || path.join(process.cwd(), 'pages');
  }

  /**
   * 处理HTML文件，添加正确的MIME类型和其他必要的元数据
   * @param {String} filePath - HTML文件路径
   * @returns {String} 处理后的HTML内容
   */
  processHtmlFile(filePath) {
    try {
      // 读取HTML文件
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否已经包含DOCTYPE
      if (!content.includes('<!DOCTYPE html>')) {
        // 添加DOCTYPE和HTML标签
        content = `<!DOCTYPE html>
<html lang="zh-CN">
${content}`;
      }
      
      // 检查是否已经包含</html>标签
      if (!content.includes('</html>')) {
        content += '\n</html>';
      }
      
      // 检查是否已经包含meta标签
      if (!content.includes('<meta charset="UTF-8"')) {
        // 在head标签内添加meta标签
        content = content.replace('<head>', `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
      }
      
      // 检查是否已经包含base标签
      if (!content.includes('<base href="')) {
        // 在head标签内添加base标签
        content = content.replace('<head>', `<head>
    <base href="/">`);
      }
      
      // 添加MIME类型检测脚本和URL重写功能
      if (!content.includes('data-mime-type')) {
        const scriptTag = `
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
    </script>`;
        
        // 在</head>标签前添加脚本
        content = content.replace('</head>', `${scriptTag}
</head>`);
      }
      
      return content;
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取所有HTML文件路径
   * @returns {Array} HTML文件路径数组
   */
  getAllHtmlFiles() {
    const htmlFiles = [];
    
    try {
      // 递归获取所有HTML文件
      const getFiles = (dir) => {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            getFiles(filePath);
          } else if (file.endsWith('.html')) {
            htmlFiles.push(filePath);
          }
        });
      };
      
      getFiles(this.pagesDir);
    } catch (error) {
      throw error;
    }
    
    return htmlFiles;
  }

  /**
   * 处理所有HTML文件
   * @returns {Object} 处理结果统计
   */
  processAllHtmlFiles() {
    const htmlFiles = this.getAllHtmlFiles();
    const results = {
      total: htmlFiles.length,
      processed: 0,
      failed: 0
    };
    
    htmlFiles.forEach(filePath => {
      try {
        const processedContent = this.processHtmlFile(filePath);
        
        if (processedContent) {
          // 写回文件
          fs.writeFileSync(filePath, processedContent, 'utf8');
          results.processed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
      }
    });
    
    return results;
  }
}

module.exports = HtmlProcessor; 