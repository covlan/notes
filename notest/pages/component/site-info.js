/**
 * 站点信息加载脚本
 * 用于从API获取并设置全局站点信息
 */

// 定义站点信息对象
const siteInfo = {
  title: '笔记平台',
  description: '一个简单易用的个人笔记管理平台',
  logo: null,
  adminEmail: 'admin@example.com',
  version: '1.0.0',
  keywords: '笔记,记事本,备忘录',
  footerText: '© 2023 笔记平台',
  // 在页面加载完成后从API获取
  isLoaded: false
};

// API基础URL - 确保使用当前页面的协议和主机
const API_BASE_URL = location.protocol + '//' + location.host;

// 设置URL重写功能
function setupUrlRewriting() {
  // 检查当前URL是否包含.html后缀
  if (window.location.pathname.endsWith('.html')) {
    // 重定向到无后缀URL
    const newPath = window.location.pathname.replace('.html', '');
    window.history.replaceState({}, '', newPath + window.location.search + window.location.hash);
  }

  // 拦截所有链接点击事件
  document.addEventListener('click', (e) => {
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
  document.addEventListener('submit', (e) => {
    const form = e.target;
    const action = form.getAttribute('action');
    if (action && action.endsWith('.html') && !action.startsWith('http')) {
      e.preventDefault();
      form.setAttribute('action', action.replace('.html', ''));
      form.submit();
    }
  });
}

// 异步获取站点信息
async function loadSiteInfo() {
  try {
    // 首先检查localStorage中是否有站点信息
    const storedSiteInfo = localStorage.getItem('siteInfo');
    if (storedSiteInfo) {
      try {
        const parsedSiteInfo = JSON.parse(storedSiteInfo);

        // 更新站点信息
        if (parsedSiteInfo.title) siteInfo.title = parsedSiteInfo.title;
        if (parsedSiteInfo.description) siteInfo.description = parsedSiteInfo.description;
        if (parsedSiteInfo.logo) siteInfo.logo = parsedSiteInfo.logo;
        if (parsedSiteInfo.keywords) siteInfo.keywords = parsedSiteInfo.keywords;
        if (parsedSiteInfo.footerText) siteInfo.footerText = parsedSiteInfo.footerText;

        // 标记为已加载
        siteInfo.isLoaded = true;

        // 更新UI
        updatePageTitle();
        updateMetaTags();
        updateSiteName();
        updateLogo();
        updateFooter();

        // 返回站点信息
        return siteInfo;
      } catch (parseError) {
        throw error;
        // 继续从服务器加载
      }
    }

    // 只有在还没有加载过的情况下才从服务器加载
    if (!siteInfo.isLoaded) {
      // 尝试两个可能的API端点
      const endpoints = [
        `${API_BASE_URL}/api/settings/public-info`,
        `${API_BASE_URL}/api/settings/site/public`
      ];

      let response = null;
      let url = '';

      // 尝试第一个端点
      url = endpoints[0];
      response = await fetch(url);

      // 如果第一个端点失败，尝试第二个端点
      if (!response.ok) {
        url = endpoints[1];
        response = await fetch(url);
      }

      if (response.ok) {
        const data = await response.json();

        // 处理两种可能的响应格式
        let siteData = null;

        if (data.success && data.info) {
          // 第一种API格式
          siteData = data.info;
        } else if (data.success && data.siteInfo) {
          // 第二种API格式
          siteData = data.siteInfo;
        }

        if (siteData) {
          // 更新站点信息
          if (siteData.title || siteData.siteTitle) {
            siteInfo.title = siteData.title || siteData.siteTitle || siteInfo.title;
          }

          if (siteData.description || siteData.siteDescription) {
            siteInfo.description = siteData.description || siteData.siteDescription || siteInfo.description;
          }

          if (siteData.logo || siteData.siteLogo) {
            siteInfo.logo = siteData.logo || siteData.siteLogo || siteInfo.logo;
          }

          if (siteData.adminEmail) {
            siteInfo.adminEmail = siteData.adminEmail || siteInfo.adminEmail;
          }

          if (siteData.version) {
            siteInfo.version = siteData.version || siteInfo.version;
          }

          if (siteData.keywords || siteData.siteKeywords) {
            siteInfo.keywords = siteData.keywords || siteData.siteKeywords || siteInfo.keywords;
          }

          if (siteData.footerText) {
            siteInfo.footerText = siteData.footerText || siteInfo.footerText;
          }

          // 标记为已加载
          siteInfo.isLoaded = true;

          // 将站点信息保存到localStorage中
          try {
            const siteInfoToStore = {
              title: siteInfo.title,
              description: siteInfo.description,
              logo: siteInfo.logo,
              keywords: siteInfo.keywords,
              footerText: siteInfo.footerText
            };
            localStorage.setItem('siteInfo', JSON.stringify(siteInfoToStore));
          } catch (storeError) {
            throw error;
          }

          // 只在成功加载后更新UI
          updatePageTitle();
          updateMetaTags();
          updateSiteName();
          updateLogo();
          updateFooter();
        }
      }
    }

    return siteInfo;
  } catch (error) {
    return siteInfo;
  }
}

// 更新页面标题
function updatePageTitle() {
  if (siteInfo.title) {
    const currentTitle = document.title;
    // 如果标题中不包含站点名称，则添加站点名称
    if (!currentTitle.includes(siteInfo.title)) {
      document.title = currentTitle.replace('笔记平台', siteInfo.title);
      // 如果没有替换成功（可能原标题不包含"笔记平台"），则追加站点名称
      if (document.title === currentTitle) {
        document.title = `${currentTitle} - ${siteInfo.title}`;
      }
    }
  }
}

// 更新Meta标签
function updateMetaTags() {
  // 更新描述
  if (siteInfo.description) {
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', siteInfo.description);
  }

  // 更新关键词
  if (siteInfo.keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', siteInfo.keywords);
  }
}

// 更新站点名称
function updateSiteName() {
  document.querySelectorAll('.logo span').forEach(element => {
    element.textContent = siteInfo.title;
  });
}

// 更新Logo
function updateLogo() {
  if (siteInfo.logo) {
    // 只更新非sidebar和非login页面的logo图标
    document.querySelectorAll('.logo i:not(.sidebar-logo):not(.login-logo)').forEach(element => {
      // 创建图片元素替换图标
      const img = document.createElement('img');
      img.src = siteInfo.logo;
      img.alt = siteInfo.title;
      img.style.maxHeight = '28px';
      img.style.marginRight = '10px';

      element.parentNode.replaceChild(img, element);
    });
  }
}

// 更新页脚
function updateFooter() {
  document.querySelectorAll('.footer-text').forEach(element => {
    element.textContent = siteInfo.footerText;
  });
}

// 在DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // 设置URL重写功能
  setupUrlRewriting();

  // 加载站点信息 - 只调用一次
  loadSiteInfo();

  // 注意：不需要再次调用这些函数，因为它们已经在loadSiteInfo成功后被调用
  // updatePageTitle();
  // updateMetaTags();
  // updateSiteName();
  // updateLogo();
  // updateFooter();
});

// 导出站点信息对象和相关函数
window.siteInfo = siteInfo;
window.loadSiteInfo = loadSiteInfo;
window.updateSiteName = updateSiteName;
window.updateLogo = updateLogo;
window.updateFooter = updateFooter;
window.updatePageTitle = updatePageTitle;
window.updateMetaTags = updateMetaTags;