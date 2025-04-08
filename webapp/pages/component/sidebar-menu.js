/**
 * 侧边栏导航菜单组件
 * 将侧边栏导航菜单封装为可复用组件
 */

class SidebarMenu {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {String} options.containerId - 容器ID
   * @param {String} options.logoText - Logo文本
   * @param {String} options.logoIcon - Logo图标
   * @param {Array} options.menuItems - 菜单项配置
   * @param {Function} options.onMenuItemClick - 菜单项点击回调
   * @param {Boolean} options.collapsible - 是否可折叠
   * @param {Boolean} options.mobileMode - 是否启用移动模式
   */
  constructor(options) {
    this.options = Object.assign({
      containerId: 'sidebar',
      logoText: '笔记平台',
      logoIcon: 'fas fa-book',
      menuItems: [
        { id: 'home', text: '我的笔记', icon: 'fas fa-home', active: true, page: 'dashboard' },
        { id: 'starred', text: '收藏笔记', icon: 'fas fa-star', page: 'starred-notes' },
        { id: 'categories', text: '笔记分类', icon: 'fas fa-folder', page: 'note-categories' },
        { id: 'tags', text: '标签管理', icon: 'fas fa-tags', page: 'tags' },
        { id: 'shared', text: '分享笔记', icon: 'fas fa-share-alt', page: 'note-share' },
        { id: 'trash', text: '回收站', icon: 'fas fa-trash', page: 'trash' }
      ],
      onMenuItemClick: null,
      collapsible: true,
      mobileMode: true,
      autoNavigate: true // 是否自动导航到页面
    }, options);

    this.collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    
    try {
      this.initElements();
      this.setupEventListeners();
    } catch (error) {
      console.error('侧边栏菜单初始化失败:', error);
    }
  }

  /**
   * 初始化DOM元素
   */
  initElements() {
    // 获取容器元素
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`找不到容器: #${this.options.containerId}`);
      return;
    }

    // 清空容器
    this.container.innerHTML = '';
    this.container.className = 'sidebar';
    if (this.collapsed) {
      this.container.classList.add('collapsed');
    }

    // 创建侧边栏头部
    const sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'sidebar-header';

    // 创建Logo
    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.id = 'toggleSidebar';

    // Logo图标处理
    const logoIconClass = this.options.logoIcon || 'fas fa-book';
    
    // 直接创建图标元素并强制指定类名
    const logoIcon = document.createElement('i');
    logoIcon.className = `${logoIconClass} sidebar-logo`;
    logoIcon.setAttribute('aria-hidden', 'true');
    
    // 确保类名正确应用
    if (!logoIcon.classList.contains('fas') && !logoIcon.classList.contains('far')) {
      // 添加基础图标类
      logoIcon.classList.add('fas');
    }
    
    // 添加特定的内联样式，防止外部样式影响
    logoIcon.style.display = 'inline-block';
    logoIcon.style.width = '24px';
    logoIcon.style.textAlign = 'center';
    
    // 记录logo图标信息
    console.log('创建Logo图标:', logoIconClass);
    
    logo.appendChild(logoIcon);

    // 创建文本
    const logoSpan = document.createElement('span');
    logoSpan.textContent = this.options.logoText;
    logo.appendChild(logoSpan);

    sidebarHeader.appendChild(logo);
    this.container.appendChild(sidebarHeader);

    // 创建导航菜单
    const navMenu = document.createElement('div');
    navMenu.className = 'nav-menu';

    // 渲染菜单项
    this.options.menuItems.forEach(item => {
      const navItem = document.createElement('div');
      navItem.className = `nav-item${item.active ? ' active' : ''}`;
      navItem.dataset.id = item.id;
      navItem.dataset.tooltip = item.text;
      
      // 添加页面链接数据
      if (item.page) {
        navItem.dataset.page = item.page;
      }

      // 菜单项图标处理
      const iconClass = item.icon || 'fas fa-sticky-note';
      
      // 直接创建图标元素并指定类名
      const icon = document.createElement('i');
      icon.className = iconClass;
      icon.setAttribute('aria-hidden', 'true');
      
      // 确保基础类名存在
      if (!icon.classList.contains('fas') && !icon.classList.contains('far')) {
        icon.classList.add('fas');
      }
      
      // 添加内联样式确保显示
      icon.style.display = 'inline-block';
      icon.style.width = '24px';
      icon.style.textAlign = 'center';
      
      navItem.appendChild(icon);

      const span = document.createElement('span');
      span.textContent = item.text;
      navItem.appendChild(span);

      if (item.badge) {
        const badge = document.createElement('div');
        badge.className = 'nav-badge';
        badge.textContent = item.badge;
        navItem.appendChild(badge);
      }

      navMenu.appendChild(navItem);
    });

    this.container.appendChild(navMenu);

    // 创建移动端菜单按钮
    this.createMobileMenuButton();
    
    // 激活当前页面对应的菜单项
    this.setActiveByCurrentPage();
  }
  
  /**
   * 创建移动端菜单按钮
   */
  createMobileMenuButton() {
    if (!this.options.mobileMode) return;
    
    // 如果已存在，先移除
    const existingButton = document.getElementById('mobileMenuButton');
    if (existingButton) existingButton.remove();
    
    // 创建新按钮
    const button = document.createElement('div');
    button.id = 'mobileMenuButton';
    button.className = 'mobile-menu-button';
    
    // 添加图标
    const icon = document.createElement('i');
    icon.className = 'fas fa-bars';
    button.appendChild(icon);
    
    // 设置固定样式 - 与新增笔记按钮相同
    button.style.position = 'fixed';
    button.style.bottom = '30px';
    button.style.left = '30px';
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = 'var(--primary-color)';
    button.style.color = 'white';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
    button.style.zIndex = '1050';
    button.style.transition = 'all 0.3s ease';
    
    // 根据屏幕大小调整样式
    if (window.innerWidth <= 480) {
      button.style.bottom = '20px';
      button.style.left = '20px';
      button.style.width = '50px';
      button.style.height = '50px';
    }
    
    // 默认先隐藏，只在移动端显示
    if (window.innerWidth > 768) {
      button.style.display = 'none';
    }
    
    // 添加到页面
    document.body.appendChild(button);
    this.mobileMenuButton = button;
    
    // 添加事件监听
    this.setupMobileMenuButtonEvents();
  }
  
  /**
   * 设置移动端菜单按钮的事件
   */
  setupMobileMenuButtonEvents() {
    if (!this.mobileMenuButton) return;
    
    // 添加点击事件
    this.mobileMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.container.classList.toggle('show');
    });
    
    // 添加悬停效果
    this.mobileMenuButton.addEventListener('mouseover', () => {
      this.mobileMenuButton.style.transform = 'scale(1.1)';
      this.mobileMenuButton.style.boxShadow = '0 6px 15px rgba(0, 0, 0, 0.2)';
    });
    
    this.mobileMenuButton.addEventListener('mouseout', () => {
      this.mobileMenuButton.style.transform = '';
      this.mobileMenuButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
    });
    
    // 添加窗口大小变化事件
    window.addEventListener('resize', () => {
      if (!this.mobileMenuButton) return;
      
      // 控制移动端菜单按钮的显示与隐藏
      if (window.innerWidth <= 768) {
        this.mobileMenuButton.style.display = 'flex';
        
        // 小屏幕尺寸适配
        if (window.innerWidth <= 480) {
          this.mobileMenuButton.style.bottom = '20px';
          this.mobileMenuButton.style.left = '20px';
          this.mobileMenuButton.style.width = '50px';
          this.mobileMenuButton.style.height = '50px';
        } else {
          this.mobileMenuButton.style.bottom = '30px';
          this.mobileMenuButton.style.left = '30px';
          this.mobileMenuButton.style.width = '60px';
          this.mobileMenuButton.style.height = '60px';
        }
      } else {
        // 非移动端隐藏按钮
        this.mobileMenuButton.style.display = 'none';
        // 同时确保侧边栏处于正常状态
        this.container.classList.remove('show');
      }
    });
    
    // 添加点击其他区域关闭菜单的事件
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          !this.container.contains(e.target) &&
          e.target !== this.mobileMenuButton) {
        this.container.classList.remove('show');
      }
    });
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 侧边栏折叠/展开
    if (this.options.collapsible) {
      const toggleSidebar = document.getElementById('toggleSidebar');
      if (toggleSidebar) {
        // 移除旧的事件监听器
        const newToggleSidebar = toggleSidebar.cloneNode(true);
        toggleSidebar.parentNode.replaceChild(newToggleSidebar, toggleSidebar);
        
        newToggleSidebar.addEventListener('click', () => {
          this.toggleSidebar();
        });
      }
    }

    // 菜单项点击事件
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      // 移除旧的事件监听器
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
      
      newItem.addEventListener('click', (e) => {
        const id = newItem.dataset.id;
        const text = newItem.dataset.tooltip;
        const page = newItem.dataset.page;

        // 更新激活状态
        navItems.forEach(ni => ni.classList.remove('active'));
        newItem.classList.add('active');

        // 移动端自动关闭菜单
        if (window.innerWidth <= 768) {
          this.container.classList.remove('show');
        }

        // 调用回调函数
        if (typeof this.options.onMenuItemClick === 'function') {
          try {
            this.options.onMenuItemClick(id, text, e);
          } catch (error) {
            console.error(`菜单项 ${id} 点击回调执行错误:`, error);
          }
        }
        
        // 自动导航到页面
        if (this.options.autoNavigate && page) {
          try {
            const currentPage = this.getCurrentPage();
            if (page !== currentPage) {
              // 使用location.href来避免在同一标签中打开多个页面
              window.location.href = page;
            }
          } catch (error) {
            console.error(`导航到页面 ${page} 失败:`, error);
          }
        }
      });
    });
  }
  
  /**
   * 获取当前页面路径
   * @returns {String} 当前页面路径
   */
  getCurrentPage() {
    // 获取当前页面路径
    let path = window.location.pathname;
    
    // 移除开头的斜杠
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    // 移除.html后缀
    if (path.endsWith('.html')) {
      path = path.replace('.html', '');
    }
    
    // 如果路径为空，默认为dashboard
    if (!path) {
      path = 'dashboard';
    }
    
    return path;
  }
  
  /**
   * 根据当前页面设置激活的菜单项
   */
  setActiveByCurrentPage() {
    try {
      const currentPage = this.getCurrentPage();
      const navItems = this.container.querySelectorAll('.nav-item');
      
      // 先移除所有激活状态
      navItems.forEach(item => item.classList.remove('active'));
      
      // 是否找到匹配项的标志
      let foundMatch = false;
      
      // 根据当前页面设置激活状态
      navItems.forEach(item => {
        const page = item.dataset.page;
        if (page && (page === currentPage || 
                     (currentPage.includes(page.split('.')[0]) && 
                      page.split('.')[0].length > 0))) {
          item.classList.add('active');
          foundMatch = true;
        }
      });
      
      // 如果没有找到匹配项，默认激活首页
      if (!foundMatch && navItems.length > 0) {
        const homeItem = this.container.querySelector('.nav-item[data-id="home"]');
        if (homeItem) {
          homeItem.classList.add('active');
        } else {
          // 如果没有找到home项，则激活第一个
          navItems[0].classList.add('active');
        }
      }
    } catch (error) {
      console.error('设置当前页面菜单项激活状态失败:', error);
    }
  }

  /**
   * 切换侧边栏折叠/展开状态
   */
  toggleSidebar() {
    try {
      this.collapsed = !this.collapsed;
      this.container.classList.toggle('collapsed');
      
      // 触发主内容区域变化
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.classList.toggle('expanded');
      }
      
      // 保存状态到本地存储
      localStorage.setItem('sidebarCollapsed', this.collapsed);
      
      // 分发侧边栏状态变化事件
      const event = new CustomEvent('sidebarStateChanged', {
        detail: { collapsed: this.collapsed }
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error('切换侧边栏状态失败:', error);
    }
  }

  /**
   * 设置菜单项激活状态
   * @param {String} id - 菜单项ID
   */
  setActive(id) {
    try {
      const navItems = this.container.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        if (item.dataset.id === id) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    } catch (error) {
      console.error(`设置菜单项 ${id} 激活状态失败:`, error);
    }
  }

  /**
   * 更新菜单项
   * @param {Array} menuItems - 菜单项数组
   */
  updateMenuItems(menuItems) {
    try {
      this.options.menuItems = menuItems;
      this.initElements();
      this.setupEventListeners();
    } catch (error) {
      console.error('更新菜单项失败:', error);
    }
  }

  /**
   * 更新菜单项徽章
   * @param {Object} badges - 徽章设置 { menuId: badgeText }
   */
  updateBadges(badges) {
    try {
      for (const id in badges) {
        const navItem = this.container.querySelector(`.nav-item[data-id="${id}"]`);
        if (navItem) {
          // 删除现有徽章
          const existingBadge = navItem.querySelector('.nav-badge');
          if (existingBadge) {
            existingBadge.remove();
          }
  
          // 没有徽章文本就跳过
          if (!badges[id]) continue;
  
          // 创建新徽章
          const badge = document.createElement('div');
          badge.className = 'nav-badge';
          badge.textContent = badges[id];
          navItem.appendChild(badge);
        }
      }
    } catch (error) {
      console.error('更新菜单徽章失败:', error);
    }
  }
  
  /**
   * 显示侧边栏
   */
  show() {
    this.container.classList.remove('collapsed');
    this.collapsed = false;
    localStorage.setItem('sidebarCollapsed', 'false');
    
    // 触发主内容区域变化
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.classList.remove('expanded');
    }
  }
  
  /**
   * 隐藏侧边栏
   */
  hide() {
    this.container.classList.add('collapsed');
    this.collapsed = true;
    localStorage.setItem('sidebarCollapsed', 'true');
    
    // 触发主内容区域变化
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.classList.add('expanded');
    }
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SidebarMenu;
} else {
  window.SidebarMenu = SidebarMenu;
} 