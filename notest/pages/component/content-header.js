/**
 * 内容头部组件
 * 封装页面顶部标题、视图切换和用户菜单区域
 *
 * 注意：此组件的样式已经进行了特异性处理，以确保在所有页面上都使用组件的默认样式。
 * 请确保所有使用此组件的页面都引入了 content-header.css 文件。
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
        { action: 'export-notes', icon: 'fas fa-file-export', text: '导出笔记' },
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
      return;
    }

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
    }
  }

  /**
   * 加载当前用户信息并更新组件
   */
  async loadUserInfo() {
    try {
      if (window.api) {
        try {
          const response = await window.api.getCurrentUser();

          if (response && response.success && response.user) {
            // 更新用户信息
            this.updateUser({
              name: response.user.displayName || response.user.username,
              avatarUrl: response.user.avatarUrl
            });
          } else {
            // 使用默认用户信息
            this.updateUser({
              name: '未登录用户',
              avatarUrl: null
            });
          }
        } catch (apiError) {
          // 使用默认用户信息
          this.updateUser({
            name: '未登录用户',
            avatarUrl: null
          });
        }
      } else {
        // 使用默认用户信息
        this.updateUser({
          name: '未登录用户',
          avatarUrl: null
        });
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 渲染组件内容
   */
  render() {
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
    const title = document.createElement('h3');
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

      // 单个视图切换按钮
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'view-toggle-btn active';
      toggleBtn.dataset.currentView = this.currentView; // 存储当前视图状态
      toggleBtn.type = 'button'; // 明确设置按钮类型

      // 根据当前视图设置图标
      if (this.currentView === 'grid') {
        toggleBtn.innerHTML = '<i class="fas fa-th-large"></i>';
        toggleBtn.title = '切换到列表视图'; // 添加悬停提示
      } else {
        toggleBtn.innerHTML = '<i class="fas fa-list"></i>';
        toggleBtn.title = '切换到卡片视图'; // 添加悬停提示
      }

      viewToggle.appendChild(toggleBtn);
      leftSection.appendChild(viewToggle);
    }

    // 添加操作按钮区域
    if (this.options.showRefreshButton || (!isMobile && this.options.actionButtons && this.options.actionButtons.length > 0)) {
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
      if (!isMobile && this.options.actionButtons && this.options.actionButtons.length > 0) {
        this.options.actionButtons.forEach(btn => {
          const actionBtn = document.createElement('button');
          actionBtn.className = 'action-btn';
          actionBtn.type = 'button'; // 明确设置按钮类型

          // 如果提供了ID，设置按钮ID
          if (btn.id) {
            actionBtn.id = btn.id;
          }

          // 如果提供了title，设置按钮tooltip
          if (btn.tooltip) {
            actionBtn.title = btn.tooltip;
          }

          // 如果提供了className，添加自定义样式类
          if (btn.className) {
            actionBtn.classList.add(btn.className);
          }

          // 添加按钮类型样式
          if (btn.type) {
            actionBtn.classList.add(btn.type); // primary, warning, danger
          } else {
            // 根据操作类型自动添加样式
            if (btn.action === 'emptyTrash' || btn.id === 'emptyTrashBtn') {
              actionBtn.classList.add('danger');
            } else if (btn.action === 'restoreAll' || btn.id === 'restoreAllBtn') {
              actionBtn.classList.add('primary');
            }
          }

          // 设置按钮内容
          let buttonContent = '';
          if (btn.icon) {
            buttonContent += `<i class="${btn.icon}"></i>`;
          }

          if (btn.text) {
            buttonContent += `<span>${btn.text}</span>`;
          }

          actionBtn.innerHTML = buttonContent;

          // 设置action属性，用于标识操作类型
          if (btn.action) {
            actionBtn.dataset.action = btn.action;
          } else if (btn.callback === this.confirmRestoreAllNotes || btn.id === 'restoreAllBtn') {
            // 处理恢复所有笔记的特殊情况
            actionBtn.dataset.action = 'restoreAll';
          } else if (btn.callback === this.confirmEmptyTrash || btn.id === 'emptyTrashBtn') {
            // 处理清空回收站的特殊情况
            actionBtn.dataset.action = 'emptyTrash';
          }

          // 设置点击事件处理
          if (actionBtn.dataset.action === 'restoreAll' || actionBtn.dataset.action === 'emptyTrash') {
            // 使用ContentHeader内部的处理方法
            actionBtn.addEventListener('click', (event) => {
              this.handleActionButtonClick(actionBtn.dataset.action, event);
            });
          } else if (typeof btn.callback === 'function') {
            // 使用提供的回调函数
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

    // 确保菜单最初不可见
    this.menu.classList.remove('show');
    this.menu.style.display = 'none';
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 视图切换
    if (this.options.showViewToggle) {
      const viewToggleBtn = this.container.querySelector('.view-toggle-btn');

      if (viewToggleBtn) {
        // 先移除当前节点上的所有点击事件
        const newBtn = viewToggleBtn.cloneNode(true);
        viewToggleBtn.parentNode.replaceChild(newBtn, viewToggleBtn);

        // 添加点击事件，这里的this._viewToggleHandler已经在构造函数中绑定了this
        newBtn.addEventListener('click', this._viewToggleHandler);

        // 添加事件以防止表单提交等行为
        newBtn.addEventListener('click', function(e) {
          e.preventDefault();
        });
      }
    }

    // 刷新按钮
    const refreshBtn = this.container.querySelector('#refreshBtn');
    if (refreshBtn) {
      // 替换按钮以清除所有事件监听器
      const newRefreshBtn = refreshBtn.cloneNode(true);
      refreshBtn.parentNode.replaceChild(newRefreshBtn, refreshBtn);

      // 添加点击事件，this._refreshHandler已在构造函数中绑定
      newRefreshBtn.addEventListener('click', this._refreshHandler);

      // 防止默认行为
      newRefreshBtn.addEventListener('click', function(e) {
        e.preventDefault();
      });
    }

    // 用户头像菜单事件
    if (this.profile) {
      // 替换元素以清除所有事件
      const newProfile = this.profile.cloneNode(true);
      this.profile.parentNode.replaceChild(newProfile, this.profile);
      this.profile = newProfile;

      // 添加点击事件
      this.profile.addEventListener('click', this._menuToggleHandler);

      // 阻止事件冒泡
      this.profile.addEventListener('click', function(e) {
        e.stopPropagation();
      });

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
      }
    }

    // 点击文档隐藏菜单
    // 由于可能多次调用setupEventListeners，确保只添加一次document事件监听
    if (!this._documentEventAdded) {
      document.removeEventListener('click', this._documentClickHandler); // 移除可能存在的先前事件
      document.addEventListener('click', this._documentClickHandler);
      this._documentEventAdded = true;
    }
  }

  /**
   * 视图切换事件处理函数
   * @param {Event} event - 点击事件
   */
  _viewToggleHandler(event) {
    const btn = event.currentTarget;
    const currentView = btn.dataset.currentView;

    // 切换到另一个视图
    const newView = currentView === 'grid' ? 'list' : 'grid';

    // 更新当前视图
    this.currentView = newView;

    // 更新按钮状态和图标
    btn.dataset.currentView = newView;

    // 更新按钮图标和提示
    if (newView === 'grid') {
      btn.innerHTML = '<i class="fas fa-th-large"></i>';
      btn.title = '切换到列表视图';
    } else {
      btn.innerHTML = '<i class="fas fa-list"></i>';
      btn.title = '切换到卡片视图';
    }

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
      this.options.onViewToggle(this.currentView);
    } else {
      // 尝试使用全局NotesLoader
      if (window.notesLoader && typeof window.notesLoader.loadNotes === 'function') {
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
    // 添加加载动画
    refreshBtn.classList.add('loading');

    try {
      // 调用刷新回调
      if (typeof this.options.onRefresh === 'function') {
        await this.options.onRefresh();
        // 使用ToastMessage显示成功提示
        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.success('刷新成功');
        }
      }
    } catch (error) {
      // 使用ToastMessage显示错误提示
      if (typeof ToastMessage !== 'undefined') {
        ToastMessage.error('刷新失败: ' + (error.message || '未知错误'));
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

    // 处理常见的菜单操作
    if (action === 'edit-profile') {
      window.location.href = 'profile-edit.html';
    } else if (action === 'settings') {
      window.location.href = 'settings.html';
    } else if (action === 'export-notes') {
      window.location.href = 'settings.html?section=export';
    } else if (action === 'logout') {
      // 处理退出登录
      if (window.confirmLogout) {
        window.confirmLogout();
      } else {
        // 确保ConfirmDialog组件已被加载
        const showLogoutConfirm = () => {
          // 引入ConfirmDialog组件如果尚未加载
          if (typeof ConfirmDialog === 'undefined') {
            // 如果还没有加载确认对话框组件，先加载它
            const script = document.createElement('script');
            script.src = 'component/confirm-dialog.js';
            script.onload = () => {
              // 加载完成后，使用对话框
              new ConfirmDialog().danger('退出登录', '确定要退出当前账号吗？', function(confirmed) {
                if (confirmed) {
                  // 清除用户信息和令牌
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('lastTokenRefresh');

                  // 显示退出成功提示
                  if (typeof ToastMessage !== 'undefined') {
                    ToastMessage.info('已成功退出登录');
                  }

                  // 跳转到登录页面
                  setTimeout(() => {
                    window.location.href = 'login.html';
                  }, 1000);
                }
              });
            };
            document.head.appendChild(script);
          } else {
            // 直接使用ConfirmDialog组件
            ConfirmDialog.danger('退出登录', '确定要退出当前账号吗？', function(confirmed) {
              if (confirmed) {
                // 清除用户信息和令牌
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('lastTokenRefresh');

                // 显示退出成功提示
                if (typeof ToastMessage !== 'undefined') {
                  ToastMessage.info('已成功退出登录');
                }

                // 跳转到登录页面
                setTimeout(() => {
                  window.location.href = 'login.html';
                }, 1000);
              }
            });
          }
        };

        // 执行退出登录确认
        showLogoutConfirm();
      }
    } else if (typeof this.options.onMenuItemClick === 'function') {
      // 如果有自定义处理函数，交给它处理
      this.options.onMenuItemClick(action, event);
    }

    // 隐藏菜单
    this.hideMenu();
  }

  /**
   * 处理操作按钮点击事件 - 特别处理回收站页面的恢复所有和清空回收站操作
   * @param {String} action - 操作名称
   * @param {Event} event - 点击事件
   */
  handleActionButtonClick(action, event) {
    // 恢复所有笔记
    if (action === 'restoreAll') {
      this.confirmRestoreAllNotes(event);
    }
    // 清空回收站
    else if (action === 'emptyTrash') {
      this.confirmEmptyTrash(event);
    }
    // 其他自定义操作，调用回调
    else if (typeof this.options.onActionButtonClick === 'function') {
      this.options.onActionButtonClick(action, event);
    }
  }

  /**
   * 确认恢复所有笔记
   * @param {Event} event - 点击事件
   */
  confirmRestoreAllNotes(event) {
    // 使用ConfirmDialog组件
    if (typeof ConfirmDialog !== 'undefined') {
      ConfirmDialog.confirm('确认恢复', '确定要恢复回收站中的所有笔记吗？笔记将被移回原位置。', confirmed => {
        if (confirmed) {
          // 显示操作开始提示
          if (typeof ToastMessage !== 'undefined') {
            ToastMessage.info('正在恢复笔记...');
          }
          this.restoreAllNotes(event.target);
        }
      });
    } else {
      // 如果ConfirmDialog组件不可用，回退到原生confirm
      if (confirm('确定要恢复所有笔记吗？')) {
        this.restoreAllNotes(event.target);
      }
    }
  }

  /**
   * 确认清空回收站
   * @param {Event} event - 点击事件
   */
  confirmEmptyTrash(event) {
    // 使用ConfirmDialog组件
    if (typeof ConfirmDialog !== 'undefined') {
      ConfirmDialog.danger('清空回收站', '警告：确定要清空回收站吗？此操作将永久删除所有回收站中的笔记，不可恢复！', confirmed => {
        if (confirmed) {
          // 显示操作开始提示
          if (typeof ToastMessage !== 'undefined') {
            ToastMessage.warning('正在清空回收站...');
          }
          this.emptyTrash(event.target);
        }
      });
    } else {
      // 如果ConfirmDialog组件不可用，回退到原生confirm
      if (confirm('警告：确定要清空回收站吗？此操作将永久删除所有回收站中的笔记，不可恢复！')) {
        this.emptyTrash(event.target);
      }
    }
  }

  /**
   * 恢复所有笔记
   * @param {HTMLElement} button - 触发按钮元素
   */
  async restoreAllNotes(button) {
    try {
      // 获取回收站中的所有笔记
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const trashNotes = notes.filter(note => note.inTrash === true);

      if (trashNotes.length === 0) {
        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.info('回收站中没有笔记可恢复');
        }
        return;
      }

      // 显示加载状态
      if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 恢复中...';
        button.disabled = true;
      }

      // 使用window.commpush API恢复笔记
      if (window.commpush) {
        let successCount = 0;

        // 逐个恢复笔记
        const restorePromises = trashNotes.map(note => {
          const noteId = note.id || note._id;
          return window.commpush.restoreNoteFromTrash(noteId)
            .then(() => {
              successCount++;
            })
            .catch(error => {
              throw error;
            });
        });

        await Promise.all(restorePromises);

        // 清除所有缓存
        localStorage.removeItem('notes_cache');
        localStorage.removeItem('notes_cache_timestamp');
        localStorage.removeItem('trash_notes_cache');
        localStorage.removeItem('trash_notes_timestamp');

        // 本地数据同步
        const allNotes = JSON.parse(localStorage.getItem('notes') || '[]');

        allNotes.forEach(note => {
          if (note.inTrash) {
            note.inTrash = false;
            delete note.deletedAt;
          }
        });

        localStorage.setItem('notes', JSON.stringify(allNotes));

        // 触发笔记更新事件
        localStorage.setItem('notes_updated', Date.now().toString());

        // 显示成功提示
        if (typeof ToastMessage !== 'undefined') {
          if (successCount > 0) {
            ToastMessage.success(`成功恢复 ${successCount} 个笔记`);
          } else {
            ToastMessage.info('没有笔记被恢复');
          }
        }

        // 刷新笔记列表 - 通过通用的函数
        if (window.loadTrashNotes && typeof window.loadTrashNotes === 'function') {
          window.loadTrashNotes(true);
        } else if (window.notesLoader && typeof window.notesLoader.loadNotes === 'function') {
          // 如果有通用的笔记加载器
          window.notesLoader.loadNotes({inTrash: true, forceRefresh: true});
        }
      } else {
        // 仅在本地恢复笔记
        notes.forEach(note => {
          if (note.inTrash) {
            note.inTrash = false;
            delete note.deletedAt;
          }
        });
        localStorage.setItem('notes', JSON.stringify(notes));

        // 清除所有缓存
        localStorage.removeItem('notes_cache');
        localStorage.removeItem('notes_cache_timestamp');
        localStorage.removeItem('trash_notes_cache');
        localStorage.removeItem('trash_notes_timestamp');

        // 触发笔记更新事件
        localStorage.setItem('notes_updated', Date.now().toString());

        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.info('笔记已在本地恢复');
        }

        // 刷新笔记列表
        if (window.loadTrashNotes && typeof window.loadTrashNotes === 'function') {
          window.loadTrashNotes(true);
        } else if (window.notesLoader && typeof window.notesLoader.loadNotes === 'function') {
          window.notesLoader.loadNotes({inTrash: true, forceRefresh: true});
        }
      }
    } catch (error) {
      if (typeof ToastMessage !== 'undefined') {
        ToastMessage.error(`恢复失败: ${error.message || '未知错误'}`);
      }
    } finally {
      // 恢复按钮状态
      if (button) {
        button.innerHTML = '<i class="fas fa-trash-restore"></i><span>恢复所有</span>';
        button.disabled = false;
      }
    }
  }

  /**
   * 清空回收站
   * @param {HTMLElement} button - 触发按钮元素
   */
  async emptyTrash(button) {
    try {
      // 获取回收站中的所有笔记
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const trashNotes = notes.filter(note => note.inTrash === true);

      if (trashNotes.length === 0) {
        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.info('回收站已经是空的');
        }
        return;
      }

      // 显示加载状态
      if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 清空中...';
        button.disabled = true;
      }

      // 使用window.commpush API删除笔记
      if (window.commpush) {
        let successCount = 0;

        // 逐个删除笔记
        const deletePromises = trashNotes.map(note => {
          const noteId = note.id || note._id;
          return window.commpush.deleteNote(noteId)
            .then(() => {
              successCount++;
            })
            .catch(error => {
              throw error;
            });
        });

        await Promise.all(deletePromises);

        // 清除所有缓存
        localStorage.removeItem('notes_cache');
        localStorage.removeItem('notes_cache_timestamp');
        localStorage.removeItem('trash_notes_cache');
        localStorage.removeItem('trash_notes_timestamp');

        // 本地数据同步
        const allNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        const remainingNotes = allNotes.filter(note => !note.inTrash);
        localStorage.setItem('notes', JSON.stringify(remainingNotes));

        // 触发笔记更新事件
        localStorage.setItem('notes_updated', Date.now().toString());

        // 显示成功提示
        if (typeof ToastMessage !== 'undefined') {
          if (successCount > 0) {
            ToastMessage.success(`成功删除 ${successCount} 个笔记`);
          } else {
            ToastMessage.info('回收站已清空');
          }
        }

        // 刷新笔记列表
        if (window.loadTrashNotes && typeof window.loadTrashNotes === 'function') {
          window.loadTrashNotes(true);
        } else if (window.notesLoader && typeof window.notesLoader.loadNotes === 'function') {
          window.notesLoader.loadNotes({inTrash: true, forceRefresh: true});
        }
      } else {
        // 仅在本地删除笔记
        const remainingNotes = notes.filter(note => !note.inTrash);
        localStorage.setItem('notes', JSON.stringify(remainingNotes));

        // 清除所有缓存
        localStorage.removeItem('notes_cache');
        localStorage.removeItem('notes_cache_timestamp');
        localStorage.removeItem('trash_notes_cache');
        localStorage.removeItem('trash_notes_timestamp');

        // 触发笔记更新事件
        localStorage.setItem('notes_updated', Date.now().toString());

        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.success('回收站已清空');
        }

        // 刷新笔记列表
        if (window.loadTrashNotes && typeof window.loadTrashNotes === 'function') {
          window.loadTrashNotes(true);
        } else if (window.notesLoader && typeof window.notesLoader.loadNotes === 'function') {
          window.notesLoader.loadNotes({inTrash: true, forceRefresh: true});
        }
      }
    } catch (error) {
      if (error.message.includes('404')) {
        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.warning('Some notes were already deleted. Ignoring 404 errors.');
        } else {
          console.warn('Some notes were already deleted. Ignoring 404 errors.');
        }
      } else {
        console.error(error);
        if (typeof ToastMessage !== 'undefined') {
          ToastMessage.error('An error occurred while emptying the trash.');
        } else {
          alert('An error occurred while emptying the trash.');
        }
      }
    } finally {
      // 恢复按钮状态
      if (button) {
        button.innerHTML = '<i class="fas fa-trash"></i><span>清空回收站</span>';
        button.disabled = false;
      }
    }
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
      this.hideMenu();
    }
  }

  /**
   * 切换菜单显示/隐藏
   */
  toggleMenu() {
    if (this.menu) {
      // 确保菜单在DOM中
      if (!document.body.contains(this.menu)) {
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

        }

        // 先确保菜单可见，再添加显示class (避免过渡动画问题)
        this.menu.style.display = 'block';

        // 使用setTimeout确保DOM更新，然后添加动画class
        setTimeout(() => {
          this.menu.classList.add('show');
        }, 10);
      } else {
        // 隐藏菜单 - 先移除show class，然后等待过渡动画完成后隐藏元素
        this.menu.classList.remove('show');

        // 等待过渡动画完成
        setTimeout(() => {
          this.menu.style.display = 'none';
        }, 300); // 300ms是过渡动画的持续时间
      }
    } else {
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
    }
  }

  /**
   * 隐藏菜单
   */
  hideMenu() {
    if (this.menu) {
      // 移除show class
      this.menu.classList.remove('show');

      // 等待过渡动画完成后隐藏元素
      setTimeout(() => {
        this.menu.style.display = 'none';
      }, 300);
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
        this.render();
      }
    }
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
      return;
    }

    // 更新当前视图
    this.currentView = viewMode;

    // 保存视图偏好
    localStorage.setItem('viewMode', viewMode);

    // 更新按钮状态和图标
    const viewToggleBtn = this.container.querySelector('.view-toggle-btn');
    if (viewToggleBtn) {
      viewToggleBtn.dataset.currentView = viewMode;

      // 更新按钮图标和提示
      if (viewMode === 'grid') {
        viewToggleBtn.innerHTML = '<i class="fas fa-th-large"></i>';
        viewToggleBtn.title = '切换到列表视图';
      } else {
        viewToggleBtn.innerHTML = '<i class="fas fa-list"></i>';
        viewToggleBtn.title = '切换到卡片视图';
      }
    }

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
   * 添加操作按钮
   * @param {Object} button - 按钮配置 {icon, text, id, callback, tooltip, type, action}
   */
  addActionButton(button) {
    const topActions = this.container.querySelector('.top-actions');
    if (!topActions) return;

    const actionBtn = document.createElement('button');
    actionBtn.className = 'action-btn';
    actionBtn.id = button.id || '';
    actionBtn.title = button.tooltip || button.text;
    actionBtn.type = 'button'; // 明确设置按钮类型

    // 添加按钮类型样式
    if (button.type) {
      actionBtn.classList.add(button.type); // primary, warning, danger
    } else {
      // 根据操作类型自动添加样式
      if (button.action === 'emptyTrash' || button.id === 'emptyTrashBtn') {
        actionBtn.classList.add('danger');
      } else if (button.action === 'restoreAll' || button.id === 'restoreAllBtn') {
        actionBtn.classList.add('primary');
      }
    }

    // 设置按钮内容
    let buttonContent = '';
    if (button.icon) {
      buttonContent += `<i class="${button.icon}"></i>`;
      if (button.text) {
        buttonContent += ` <span>${button.text}</span>`;
      }
    } else if (button.text) {
      buttonContent = button.text;
    }

    actionBtn.innerHTML = buttonContent;

    // 设置action属性，用于标识操作类型
    if (button.action) {
      actionBtn.dataset.action = button.action;
    }

    // 添加点击事件
    if (button.action === 'restoreAll' || button.action === 'emptyTrash') {
      // 使用ContentHeader内部的处理方法
      actionBtn.addEventListener('click', (event) => {
        this.handleActionButtonClick(button.action, event);
      });
    } else if (typeof button.callback === 'function') {
      // 使用提供的回调函数
      actionBtn.addEventListener('click', button.callback);
    }

    topActions.appendChild(actionBtn);
    return actionBtn;
  }
}

// 全局导出组件
window.ContentHeader = ContentHeader;