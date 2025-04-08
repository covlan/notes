/**
 * 内容头部组件
 * 封装页面顶部标题、视图切换和用户菜单区域
 */
class ContentHeader {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {String} options.containerId - 容器ID
   * @param {String} options.title - 页面标题
   * @param {String} options.icon - 标题图标类名(fontawesome)
   * @param {Boolean} options.showViewToggle - 是否显示视图切换按钮
   * @param {Boolean} options.showRefreshButton - 是否显示刷新按钮
   * @param {Function} options.onViewToggle - 视图切换回调
   * @param {Function} options.onRefresh - 刷新按钮点击回调
   * @param {String} options.defaultView - 默认视图模式 'grid' 或 'list'
   * @param {Array} options.actionButtons - 额外的操作按钮 [{icon, text, id, callback, tooltip}]
   * @param {Boolean} options.hideOnMobile - 是否在移动端隐藏，默认为true
   * @param {Object} options.user - 用户信息 {name, avatarUrl}
   * @param {Array} options.menuItems - 用户菜单项
   * @param {Function} options.onMenuItemClick - 菜单项点击回调
   */
  constructor(options) {
    this.options = Object.assign({
      containerId: 'contentHeader',
      title: '页面标题',
      icon: null,
      showViewToggle: true,
      showRefreshButton: true,
      onViewToggle: null,
      onRefresh: null,
      defaultView: 'grid',
      actionButtons: [],
      hideOnMobile: true,
      user: {
        name: '用户',
        avatarUrl: null
      },
      menuItems: [
        { action: 'edit-profile', icon: 'fas fa-user-edit', text: '编辑资料' },
        { action: 'settings', icon: 'fas fa-cog', text: '系统设置' },
        { divider: true },
        { action: 'logout', icon: 'fas fa-sign-out-alt', text: '退出登录' }
      ],
      onMenuItemClick: null
    }, options);

    // 初始化视图模式
    this.currentView = localStorage.getItem('viewMode') || this.options.defaultView;
    
    // 绑定事件处理函数为实例上下文
    // 这一步很关键，确保事件处理函数中的this引用当前组件实例
    this._viewToggleHandler = this._viewToggleHandler.bind(this);
    this._refreshHandler = this._refreshHandler.bind(this);
    this._menuToggleHandler = this._menuToggleHandler.bind(this);
    this._menuItemClickHandler = this._menuItemClickHandler.bind(this);
    this._documentClickHandler = this._documentClickHandler.bind(this);
    
    // 初始化DOM
    this.init();
    
    // 自动加载用户信息
    this.loadUserInfo();
  }

  /**
   * 初始化组件
   */
  init() {
    // 获取或创建容器
    this.container = document.getElementById(this.options.containerId);
    if (!this.container) {
      console.error(`找不到容器: #${this.options.containerId}`);
      return;
    }

    console.log('初始化ContentHeader组件', this.options.containerId);
    
    // 给容器添加一个标识符，用于检测是否已初始化
    this.container.dataset.initialized = 'false';

    // 渲染内容
    this.render();
    
    // 设置事件监听
    this.setupEventListeners();
    
    // 初始化页面标题
    if (this.options.title) {
      document.title = this.options.title + ' - 笔记平台';
    }
    
    // 处理移动端响应式适配 (首次初始化)
    this.handleResponsive();
    
    // 确保resize事件只绑定一次
    if (this.container.dataset.initialized !== 'true') {
      window.addEventListener('resize', () => this.handleResponsive());
      this.container.dataset.initialized = 'true';
      console.log('已绑定resize事件监听');
    }
    
    console.log('ContentHeader初始化完成:', {
      container: this.container ? `#${this.options.containerId}` : 'not found',
      currentView: this.currentView,
      showViewToggle: this.options.showViewToggle,
      showRefreshButton: this.options.showRefreshButton
    });
  }
  
  /**
   * 加载当前用户信息并更新组件
   */
  async loadUserInfo() {
    try {
      if (window.api) {
        console.log('ContentHeader: 正在加载用户信息...');
        const response = await window.api.getCurrentUser();
        
        if (response && response.success && response.user) {
          console.log('ContentHeader: 已获取用户信息', response.user);
          
          // 更新用户信息
          this.updateUser({
            name: response.user.displayName || response.user.username,
            avatarUrl: response.user.avatarUrl
          });
        } else {
          console.warn('ContentHeader: 获取用户信息失败', response);
        }
      } else {
        console.log('ContentHeader: API实例不可用，无法加载用户信息');
      }
    } catch (error) {
      console.error('ContentHeader: 加载用户信息出错:', error);
    }
  }

  /**
   * 渲染组件内容
   */
  render() {
    console.log('渲染ContentHeader组件');
    
    // 清空容器
    this.container.innerHTML = '';
    this.container.className = 'content-header';
    
    // 检测是否是移动端
    const isMobile = window.innerWidth <= 480;

    // 左侧区域：标题和视图切换
    const leftSection = document.createElement('div');
    leftSection.className = 'content-header-left';
    leftSection.style.display = 'flex';
    leftSection.style.alignItems = 'center';
    leftSection.style.gap = '15px';

    // 添加标题
    const title = document.createElement('h1');
    title.className = 'welcome-text';
    
    // 如果有图标，添加图标
    if (this.options.icon) {
      title.innerHTML = `<i class="${this.options.icon}"></i> ${this.options.title}`;
    } else {
      title.textContent = this.options.title;
    }
    
    leftSection.appendChild(title);

    // 添加视图切换按钮（非移动端或明确指定在移动端显示视图切换按钮）
    if (!isMobile && this.options.showViewToggle) {
      const viewToggle = document.createElement('div');
      viewToggle.className = 'view-toggle';
      
      // 网格视图按钮
      const gridBtn = document.createElement('button');
      gridBtn.className = `view-toggle-btn${this.currentView === 'grid' ? ' active' : ''}`;
      gridBtn.dataset.view = 'grid';
      gridBtn.type = 'button'; // 明确设置按钮类型
      gridBtn.innerHTML = '<i class="fas fa-th-large"></i> 卡片视图';
      viewToggle.appendChild(gridBtn);
      
      // 列表视图按钮
      const listBtn = document.createElement('button');
      listBtn.className = `view-toggle-btn${this.currentView === 'list' ? ' active' : ''}`;
      listBtn.dataset.view = 'list';
      listBtn.type = 'button'; // 明确设置按钮类型
      listBtn.innerHTML = '<i class="fas fa-list"></i> 列表视图';
      viewToggle.appendChild(listBtn);
      
      leftSection.appendChild(viewToggle);
    }
    
    // 添加操作按钮区域
    if (this.options.showRefreshButton || (!isMobile && this.options.actionButtons.length > 0)) {
      const topActions = document.createElement('div');
      topActions.className = 'top-actions';
      
      // 添加刷新按钮
      if (this.options.showRefreshButton) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'refresh-btn';
        refreshBtn.id = 'refreshBtn';
        refreshBtn.type = 'button'; // 明确设置按钮类型
        refreshBtn.title = '刷新';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        topActions.appendChild(refreshBtn);
      }
      
      // 添加额外的操作按钮 (仅在非移动端)
      if (!isMobile) {
        this.options.actionButtons.forEach(btn => {
          const actionBtn = document.createElement('button');
          actionBtn.className = 'action-btn';
          actionBtn.id = btn.id || '';
          actionBtn.type = 'button'; // 明确设置按钮类型
          actionBtn.title = btn.tooltip || btn.text;
          
          if (btn.icon) {
            actionBtn.innerHTML = `<i class="${btn.icon}"></i>`;
            if (btn.text) {
              actionBtn.innerHTML += ` <span>${btn.text}</span>`;
            }
          } else if (btn.text) {
            actionBtn.textContent = btn.text;
          }
          
          // 添加点击事件
          if (typeof btn.callback === 'function') {
            actionBtn.addEventListener('click', btn.callback);
          }
          
          topActions.appendChild(actionBtn);
        });
      }
      
      leftSection.appendChild(topActions);
    }

    this.container.appendChild(leftSection);

    // 右侧区域：用户信息（仅在非移动端）
    if (!isMobile) {
      const rightSection = document.createElement('div');
      rightSection.className = 'user-profile-container';
      
      // 创建用户头像元素
      this.createUserProfile(rightSection);
      
      // 创建用户菜单
      this.createUserMenu(rightSection);
      
      this.container.appendChild(rightSection);
    }
    
    // 如果是移动端，添加移动端特有的样式
    if (isMobile) {
      this.container.classList.add('mobile-header');
      this.container.style.padding = '10px 15px';
      this.container.style.justifyContent = 'space-between';
      
      // 确保标题样式适合移动端
      title.style.fontSize = '18px';
      title.style.margin = '0';
    }
    
    // 渲染后立即设置事件监听
    this.setupEventListeners();
    
    console.log('ContentHeader渲染完成');
  }
  
  /**
   * 创建用户头像元素
   * @param {HTMLElement} container - 用户头像容器
   */
  createUserProfile(container) {
    const { name, avatarUrl } = this.options.user;
    
    // 创建用户头像元素
    this.profile = document.createElement('div');
    this.profile.className = 'user-profile';
    
    // 创建头像元素
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    
    // 如果有头像URL，显示图片，否则显示用户名首字母
    if (avatarUrl) {
      avatar.innerHTML = `<img src="${avatarUrl}" alt="${name}" />`;
    } else {
      // 获取用户名首字母作为头像（大写）
      let firstLetter = '?';
      if (name && name.trim() !== '') {
        firstLetter = name.charAt(0).toUpperCase();
        // 设置data-initial属性，用于CSS根据首字母设置不同的背景颜色
        avatar.setAttribute('data-initial', firstLetter);
      }
      avatar.textContent = firstLetter;
    }
    
    // 添加到用户头像元素
    this.profile.appendChild(avatar);
    
    // 添加用户名元素
    const userName = document.createElement('div');
    userName.className = 'user-name';
    userName.textContent = name;
    this.profile.appendChild(userName);
    
    // 添加到容器
    container.appendChild(this.profile);
  }
  
  /**
   * 创建用户菜单
   * @param {HTMLElement} container - 菜单容器
   */
  createUserMenu(container) {
    // 创建菜单元素
    this.menu = document.createElement('div');
    this.menu.className = 'user-profile-menu';
    this.menu.id = 'userProfileMenu';
    this.menu.style.zIndex = '1000'; // 确保菜单在顶层
    
    // 添加调试边框
    if (this.options.debug) {
      this.menu.style.border = '2px solid red';
    }
    
    // 添加菜单项
    const menuItems = this.options.menuItems;
    
    menuItems.forEach(item => {
      if (item.divider) {
        // 添加分隔线
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        this.menu.appendChild(divider);
      } else {
        // 添加菜单项
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-item';
        
        if (item.action === 'logout') {
          menuItem.classList.add('delete');
        }
        
        menuItem.dataset.action = item.action;
        
        menuItem.innerHTML = `
          <i class="${item.icon}"></i>
          ${item.text}
        `;
        
        this.menu.appendChild(menuItem);
      }
    });
    
    // 直接添加到body，以防止层叠上下文问题
    document.body.appendChild(this.menu);
    
    // 记录菜单已添加到body
    console.log('用户菜单已添加到body');
    
    // 确保菜单最初不可见
    this.menu.classList.remove('show');
    this.menu.style.display = 'none';
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    console.log('设置ContentHeader事件监听');
    
    // 视图切换
    if (this.options.showViewToggle) {
      const viewToggleBtns = this.container.querySelectorAll('.view-toggle-btn');
      console.log('找到视图切换按钮:', viewToggleBtns.length, '个');
      
      if (viewToggleBtns.length === 0) {
        console.warn('没有找到视图切换按钮！');
      }
      
      viewToggleBtns.forEach(btn => {
        // 先移除当前节点上的所有点击事件
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // 添加点击事件，这里的this._viewToggleHandler已经在构造函数中绑定了this
        newBtn.addEventListener('click', this._viewToggleHandler);
        
        // 添加调试事件以检查是否能捕获点击
        newBtn.addEventListener('click', function(e) {
          console.log('原始按钮点击捕获:', this.dataset.view);
          // 阻止事件继续传播，以防止表单提交等行为
          e.preventDefault();
        });
        
        console.log(`为按钮 ${newBtn.dataset.view} 添加了点击事件`);
      });
    }
    
    // 刷新按钮
    const refreshBtn = this.container.querySelector('#refreshBtn');
    if (refreshBtn) {
      console.log('找到刷新按钮');
      
      // 替换按钮以清除所有事件监听器
      const newRefreshBtn = refreshBtn.cloneNode(true);
      refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);
      
      // 添加点击事件，this._refreshHandler已在构造函数中绑定
      newRefreshBtn.addEventListener('click', this._refreshHandler);
      
      // 添加调试事件
      newRefreshBtn.addEventListener('click', function(e) {
        console.log('刷新按钮点击捕获 - 原始事件');
        e.preventDefault();
      });
      
      console.log('为刷新按钮添加了点击事件');
    } else if (this.options.showRefreshButton) {
      console.warn('配置了显示刷新按钮，但没有找到刷新按钮元素！');
    }
    
    // 用户头像菜单事件
    if (this.profile) {
      console.log('找到用户头像元素');
      
      // 替换元素以清除所有事件
      const newProfile = this.profile.cloneNode(true);
      this.profile.parentNode.replaceChild(newProfile, this.profile);
      this.profile = newProfile;
      
      // 添加点击事件
      this.profile.addEventListener('click', this._menuToggleHandler);
      
      // 调试事件
      this.profile.addEventListener('click', function(e) {
        console.log('用户头像点击捕获 - 原始事件');
        e.stopPropagation();
      });
      
      console.log('为用户头像添加了点击事件');
      
      // 点击菜单项
      if (this.menu) {
        const menuItems = this.menu.querySelectorAll('.menu-item');
        
        // 使用已绑定的事件处理函数
        const boundMenuItemClickHandler = this._menuItemClickHandler;
        
        menuItems.forEach(item => {
          // 替换元素以清除所有事件
          const newItem = item.cloneNode(true);
          item.parentNode.replaceChild(newItem, item);
          
          // 添加事件 - 使用已绑定的函数
          newItem.addEventListener('click', boundMenuItemClickHandler);
        });
        
        console.log(`为${menuItems.length}个菜单项添加了点击事件`);
      }
    }
    
    // 点击文档隐藏菜单
    // 由于可能多次调用setupEventListeners，确保只添加一次document事件监听
    if (!this._documentEventAdded) {
      document.removeEventListener('click', this._documentClickHandler); // 移除可能存在的先前事件
      document.addEventListener('click', this._documentClickHandler);
      this._documentEventAdded = true;
      console.log('为document添加了点击事件');
    }
    
    console.log('ContentHeader事件监听设置完成');
  }
  
  /**
   * 视图切换事件处理函数
   * @param {Event} event - 点击事件
   */
  _viewToggleHandler(event) {
    const btn = event.currentTarget;
    const view = btn.dataset.view;
    
    console.log('视图切换按钮点击:', view);
    
    // 更新当前视图
    this.currentView = view;
    
    // 更新按钮状态
    const viewToggleBtns = this.container.querySelectorAll('.view-toggle-btn');
    viewToggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 保存视图偏好
    localStorage.setItem('viewMode', this.currentView);
    
    // 更新主内容区域的类名
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      // 保持现有的类，只更改视图相关的部分
      const classList = mainContent.className.split(' ')
        .filter(cls => !cls.startsWith('view-'));
      classList.push(`view-${this.currentView}`);
      mainContent.className = classList.join(' ');
      
      // 确保侧边栏状态一致
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      if (isCollapsed && !mainContent.classList.contains('expanded')) {
        mainContent.classList.add('expanded');
      }
    }
    
    // 触发回调
    if (typeof this.options.onViewToggle === 'function') {
      console.log('触发视图切换回调:', this.currentView);
      this.options.onViewToggle(this.currentView);
    } else {
      console.log('未设置视图切换回调，尝试使用通用的NotesLoader');
      
      // 尝试使用全局NotesLoader
      if (window.notesLoader && typeof window.notesLoader.loadNotes === 'function') {
        console.log('使用全局NotesLoader更新视图');
        // 获取上次查询参数并更新视图模式
        let options = window.notesLoader.lastQuery || {};
        options = {...options, viewMode: this.currentView};
        window.notesLoader.loadNotes(options);
      }
    }
  }
  
  /**
   * 刷新按钮事件处理函数
   * @param {Event} event - 点击事件
   */
  async _refreshHandler(event) {
    const refreshBtn = event.currentTarget;
    console.log('刷新按钮点击');
    
    // 添加加载动画
    refreshBtn.classList.add('loading');
    
    try {
      // 调用刷新回调
      if (typeof this.options.onRefresh === 'function') {
        await this.options.onRefresh();
        console.log('刷新完成');
      }
    } catch (error) {
      console.error('刷新操作失败:', error);
      // 如果有全局Toast组件，可以显示错误提示
      if (window.ToastMessage) {
        window.ToastMessage.error('刷新失败: ' + (error.message || '未知错误'));
      }
    } finally {
      // 无论成功失败，延迟移除加载状态
      setTimeout(() => {
        refreshBtn.classList.remove('loading');
      }, 500);
    }
  }
  
  /**
   * 用户菜单切换事件处理函数
   * @param {Event} event - 点击事件
   */
  _menuToggleHandler(event) {
    event.stopPropagation(); // 阻止事件冒泡
    event.preventDefault(); // 阻止默认行为
    
    // 为了调试，记录点击坐标
    console.log('用户头像点击 - 位置:', { 
      x: event.clientX, 
      y: event.clientY, 
      element: event.target.tagName 
    });
    
    this.toggleMenu();
  }
  
  /**
   * 菜单项点击事件处理函数
   * @param {Event} event - 点击事件
   */
  _menuItemClickHandler(event) {
    const item = event.currentTarget;
    const action = item.dataset.action;
    
    // 阻止事件传播
    event.stopPropagation();
    
    console.log('菜单项点击:', action);
    
    // 处理常见的菜单操作
    if (action === 'edit-profile') {
      window.location.href = 'profile-edit.html';
    } else if (action === 'settings') {
      window.location.href = 'settings.html';
    } else if (action === 'logout') {
      // 处理退出登录
      if (window.confirmLogout) {
        window.confirmLogout();
      } else {
        // 默认退出登录处理
        if (confirm('确定要退出登录吗？')) {
          localStorage.removeItem('token');
          window.location.href = 'login.html';
        }
      }
    } else if (typeof this.options.onMenuItemClick === 'function') {
      // 如果有自定义处理函数，交给它处理
      this.options.onMenuItemClick(action, event);
    }
    
    // 隐藏菜单
    this.hideMenu();
  }
  
  /**
   * 文档点击事件处理函数
   * @param {Event} event - 点击事件
   */
  _documentClickHandler(event) {
    // 检查是否已经在另一个处理程序中处理过
    if (event._handled) {
      return;
    }
    
    // 标记为已处理
    event._handled = true;
    
    // 避免点击菜单本身和用户头像时关闭菜单
    if (this.profile && this.menu && 
        !this.profile.contains(event.target) && 
        !this.menu.contains(event.target)) {
      console.log('文档点击事件 - 关闭菜单');
      this.hideMenu();
    }
  }

  /**
   * 切换菜单显示/隐藏
   */
  toggleMenu() {
    if (this.menu) {
      console.log('切换菜单显示状态');
      
      // 确保菜单在DOM中
      if (!document.body.contains(this.menu)) {
        console.warn('菜单不在DOM中，重新添加到body');
        document.body.appendChild(this.menu);
      }
      
      const isVisible = this.menu.classList.contains('show');
      
      if (!isVisible) {
        // 显示菜单
        
        // 更新菜单位置 - 相对于用户头像定位
        if (this.profile) {
          const rect = this.profile.getBoundingClientRect();
          
          // 使用绝对定位而非fixed，以便在滚动时随页面一起移动
          this.menu.style.position = 'fixed';
          this.menu.style.top = (rect.bottom + 10) + 'px';
          this.menu.style.right = (window.innerWidth - rect.right) + 'px';
          
          console.log('菜单位置已更新:', {
            top: this.menu.style.top,
            right: this.menu.style.right,
            profileRect: {
              bottom: rect.bottom,
              right: rect.right
            }
          });
        } else {
          console.warn('未找到profile元素，无法正确定位菜单');
        }
        
        // 先确保菜单可见，再添加显示class (避免过渡动画问题)
        this.menu.style.display = 'block';
        
        // 使用setTimeout确保DOM更新，然后添加动画class
        setTimeout(() => {
          this.menu.classList.add('show');
          console.log('菜单已显示');
        }, 10);
      } else {
        // 隐藏菜单 - 先移除show class，然后等待过渡动画完成后隐藏元素
        this.menu.classList.remove('show');
        
        // 等待过渡动画完成
        setTimeout(() => {
          this.menu.style.display = 'none';
          console.log('菜单已隐藏');
        }, 300); // 300ms是过渡动画的持续时间
      }
    } else {
      console.warn('菜单元素不存在，创建新菜单');
      
      // 动态创建菜单
      this.menu = document.createElement('div');
      this.menu.className = 'user-profile-menu';
      this.menu.id = 'userProfileMenu';
      
      // 添加基本的退出登录选项
      const logoutItem = document.createElement('div');
      logoutItem.className = 'menu-item delete';
      logoutItem.dataset.action = 'logout';
      logoutItem.innerHTML = '<i class="fas fa-sign-out-alt"></i> 退出登录';
      
      this.menu.appendChild(logoutItem);
      
      // 添加到body
      document.body.appendChild(this.menu);
      
      // 设置位置并显示
      if (this.profile) {
        const rect = this.profile.getBoundingClientRect();
        this.menu.style.position = 'fixed';
        this.menu.style.top = (rect.bottom + 10) + 'px';
        this.menu.style.right = (window.innerWidth - rect.right) + 'px';
        this.menu.style.zIndex = '1000';
      }
      
      this.menu.style.display = 'block';
      
      // 设置点击事件
      this.setupEventListeners();
      
      // 显示菜单
      setTimeout(() => {
        this.menu.classList.add('show');
      }, 10);
    }
  }

  /**
   * 显示菜单
   */
  showMenu() {
    if (this.menu) {
      console.log('显示菜单');
      
      // 更新菜单位置
      if (this.profile) {
        const rect = this.profile.getBoundingClientRect();
        this.menu.style.position = 'fixed';
        this.menu.style.top = (rect.bottom + 10) + 'px';
        this.menu.style.right = (window.innerWidth - rect.right) + 'px';
      }
      
      // 确保菜单可见
      this.menu.style.display = 'block';
      
      // 添加show class
      setTimeout(() => {
        this.menu.classList.add('show');
      }, 10);
    } else {
      console.warn('菜单元素不存在，无法显示');
    }
  }

  /**
   * 隐藏菜单
   */
  hideMenu() {
    if (this.menu) {
      console.log('隐藏菜单');
      
      // 移除show class
      this.menu.classList.remove('show');
      
      // 等待过渡动画完成后隐藏元素
      setTimeout(() => {
        this.menu.style.display = 'none';
      }, 300);
    } else {
      console.warn('菜单元素不存在，无法隐藏');
    }
  }
  
  /**
   * 处理移动端响应式适配
   */
  handleResponsive() {
    // 根据屏幕宽度和hideOnMobile选项决定是否显示
    const isMobile = window.innerWidth <= 480;
    
    // 记录当前是否是移动设备的状态，用于检测状态变化
    const wasMobile = this.container.classList.contains('mobile-header');
    
    // 修改隐藏逻辑，即使在移动端也显示组件（除非明确hideOnMobile为true）
    if (isMobile && this.options.hideOnMobile) {
      this.container.style.display = 'none';
    } else {
      this.container.style.display = 'flex';
      
      // 如果是移动端，添加mobile-header类
      if (isMobile) {
        this.container.classList.add('mobile-header');
        
        // 调整移动端样式
        if (this.container.querySelector('.welcome-text')) {
          this.container.querySelector('.welcome-text').style.fontSize = '18px';
          this.container.querySelector('.welcome-text').style.margin = '0';
        }
        
        this.container.style.padding = '10px 15px';
        this.container.style.justifyContent = 'space-between';
      } else {
        this.container.classList.remove('mobile-header');
        
        // 恢复非移动端样式
        if (this.container.querySelector('.welcome-text')) {
          this.container.querySelector('.welcome-text').style.fontSize = '';
          this.container.querySelector('.welcome-text').style.margin = '';
        }
        
        this.container.style.padding = '';
        this.container.style.justifyContent = '';
      }
      
      // 只有在移动状态发生变化时才重新渲染
      // 例如：从桌面视图切换到移动视图，或反之
      if (wasMobile !== isMobile) {
        console.log('视图模式切换 - 重新渲染内容:', wasMobile ? '桌面视图' : '移动视图', '->', isMobile ? '移动视图' : '桌面视图');
        this.render();
      }
    }
    
    // 调试信息
    console.log('ContentHeader响应式处理: ', {
      isMobile: isMobile,
      wasMobile: wasMobile,
      hideOnMobile: this.options.hideOnMobile,
      显示状态: this.container.style.display
    });
  }
  
  /**
   * 更新标题
   * @param {String} title - 新标题
   * @param {String} icon - 新图标 (可选)
   */
  updateTitle(title, icon) {
    const titleEl = this.container.querySelector('.welcome-text');
    if (titleEl) {
      if (icon) {
        titleEl.innerHTML = `<i class="${icon}"></i> ${title}`;
      } else {
        titleEl.textContent = title;
      }
      
      // 更新页面标题
      document.title = title + ' - 笔记平台';
    }
  }
  
  /**
   * 添加操作按钮
   * @param {Object} button - 按钮配置 {icon, text, id, callback, tooltip}
   */
  addActionButton(button) {
    const topActions = this.container.querySelector('.top-actions');
    if (!topActions) return;
    
    const actionBtn = document.createElement('button');
    actionBtn.className = 'action-btn';
    actionBtn.id = button.id || '';
    actionBtn.title = button.tooltip || button.text;
    
    if (button.icon) {
      actionBtn.innerHTML = `<i class="${button.icon}"></i>`;
      if (button.text) {
        actionBtn.innerHTML += ` <span>${button.text}</span>`;
      }
    } else if (button.text) {
      actionBtn.textContent = button.text;
    }
    
    // 添加点击事件
    if (typeof button.callback === 'function') {
      actionBtn.addEventListener('click', button.callback);
    }
    
    topActions.appendChild(actionBtn);
  }
  
  /**
   * 设置内容可见性
   * @param {Boolean} visible - 是否可见
   */
  setVisible(visible) {
    this.container.style.display = visible ? 'flex' : 'none';
  }
  
  /**
   * 更新用户信息
   * @param {Object} user - 新的用户信息
   */
  updateUser(user) {
    // 更新选项中的用户信息
    this.options.user = Object.assign(this.options.user, user);
    
    // 重新渲染组件
    this.render();
  }

  /**
   * 更新菜单项
   * @param {Array} menuItems - 新的菜单项配置
   */
  updateMenuItems(menuItems) {
    // 更新选项中的菜单项
    this.options.menuItems = menuItems;
    
    // 重新渲染组件
    this.render();
  }
  
  /**
   * 设置视图模式
   * @param {String} viewMode - 视图模式 'grid' 或 'list'
   * @param {Boolean} triggerCallback - 是否触发回调函数，默认为true
   */
  setViewMode(viewMode) {
    if (viewMode !== 'grid' && viewMode !== 'list') {
      console.error('无效的视图模式:', viewMode);
      return;
    }
    
    console.log('手动设置视图模式:', viewMode);
    
    // 更新当前视图
    this.currentView = viewMode;
    
    // 保存视图偏好
    localStorage.setItem('viewMode', viewMode);
    
    // 更新按钮状态
    const viewToggleBtns = this.container.querySelectorAll('.view-toggle-btn');
    viewToggleBtns.forEach(btn => {
      if (btn.dataset.view === viewMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // 更新主内容区域的类名
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      // 保持现有的类，只更改视图相关的部分
      const classList = mainContent.className.split(' ')
        .filter(cls => !cls.startsWith('view-'));
      classList.push(`view-${viewMode}`);
      mainContent.className = classList.join(' ');
    }
    
    // 不主动触发回调，避免循环调用
    // 此方法通常由外部直接调用，已经做了相应的视图更新处理
  }

  /**
   * 调试组件状态
   * @returns {Object} 组件状态信息
   */
  debug() {
    const state = {
      container: this.container ? {
        id: this.container.id,
        className: this.container.className,
        childrenCount: this.container.children.length
      } : null,
      currentView: this.currentView,
      profile: this.profile ? {
        exists: true,
        eventsAttached: typeof this._menuToggleHandler === 'function'
      } : null,
      menu: this.menu ? {
        exists: true,
        id: this.menu.id,
        className: this.menu.className,
        isVisible: this.menu.classList.contains('show'),
        itemsCount: this.menu.querySelectorAll('.menu-item').length
      } : null,
      viewToggleButtons: Array.from(this.container?.querySelectorAll('.view-toggle-btn') || []).map(btn => ({
        view: btn.dataset.view,
        isActive: btn.classList.contains('active')
      })),
      refreshButton: this.container?.querySelector('#refreshBtn') ? {
        exists: true,
        eventsAttached: typeof this._refreshHandler === 'function'
      } : null,
      options: {
        showViewToggle: this.options.showViewToggle,
        showRefreshButton: this.options.showRefreshButton,
        defaultView: this.options.defaultView,
        hideOnMobile: this.options.hideOnMobile
      }
    };
    
    console.log('ContentHeader状态:', state);
    return state;
  }
}

// 全局导出组件
window.ContentHeader = ContentHeader;

// 添加一个用于调试的全局函数
window.debugContentHeader = function() {
  if (window.contentHeader) {
    return window.contentHeader.debug();
  } else {
    console.error('ContentHeader实例不可用');
    return {
      error: 'ContentHeader实例不可用',
      globalInstance: {
        exists: typeof window.ContentHeader === 'function',
        isClass: typeof window.ContentHeader === 'function' && /^class\s/.test(window.ContentHeader.toString())
      }
    };
  }
}; 