# 站点信息配置与使用指南

本文档介绍如何配置和使用站点信息功能。

## 功能介绍

站点信息功能允许管理员通过设置页面配置以下信息：

- 网站标题
- 网站描述
- 网站关键词
- 网站Logo
- 页脚版权文本

这些信息会保存在数据库中，并在所有页面自动加载使用。

## 配置站点信息

1. 使用管理员账号登录系统
2. 点击右上角头像，选择"系统设置"
3. 在左侧菜单中，选择"站点信息"
4. 填写以下信息：
   - 网站标题：显示在浏览器标签中
   - 网站描述：用于SEO优化
   - 网站关键词：用于SEO优化，多个关键词使用逗号分隔
   - 网站Logo：上传网站Logo图片（推荐尺寸：200x200像素，PNG格式）
   - 页脚版权文本：显示在页面底部
5. 点击"保存设置"按钮

## 技术实现

### 数据模型

站点信息存储在 `SiteSetting` 模型中，包含以下字段：

```javascript
// src/models/SiteSetting.js
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
```

### API接口

提供以下API接口：

- `GET /api/settings/site`：获取站点设置 (需要管理员权限)
- `PUT /api/settings/site`：更新站点设置 (需要管理员权限)
- `POST /api/settings/site/logo`：上传站点Logo (需要管理员权限)
- `GET /api/settings/site/public`：获取公开的站点信息 (无需登录)

### 前端实现

前端通过 `site-info.js` 脚本自动加载站点信息，并应用到页面：

```javascript
// public/js/site-info.js
async function loadPublicSiteInfo() {
    try {
        const response = await fetch('/api/settings/site/public');
        const data = await response.json();
        
        if (data.success) {
            const siteInfo = data.siteInfo;
            
            // 更新页面标题
            const currentTitle = document.title;
            const siteName = siteInfo.siteTitle || '笔记平台';
            
            // 如果标题中不包含站点名称，则添加站点名称
            if (!currentTitle.includes(siteName)) {
                document.title = `${currentTitle} - ${siteName}`;
            }
            
            // 更新网站描述和关键词meta标签
            // ...
            
            // 更新页面中的站点名称
            // ...
            
            // 加载Logo
            // ...
            
            // 更新页脚文本
            // ...
        }
    } catch (error) {
        console.error('加载站点信息失败:', error);
    }
}
```

## 批量更新所有页面

### 自动更新（需要Node.js环境）

如果需要为所有页面添加站点信息加载脚本，可以使用以下命令：

```bash
node scripts/update-site-info.js
```

这个脚本会自动在所有HTML页面中添加站点信息加载脚本和必要的meta标签。

### 手动更新

如果没有Node.js环境，可以手动更新页面：

1. 确保已创建 `/public/js/site-info.js` 文件
2. 在每个HTML页面的 `<head>` 标签中添加以下代码：

```html
<meta name="description" content="一个简单易用的个人笔记管理平台">
<meta name="keywords" content="笔记,Markdown,知识管理">
<!-- 引入站点信息加载脚本 -->
<script src="./js/site-info.js"></script>
```

需要为以下所有页面添加：

- dashboard.html（主页面）
- login.html（登录页面）
- register.html（注册页面）
- settings.html（设置页面）
- note-editor.html（笔记编辑页面）
- tags.html（标签管理页面）
- note-share.html（笔记分享页面）
- trash.html（回收站页面）
- 其他所有页面...

## 注意事项

1. 上传Logo的文件大小限制为10MB
2. 只支持图片格式(jpg, png, gif, svg等)作为Logo
3. 站点信息更改后，所有页面会自动加载最新信息，无需手动更新
4. 为保证SEO效果，建议填写有意义的网站描述和关键词 