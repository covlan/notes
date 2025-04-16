#!/usr/bin/env node

/**
 * HTML处理脚本
 * 用于在应用启动时处理所有HTML文件，确保它们被正确解析
 */

const path = require('path');
const fs = require('fs');
const HtmlProcessor = require('../src/utils/html-processor');

// 获取页面目录路径
const pagesDir = path.join(process.cwd(), 'pages');

// 创建HTML处理器
const processor = new HtmlProcessor(pagesDir);

// 处理所有HTML文件
console.log('开始处理HTML文件...');
const results = processor.processAllHtmlFiles();

// 输出处理结果
console.log('HTML文件处理完成:');
console.log(`- 总文件数: ${results.total}`);
console.log(`- 成功处理: ${results.processed}`);
console.log(`- 处理失败: ${results.failed}`);

// 处理所有HTML文件中的链接
console.log('开始处理HTML文件中的链接...');
const htmlFiles = processor.getAllHtmlFiles();
let linksProcessed = 0;

htmlFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 替换所有href属性中的.html后缀
    const hrefRegex = /href=["']([^"']+)\.html(["'])/g;
    content = content.replace(hrefRegex, (match, p1, p2) => {
      linksProcessed++;
      return `href="${p1}${p2}"`;
    });
    
    // 替换所有action属性中的.html后缀
    const actionRegex = /action=["']([^"']+)\.html(["'])/g;
    content = content.replace(actionRegex, (match, p1, p2) => {
      linksProcessed++;
      return `action="${p1}${p2}"`;
    });
    
    // 替换所有src属性中的.html后缀（除了script标签）
    const srcRegex = /src=["']([^"']+)\.html(["'])/g;
    content = content.replace(srcRegex, (match, p1, p2) => {
      linksProcessed++;
      return `src="${p1}${p2}"`;
    });
    
    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    console.error(`处理HTML文件中的链接失败: ${filePath}`, error);
  }
});

console.log(`- 处理的链接数: ${linksProcessed}`);

// 如果所有文件都处理成功，返回0，否则返回1
process.exit(results.failed === 0 ? 0 : 1); 