/**
 * 此脚本用于在所有HTML页面添加站点信息加载脚本
 */

const fs = require('fs');
const path = require('path');

// 页面目录
const pagesDir = path.join(__dirname, '../pages');

// 查找所有HTML文件
function findHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  return files.filter(file => file.endsWith('.html'));
}

// 更新HTML文件
function updateHtmlFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否已添加站点信息脚本
    if (content.includes('site-info.js')) {
      console.log(`✓ ${path.basename(filePath)} 已包含站点信息脚本`);
      return;
    }
    
    // 添加站点信息脚本和meta标签
    content = content.replace(
      /<head>([\s\S]*?)<\/head>/,
      (match, p1) => {
        // 添加meta标签（如果不存在）
        let updatedHead = p1;
        if (!updatedHead.includes('<meta name="description"')) {
          updatedHead = updatedHead.replace(
            /<title>([\s\S]*?)<\/title>/,
            '<title>$1</title>\n    <meta name="description" content="一个简单易用的个人笔记管理平台">\n    <meta name="keywords" content="笔记,Markdown,知识管理">'
          );
        }
        
        // 添加站点信息脚本（在CSS后面）
        if (updatedHead.includes('<link rel="stylesheet"')) {
          const lastStylesheetIndex = updatedHead.lastIndexOf('<link rel="stylesheet"');
          const endOfLink = updatedHead.indexOf('>', lastStylesheetIndex) + 1;
          
          return '<head>' + 
                 updatedHead.substring(0, endOfLink) + 
                 '\n    <!-- 引入站点信息加载脚本 -->\n    <script src="./js/site-info.js"></script>' + 
                 updatedHead.substring(endOfLink) + 
                 '</head>';
        } else {
          // 如果没有样式表，就添加在标题后面
          return '<head>' + 
                 updatedHead + 
                 '\n    <!-- 引入站点信息加载脚本 -->\n    <script src="./js/site-info.js"></script>\n' + 
                 '</head>';
        }
      }
    );
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ 已更新 ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`✗ 更新 ${path.basename(filePath)} 失败:`, error.message);
  }
}

// 主函数
function main() {
  try {
    const htmlFiles = findHtmlFiles(pagesDir);
    console.log(`找到 ${htmlFiles.length} 个HTML文件`);
    
    for (const file of htmlFiles) {
      const filePath = path.join(pagesDir, file);
      updateHtmlFile(filePath);
    }
    
    console.log('所有页面更新完成！');
  } catch (error) {
    console.error('更新过程中出错:', error.message);
  }
}

// 执行主函数
main(); 