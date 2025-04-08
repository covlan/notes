/**
 * 笔记操作菜单组件
 * 为笔记提供统一的操作菜单
 */
class NoteActionsMenu {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {String} options.menuId - 菜单元素ID
     * @param {String} options.overlayId - 遮罩层元素ID
     * @param {Array} options.menuItems - 菜单项配置
     * @param {Function} options.onMenuItemClick - 菜单项点击回调
     */
    constructor(options) {
        // 合并默认选项
        this.options = Object.assign({
            menuId: 'noteActionsMenu',
            overlayId: 'menuOverlay',
            menuItems: [
                { action: 'edit', icon: 'fas fa-edit', text: '编辑笔记' },
                { action: 'share', icon: 'fas fa-share-alt', text: '分享笔记' },
                { action: 'star', icon: 'fas fa-star', text: '收藏笔记' },
                { divider: true },
                { action: 'move', icon: 'fas fa-folder', text: '移动到分类' },
                { action: 'tag', icon: 'fas fa-tags', text: '添加标签' },
                { divider: true },
                { action: 'trash', icon: 'fas fa-trash', text: '移至回收站', className: 'warning' },
                { action: 'delete', icon: 'fas fa-trash-alt', text: '永久删除', className: 'delete' }
            ],
            onMenuItemClick: null
        }, options);

        // 初始化
        this.init();
        
        // 当前选中的笔记ID
        this.currentNoteId = null;
        
        // 防止点击事件冒泡标志
        this.menuJustOpened = false;
        
        // 添加点击防抖计时器
        this.clickDebounceTimer = null;
        
        // 最后一次菜单显示时间
        this.lastMenuShowTime = 0;
    }

    /**
     * 初始化
     */
    init() {
        // 先清理可能存在的旧菜单和遮罩层
        const oldMenu = document.getElementById(this.options.menuId);
        if (oldMenu) oldMenu.remove();
        const oldOverlay = document.getElementById(this.options.overlayId);
        if (oldOverlay) oldOverlay.remove();
        
        // 创建菜单和遮罩层
        this.createMenu();
        this.createOverlay();
        
        // 确保菜单元素和遮罩层已添加到DOM
        if (!document.getElementById(this.options.menuId)) {
            document.body.appendChild(this.menu);
        }
        if (!document.getElementById(this.options.overlayId)) {
            document.body.appendChild(this.overlay);
        }
        
        // 绑定事件
        this.bindEvents();
        
        // 防止事件冒泡标志
        this.menuJustOpened = false;
        
        // 添加点击防抖计时器
        this.clickDebounceTimer = null;
        
        // 最后一次菜单显示时间
        this.lastMenuShowTime = 0;
        
        // 调试信息，用于跟踪菜单初始化
        console.log('笔记操作菜单已初始化', {
            menuId: this.options.menuId,
            overlayId: this.options.overlayId,
            menuElement: this.menu,
            overlayElement: this.overlay,
            menuItemsCount: this.options.menuItems.length
        });
    }

    /**
     * 创建菜单元素
     */
    createMenu() {
        // 如果已存在菜单元素，则移除
        let menu = document.getElementById(this.options.menuId);
        if (menu) {
            menu.remove();
        }
        
        // 创建菜单元素
        menu = document.createElement('div');
        menu.id = this.options.menuId;
        menu.className = 'note-actions-menu';
        
        // 直接设置关键样式
        menu.style.position = 'absolute';
        menu.style.zIndex = '10000';
        menu.style.backgroundColor = '#fff';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 3px 12px rgba(0, 0, 0, 0.25)';
        menu.style.minWidth = '180px';
        menu.style.overflow = 'hidden';
        menu.style.display = 'none';
        
        // 添加菜单项
        const menuItems = this.options.menuItems;
        
        menuItems.forEach(item => {
            if (item.divider) {
                // 添加分隔线
                const divider = document.createElement('div');
                divider.className = 'menu-divider';
                divider.style.height = '1px';
                divider.style.backgroundColor = '#e0e0e0';
                divider.style.margin = '4px 0';
                menu.appendChild(divider);
            } else {
                // 添加菜单项
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                
                // 直接设置菜单项样式
                menuItem.style.padding = '12px 16px';
                menuItem.style.display = 'flex';
                menuItem.style.alignItems = 'center';
                menuItem.style.gap = '12px';
                menuItem.style.cursor = 'pointer';
                
                // 添加鼠标悬停效果
                menuItem.onmouseover = () => {
                    menuItem.style.backgroundColor = '#f5f5f5';
                };
                menuItem.onmouseout = () => {
                    menuItem.style.backgroundColor = '';
                };
                
                if (item.className) {
                    menuItem.classList.add(item.className);
                    if (item.className === 'warning') {
                        menuItem.style.color = '#f57c00';
                    } else if (item.className === 'delete') {
                        menuItem.style.color = '#e53935';
                    }
                }
                
                menuItem.dataset.action = item.action;
                
                menuItem.innerHTML = `
                    <i class="${item.icon}" style="width:16px;text-align:center;"></i>
                    ${item.text}
                `;
                
                menu.appendChild(menuItem);
            }
        });
        
        // 添加到文档
        document.body.appendChild(menu);
        
        // 保存引用
        this.menu = menu;
    }

    /**
     * 创建遮罩层
     */
    createOverlay() {
        // 如果已存在遮罩层，则移除
        let overlay = document.getElementById(this.options.overlayId);
        if (overlay) {
            overlay.remove();
        }
        
        // 创建遮罩层
        overlay = document.createElement('div');
        overlay.id = this.options.overlayId;
        overlay.className = 'menu-overlay';
        
        // 直接设置样式
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'none';
        
        // 添加到文档
        document.body.appendChild(overlay);
        
        // 保存引用
        this.overlay = overlay;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 先解绑所有事件以防止重复绑定
        if (this.menu) {
            const oldMenuItems = this.menu.querySelectorAll('.menu-item');
            oldMenuItems.forEach(item => {
                const newItem = item.cloneNode(true);
                item.parentNode.replaceChild(newItem, item);
            });
        }
        
        // 检查菜单元素是否存在
        if (!this.menu) {
            console.error('菜单元素不存在，无法绑定事件');
            return;
        }
        
        // 输出调试信息
        console.log('菜单项数量:', this.menu.querySelectorAll('.menu-item').length);
        
        // 为每个菜单项绑定点击事件
        this.menu.querySelectorAll('.menu-item').forEach((item, index) => {
            console.log(`绑定菜单项#${index}:`, item.dataset.action);
            
            item.addEventListener('click', (event) => {
                // 阻止事件冒泡
                event.stopPropagation();
                event.preventDefault();
                
                const action = item.dataset.action;
                const noteId = this.currentNoteId;
                
                console.log(`菜单项点击: ${action}, noteId: ${noteId}`);
                
                // 立即隐藏菜单，然后执行操作
                this.hideMenu();
                
                // 如果回调函数存在，则执行回调
                if (typeof this.options.onMenuItemClick === 'function') {
                    try {
                        // 调用回调处理菜单操作
                        this.options.onMenuItemClick(action, noteId, event);
                        
                        // 根据操作类型进行不同处理
                        switch(action) {
                            case 'trash':
                                // 从UI中移除笔记元素
                                this.removeNoteFromUI(noteId);
                                // 更新全局缓存中的笔记状态
                                this.updateNoteStateInGlobalCache(noteId, { inTrash: true });
                                
                                // 调用API将笔记移动到回收站
                                try {
                                    if (typeof api !== 'undefined' && api && typeof api.trashNote === 'function') {
                                        console.log('调用API将笔记移动到回收站:', noteId);
                                        api.trashNote(noteId)
                                            .then(response => {
                                                if (response && response.success) {
                                                    console.log('笔记已成功移动到回收站:', response);
                                                    // 显示成功提示，但防止重复提示
                                                    if (typeof ToastMessage !== 'undefined' && !window._noteTrashToastShown) {
                                                        window._noteTrashToastShown = true;
                                                        ToastMessage.success('笔记已移至回收站');
                                                        
                                                        // 2秒后重置标志，允许下一次操作显示提示
                                                        setTimeout(() => {
                                                            window._noteTrashToastShown = false;
                                                        }, 2000);
                                                    }
                                                    
                                                    // 强制刷新当前页面
                                                    if (typeof notesLoader !== 'undefined' && notesLoader) {
                                                        notesLoader.forceRefreshAllCaches();
                                                    }
                                                    
                                                    // 刷新当前页面显示
                                                    this.refreshCurrentView(noteId, 'trash');
                                                    
                                                    // 清除所有相关缓存
                                                    localStorage.removeItem('notes_cache');
                                                    localStorage.removeItem('notes_cache_timestamp');
                                                    localStorage.removeItem('trash_notes_cache');
                                                    localStorage.removeItem('trash_notes_timestamp');
                                                    localStorage.removeItem('starred_notes_cache');
                                                    localStorage.removeItem('starred_notes_timestamp');
                                                    
                                                    // 触发笔记更新事件
                                                    localStorage.setItem('notes_updated', Date.now().toString());
                                                } else {
                                                    console.error('移动笔记到回收站失败:', response);
                                                    if (typeof ToastMessage !== 'undefined') {
                                                        ToastMessage.error('移动笔记到回收站失败，请重试');
                                                    }
                                                }
                                            })
                                            .catch(error => {
                                                console.error('移动笔记到回收站出错:', error);
                                                if (typeof ToastMessage !== 'undefined') {
                                                    ToastMessage.error('移动笔记到回收站失败: ' + error.message);
                                                }
                                            });
                                    } else {
                                        console.warn('API不可用，仅更新了本地缓存');
                                        // 强制刷新页面
                                        this.refreshCurrentView(noteId, 'trash');
                                    }
                                } catch (error) {
                                    console.error('移动笔记到回收站时发生错误:', error);
                                }
                                break;
                            
                            case 'delete':
                                // 从UI中移除笔记元素
                                this.removeNoteFromUI(noteId);
                                // 从全局缓存中删除笔记
                                this.removeNoteFromGlobalCache(noteId);
                                // 刷新当前页面显示
                                this.refreshCurrentView(noteId, 'delete');
                                break;
                            
                            case 'star':
                                // 更新全局缓存中的收藏状态
                                this.updateNoteStateInGlobalCache(noteId, { isStarred: true });
                                
                                // 调用API将收藏状态同步到后端
                                try {
                                    if (typeof api !== 'undefined' && api && typeof api.starNote === 'function') {
                                        console.log('调用API更新笔记收藏状态:', noteId);
                                        api.starNote(noteId)
                                            .then(response => {
                                                if (response && response.success) {
                                                    console.log('笔记已成功收藏:', response);
                                                    // 显示成功提示，但防止重复提示
                                                    if (typeof ToastMessage !== 'undefined' && !window._noteStarToastShown) {
                                                        window._noteStarToastShown = true;
                                                        ToastMessage.success('笔记已收藏');
                                                        
                                                        // 2秒后重置标志，允许下一次操作显示提示
                                                        setTimeout(() => {
                                                            window._noteStarToastShown = false;
                                                        }, 2000);
                                                    }
                                                    // 刷新当前页面
                                                    this.refreshCurrentView(noteId, 'star');
                                                    // 清理收藏笔记缓存，强制下次访问从API获取
                                                    localStorage.removeItem('starred_notes_cache');
                                                    localStorage.removeItem('starred_notes_timestamp');
                                                } else {
                                                    console.error('收藏笔记失败:', response);
                                                    if (typeof ToastMessage !== 'undefined') {
                                                        ToastMessage.error('收藏笔记失败，请重试');
                                                    }
                                                }
                                            })
                                            .catch(error => {
                                                console.error('收藏笔记出错:', error);
                                                if (typeof ToastMessage !== 'undefined') {
                                                    ToastMessage.error('收藏笔记失败: ' + error.message);
                                                }
                                            });
                                    } else {
                                        console.warn('API不可用，仅更新了本地缓存');
                                    }
                                } catch (error) {
                                    console.error('收藏笔记时发生错误:', error);
                                }
                                break;
                            
                            case 'restore':
                                // 从当前UI中移除该笔记(如果在回收站视图)
                                this.removeNoteFromUI(noteId);
                                // 更新全局缓存
                                this.updateNoteStateInGlobalCache(noteId, { inTrash: false });
                                // 刷新当前页面显示
                                this.refreshCurrentView(noteId, 'restore');
                                break;
                        }
                    } catch (error) {
                        console.error('菜单操作执行错误:', error);
                    }
                } else {
                    console.warn('未设置菜单点击回调函数');
                }
            });
        });
        
        // 点击遮罩层隐藏菜单
        if (this.overlay) {
            // 先移除可能存在的事件监听器
            const newOverlay = this.overlay.cloneNode(true);
            this.overlay.parentNode.replaceChild(newOverlay, this.overlay);
            this.overlay = newOverlay;
            
            // 添加点击事件隐藏菜单
            this.overlay.addEventListener('click', () => {
                this.hideMenu();
            });
        }
        
        // 全局点击事件关闭菜单
        this.documentClickHandler = (e) => {
            // 如果菜单刚打开，忽略点击事件
            if (this.menuJustOpened) return;
            
            // 如果点击的是菜单按钮，在showMenu中已有标记处理，这里忽略
            if (e._menuBtnHandled) return;
            
            // 如果点击的不是菜单内容，则关闭菜单
            this.hideMenu();
        };
        
        // 监听窗口大小变化，隐藏菜单
        window.addEventListener('resize', () => {
            if (this.menu && this.menu.style.display === 'block') {
                this.hideMenu();
            }
        });
        
        // 监听滚动事件，隐藏菜单
        window.addEventListener('scroll', () => {
            if (this.menu && this.menu.style.display === 'block') {
                this.hideMenu();
            }
        }, { passive: true });
        
        console.log('事件绑定完成');
    }

    /**
     * 显示菜单
     * @param {Object} position - 菜单显示位置
     * @param {Number} position.x - X坐标
     * @param {Number} position.y - Y坐标
     * @param {String} noteId - 笔记ID
     */
    showMenu(position, noteId) {
        // 防抖处理，避免短时间内多次调用
        if (this.clickDebounceTimer) {
            clearTimeout(this.clickDebounceTimer);
        }
        
        // 记录最后菜单显示时间
        this.lastMenuShowTime = Date.now();
        
        // 先标记为刚刚打开，防止立即被document点击事件关闭
        this.menuJustOpened = true;
        
        // 输出调试信息
        console.log('NoteActionsMenu.showMenu() 调用:', { position, noteId });
        
        // 检查菜单元素和遮罩层是否存在
        if (!this.menu || !this.overlay) {
            console.error('菜单元素或遮罩层不存在，重新创建');
            this.createMenu();
            this.createOverlay();
            this.bindEvents();
        }
        
        this.clickDebounceTimer = setTimeout(() => {
            // 保存当前笔记ID
            this.currentNoteId = noteId;
            
            // 设置菜单位置
            const menu = this.menu;
            
            // 如果菜单已经显示且noteId相同，则隐藏菜单（切换效果）
            if (menu.style.display === 'block' && this.currentNoteId === noteId) {
                this.hideMenu();
                return;
            }
            
            // 显示菜单前先设置好位置
            menu.style.left = `${position.x}px`;
            menu.style.top = `${position.y}px`;
            
            // 显示遮罩层和菜单，直接使用内联样式
            this.overlay.style.display = 'block';
            menu.style.display = 'block';
            menu.style.opacity = '1';
            menu.style.transform = 'translateY(0)';
            menu.style.pointerEvents = 'auto';
            
            // 确保菜单完全在可视区域内
            this.adjustMenuPosition();
            
            // 检查菜单是否真的显示了（可见性检查）
            setTimeout(() => {
                const menuRect = menu.getBoundingClientRect();
                console.log('菜单显示状态检查:', { 
                    menuElement: menu,
                    display: menu.style.display,
                    opacity: window.getComputedStyle(menu).opacity,
                    rect: menuRect,
                    menuJustOpened: this.menuJustOpened
                });
                
                // 如果菜单不可见，尝试强制显示
                if (window.getComputedStyle(menu).opacity !== '1' || menuRect.width === 0) {
                    console.warn('菜单显示失败，尝试强制显示');
                    // 重新应用内联样式
                    menu.style.display = 'block';
                    menu.style.opacity = '1';
                    menu.style.transform = 'none';
                    menu.style.pointerEvents = 'auto';
                    menu.style.visibility = 'visible';
                }
                
                // 延迟一段时间后重置菜单打开标记，但保持足够长以防止菜单被文档点击事件处理器关闭
                setTimeout(() => {
                    console.log('重置菜单打开标记');
                    this.menuJustOpened = false;
                }, 500);
            }, 100);
            
            this.clickDebounceTimer = null;
        }, 50); // 50ms的防抖延迟
    }

    /**
     * 隐藏菜单
     */
    hideMenu() {
        console.log('隐藏菜单');
        
        // 先移除show类，触发CSS过渡效果
        if (this.menu) this.menu.classList.remove('show');
        if (this.overlay) this.overlay.classList.remove('show');
        
        // 等待过渡动画完成后再隐藏元素
        setTimeout(() => {
            if (this.menu) this.menu.style.display = 'none';
            if (this.overlay) this.overlay.style.display = 'none';
        }, 150); // 与CSS动画时间匹配
        
        // 移除document点击事件监听
        document.removeEventListener('click', this.documentClickHandler);
        
        // 清除当前选中的笔记ID
        this.currentNoteId = null;
    }
    
    /**
     * 调整菜单位置，确保不超出视口边界
     */
    adjustMenuPosition() {
        if (!this.menu) return;
        
        const menuRect = this.menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 检查右边界
        if (menuRect.right > viewportWidth) {
            const overflowX = menuRect.right - viewportWidth;
            const newLeft = parseInt(this.menu.style.left) - overflowX - 10; // 10px的安全距离
            this.menu.style.left = `${newLeft}px`;
        }
        
        // 检查下边界
        if (menuRect.bottom > viewportHeight) {
            const overflowY = menuRect.bottom - viewportHeight;
            const newTop = parseInt(this.menu.style.top) - overflowY - 10; // 10px的安全距离
            this.menu.style.top = `${newTop}px`;
        }
    }

    /**
     * 更新菜单项
     * @param {Array} menuItems - 新的菜单项配置
     */
    updateMenuItems(menuItems) {
        this.options.menuItems = menuItems;
        this.createMenu();
        this.bindEvents();
    }

    /**
     * 切换菜单项显示/隐藏
     * @param {Object} options - 配置选项
     * @param {Object} options.show - 要显示的菜单项action列表 {action: true/false}
     * @param {Object} options.hide - 要隐藏的菜单项action列表 {action: true/false}
     */
    toggleMenuItems(options) {
        const { show = {}, hide = {} } = options;
        
        // 显示指定的菜单项
        Object.keys(show).forEach(action => {
            if (show[action]) {
                const menuItem = this.menu.querySelector(`.menu-item[data-action="${action}"]`);
                if (menuItem) {
                    menuItem.style.display = 'flex';
                }
            }
        });
        
        // 隐藏指定的菜单项
        Object.keys(hide).forEach(action => {
            if (hide[action]) {
                const menuItem = this.menu.querySelector(`.menu-item[data-action="${action}"]`);
                if (menuItem) {
                    menuItem.style.display = 'none';
                }
            }
        });
    }

    /**
     * 从UI中移除指定ID的笔记元素
     * @param {String} noteId - 笔记ID
     */
    removeNoteFromUI(noteId) {
        if (!noteId) return;
        
        // 查找带有指定ID的笔记卡片或列表项
        const noteElements = document.querySelectorAll(`[data-id="${noteId}"]`);
        
        noteElements.forEach(element => {
            // 如果找到则淡出移除
            if (element) {
                element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                element.style.opacity = '0';
                element.style.transform = 'scale(0.95)';
                
                // 300ms后移除元素
                setTimeout(() => {
                    if (element.parentNode) {
                        element.parentNode.removeChild(element);
                        
                        // 如果所有笔记都被删除，则显示空状态
                        this.checkAndShowEmptyState();
                    }
                }, 300);
            }
        });
    }
    
    /**
     * 检查并显示空状态
     */
    checkAndShowEmptyState() {
        // 收藏笔记页面
        const starredContainer = document.querySelector('.notes-grid');
        if (starredContainer && starredContainer.children.length === 0) {
            starredContainer.innerHTML = `
                <div class="empty-starred">
                    <i class="fas fa-star"></i>
                    <p>暂无收藏笔记</p>
                </div>
            `;
        }
        
        // 回收站页面
        const trashContainer = document.querySelector('.trash-notes');
        if (trashContainer && trashContainer.children.length === 0) {
            trashContainer.innerHTML = `
                <div class="empty-trash">
                    <i class="fas fa-trash-alt"></i>
                    <p>回收站是空的</p>
                </div>
            `;
        }
    }

    /**
     * 更新全局缓存中的笔记状态
     * @param {String} noteId - 笔记ID
     * @param {Object} stateUpdate - 需要更新的状态 {属性名: 新值}
     */
    updateNoteStateInGlobalCache(noteId, stateUpdate) {
        if (!noteId || !stateUpdate) return;
        
        try {
            // 获取所有笔记
            const notesStr = localStorage.getItem('notes');
            if (!notesStr) return;
            
            const notes = JSON.parse(notesStr);
            let updated = false;
            
            // 查找并更新指定笔记
            notes.forEach(note => {
                if (note.id === noteId || note._id === noteId) {
                    // 应用更新
                    Object.keys(stateUpdate).forEach(key => {
                        note[key] = stateUpdate[key];
                    });
                    
                    // 如果是移到回收站，添加删除时间
                    if (stateUpdate.inTrash === true) {
                        note.deletedAt = new Date().toISOString();
                    }
                    
                    updated = true;
                }
            });
            
            // 如果有更新，则保存回本地存储
            if (updated) {
                localStorage.setItem('notes', JSON.stringify(notes));
                // 清除缓存
                this.clearAllNoteCaches();
                // 触发笔记更新事件
                localStorage.setItem('notes_updated', Date.now().toString());
            }
        } catch (error) {
            console.error('更新笔记状态到缓存时出错:', error);
        }
    }

    /**
     * 从全局缓存中删除笔记
     * @param {String} noteId - 笔记ID
     */
    removeNoteFromGlobalCache(noteId) {
        if (!noteId) return;
        
        try {
            // 获取所有笔记
            const notesStr = localStorage.getItem('notes');
            if (!notesStr) return;
            
            const notes = JSON.parse(notesStr);
            
            // 过滤掉指定笔记
            const filteredNotes = notes.filter(note => 
                note.id !== noteId && note._id !== noteId
            );
            
            // 如果长度不同，说明确实移除了笔记
            if (filteredNotes.length !== notes.length) {
                localStorage.setItem('notes', JSON.stringify(filteredNotes));
                // 清除缓存
                this.clearAllNoteCaches();
                // 触发笔记更新事件
                localStorage.setItem('notes_updated', Date.now().toString());
            }
        } catch (error) {
            console.error('从缓存中删除笔记时出错:', error);
        }
    }

    /**
     * 清除所有笔记缓存
     */
    clearAllNoteCaches() {
        try {
            // 清除各类缓存
            localStorage.removeItem('notes_cache');
            localStorage.removeItem('notes_cache_timestamp');
            localStorage.removeItem('starred_notes_cache');
            localStorage.removeItem('starred_notes_timestamp');
            localStorage.removeItem('trash_notes_cache');
            localStorage.removeItem('trash_notes_timestamp');
            localStorage.removeItem('shared_notes_cache');
            localStorage.removeItem('shared_notes_timestamp');
            
            console.log('所有笔记缓存已清除');
        } catch (error) {
            console.error('清除笔记缓存时出错:', error);
        }
    }

    /**
     * 刷新当前视图
     * @param {String} noteId - 笔记ID
     * @param {String} action - 操作类型
     */
    refreshCurrentView(noteId, action) {
        // 触发视图刷新事件，由具体页面的逻辑处理
        const refreshEvent = new CustomEvent('refreshNotes', {
            detail: { noteId, action }
        });
        
        document.dispatchEvent(refreshEvent);
    }

    /**
     * 显示笔记操作菜单
     * @param {Object} position - 菜单显示位置 {x, y}
     * @param {String} noteId - 笔记ID
     */
    show(position, noteId) {
        // 当前已选中的笔记ID
        this.currentNoteId = noteId;
        
        // 检查菜单元素是否存在
        if (!this.menu || !this.overlay) {
            console.error('菜单元素或遮罩层不存在，无法显示菜单');
            return;
        }
        
        // 记录最后一次显示时间，用于防抖处理
        this.lastMenuShowTime = Date.now();
        
        // 获取当前笔记的状态，以便动态调整菜单项
        this.updateMenuOptions(noteId);
        
        // 设置位置并显示菜单
        this.menu.style.left = `${position.x}px`;
        this.menu.style.top = `${position.y}px`;
        
        // 显示菜单和遮罩层
        this.menu.style.display = 'block';
        this.overlay.style.display = 'block';
        
        // 添加show类以应用CSS动画效果
        setTimeout(() => {
            this.menu.classList.add('show');
            this.overlay.classList.add('show');
        }, 10);
        
        // 检查菜单是否超出视口边界，如果是则调整位置
        this.adjustMenuPosition();
        
        // 添加已打开标记，防止快速连击
        this.menuJustOpened = true;
        setTimeout(() => {
            this.menuJustOpened = false;
        }, 200);
        
        // 绑定document点击事件来关闭菜单
        setTimeout(() => {
            document.addEventListener('click', this.documentClickHandler);
        }, 10);
        
        console.log(`笔记操作菜单已显示，noteId: ${noteId}`);
    }
    
    /**
     * 根据笔记ID获取笔记信息，更新菜单选项
     * @param {String} noteId - 笔记ID
     */
    updateMenuOptions(noteId) {
        try {
            // 检查当前页面，确定当前上下文
            const isTrashPage = window.location.pathname.includes('/trash');
            const isStarredPage = window.location.pathname.includes('/starred-notes');
            
            // 默认的显示/隐藏配置
            const options = {
                show: {},
                hide: {}
            };
            
            // 从本地存储中查找笔记信息
            let note = null;
            const notesStr = localStorage.getItem('notes');
            if (notesStr) {
                const notes = JSON.parse(notesStr);
                note = notes.find(n => n.id === noteId || n._id === noteId);
            }
            
            // 根据笔记状态和当前页面调整菜单选项
            if (isTrashPage) {
                // 在回收站页面显示恢复和永久删除，隐藏其他选项
                options.show = {
                    restore: true,
                    delete: true
                };
                options.hide = {
                    edit: true,
                    share: true,
                    star: true,
                    move: true,
                    tag: true,
                    trash: true
                };
            } else if (isStarredPage) {
                // 在收藏页面隐藏收藏选项
                options.hide = {
                    star: true
                };
            } else if (note) {
                // 根据笔记状态调整菜单
                if (note.inTrash) {
                    // 已在回收站的笔记
                    options.show = {
                        restore: true,
                        delete: true
                    };
                    options.hide = {
                        edit: true,
                        share: true,
                        star: true,
                        move: true,
                        tag: true,
                        trash: true
                    };
                } else if (note.isStarred) {
                    // 已收藏的笔记
                    options.hide = {
                        star: true
                    };
                }
            }
            
            // 应用配置
            this.toggleMenuItems(options);
            
        } catch (error) {
            console.error('更新菜单选项时出错:', error);
        }
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteActionsMenu;
} else {
    window.NoteActionsMenu = NoteActionsMenu;
} 