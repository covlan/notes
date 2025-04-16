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
     * @param {Object} options.menuConfig - 菜单项显示配置
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
                { action: 'unstar', icon: 'far fa-star', text: '取消收藏' },
                { action: 'download', icon: 'fas fa-download', text: '下载笔记' },
                { divider: true },
                { action: 'move', icon: 'fas fa-folder', text: '移动到分类' },
                { action: 'tag', icon: 'fas fa-tags', text: '添加标签' },
                { divider: true },
                { action: 'trash', icon: 'fas fa-trash', text: '移至回收站', className: 'warning' },
                { action: 'delete', icon: 'fas fa-trash-alt', text: '永久删除', className: 'delete' }
            ],
            onMenuItemClick: null,
            // 默认菜单配置
            menuConfig: {
                // 默认显示的操作
                show: ['edit', 'share', 'star', 'download', 'move', 'tag', 'trash', 'delete'],
                // 默认隐藏的操作
                hide: ['unstar', 'restore']
            }
        }, options);

        // 确保使用commpush组件
        this.api = window.commpush || window.api || new API();
        window.commpush = this.api; // 保持全局一致性

        // 如果传入了特定的menuItems，需要处理unstar项
        if (options && options.menuItems) {
            // 确保unstar和star不同时显示
            const hasUnstar = options.menuItems.some(item => item.action === 'unstar');
            const hasStar = options.menuItems.some(item => item.action === 'star');

            if (hasUnstar && hasStar) {
                this.options.menuConfig.show.push('star');
                this.options.menuConfig.hide.push('unstar');
            } else if (hasUnstar) {
                // 如果用户指定了unstar菜单项，则需要更新默认配置
                this.options.menuConfig.show.push('unstar');
                this.options.menuConfig.hide.push('star');
            }
        }

        // 合并用户提供的menuConfig
        if (options && options.menuConfig) {
            this.options.menuConfig = {
                ...this.options.menuConfig,
                ...options.menuConfig
            };
        }

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
        // 为每个菜单项绑定点击事件
        this.menu.querySelectorAll('.menu-item').forEach((item, index) => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();

                // 获取操作类型和当前笔记ID
                const action = item.dataset.action;
                const noteId = this.currentNoteId;

                if (!noteId) {
                    this.hideMenu();
                    return;
                }

                // 先隐藏菜单，然后执行操作
                this.hideMenu();

                switch (action) {
                    case 'trash':
                        // 从UI中移除笔记元素
                        this.removeNoteFromUI(noteId);
                        // 更新全局缓存中的笔记状态
                        this.updateNoteStateInGlobalCache(noteId, { inTrash: true });

                        // 调用API将笔记移动到回收站
                        try {
                            if (typeof api !== 'undefined' && api && typeof api.trashNote === 'function') {
                                api.trashNote(noteId)
                                    .then(response => {
                                        if (response && response.success) {
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
                                            if (typeof ToastMessage !== 'undefined') {
                                                ToastMessage.error('移动笔记到回收站失败，请重试');
                                            }
                                        }
                                    })
                                    .catch(error => {
                                        if (typeof ToastMessage !== 'undefined') {
                                            ToastMessage.error('移动笔记到回收站失败: ' + error.message);
                                        }
                                    });
                            } else {
                                // 强制刷新页面
                                this.refreshCurrentView(noteId, 'trash');
                            }
                        } catch (error) {
                            // 静默处理错误
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
                                api.starNote(noteId)
                                    .then(response => {
                                        if (response && response.success) {
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
                                            if (typeof ToastMessage !== 'undefined') {
                                                ToastMessage.error('收藏笔记失败，请重试');
                                            }
                                        }
                                    })
                                    .catch(error => {
                                        if (typeof ToastMessage !== 'undefined') {
                                            ToastMessage.error('收藏笔记失败: ' + error.message);
                                        }
                                    });
                            }
                        } catch (error) {
                            // 静默处理错误
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

                    case 'share':
                        this.openShareModal(noteId);
                        break;

                    case 'move':
                        this.openCategoryModal(noteId);
                        break;

                    case 'tag':
                        this.openTagModal(noteId);
                        break;

                    case 'unstar':
                        // 取消收藏笔记
                        this.unstarNote(noteId);
                        break;

                    case 'download':
                        this.downloadNote(noteId);
                        break;
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

        // 检查菜单元素和遮罩层是否存在
        if (!this.menu || !this.overlay) {
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

                // 如果菜单不可见，尝试强制显示
                if (window.getComputedStyle(menu).opacity !== '1' || menuRect.width === 0) {
                    // 重新应用内联样式
                    menu.style.display = 'block';
                    menu.style.opacity = '1';
                    menu.style.transform = 'none';
                    menu.style.pointerEvents = 'auto';
                    menu.style.visibility = 'visible';
                }

                // 延迟一段时间后重置菜单打开标记，但保持足够长以防止菜单被文档点击事件处理器关闭
                setTimeout(() => {
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
     * 更新笔记在全局缓存中的状态
     * @param {String} noteId - 笔记ID
     * @param {Object} stateUpdate - 状态更新对象
     */
    updateNoteStateInGlobalCache(noteId, stateUpdate) {
        try {
            // 更新本地存储中的笔记状态
            const updateNoteInStorage = (key) => {
                try {
                    const notesStr = localStorage.getItem(key);
                    if (!notesStr) return false;

                    const notes = JSON.parse(notesStr);
                    const noteIndex = notes.findIndex(n => n.id === noteId || n._id === noteId);

                    if (noteIndex !== -1) {
                        // 更新笔记状态
                        notes[noteIndex] = {
                            ...notes[noteIndex],
                            ...stateUpdate,
                            updatedAt: new Date().toISOString() // 更新时间戳
                        };

                        // 特殊处理分类更新

                        localStorage.setItem(key, JSON.stringify(notes));
                        return true;
                    }

                    return false;
                } catch (error) {
                    return false;
                }
            };

            // 尝试更新所有可能包含该笔记的存储
            const storageKeys = [
                'notes',
                'notes_cache',
                'starred_notes_cache',
                'shared_notes_cache',
                'trash_notes_cache'
            ];

            let updated = false;
            storageKeys.forEach(key => {
                if (updateNoteInStorage(key)) {
                    updated = true;
                }
            });

            if (updated) {
                // 触发存储更新事件，通知其他组件
                localStorage.setItem('notes_updated', Date.now().toString());

                // 如果更新的是分类，还要更新分类计数
                if (stateUpdate.categoryId !== undefined) {
                    this.updateCategoryCounts();
                }
            }
        } catch (error) {
            // 静默处理错误
        }
    }

    /**
     * 更新分类计数
     */
    updateCategoryCounts() {
        try {
            const categories = JSON.parse(localStorage.getItem('categories') || '[]');
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');

            // 重置所有分类的计数
            categories.forEach(category => {
                category.count = 0;
            });

            // 统计每个分类中的笔记数量（不包括回收站中的笔记）
            notes.forEach(note => {
                if (note.categoryId && !note.inTrash) {
                    const categoryIndex = categories.findIndex(c =>
                        c.id === note.categoryId || c._id === note.categoryId
                    );

                    if (categoryIndex !== -1) {
                        categories[categoryIndex].count = (categories[categoryIndex].count || 0) + 1;
                    }
                }
            });

            // 保存更新后的分类数据
            localStorage.setItem('categories', JSON.stringify(categories));
        } catch (error) {
            throw error;
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
            throw error;
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
        } catch (error) {
            throw error;
        }
    }

    /**
     * 刷新当前视图
     * @param {String} noteId - 笔记ID
     * @param {String} action - 操作类型
     * @param {Object} additionalData - 附加数据，如新的分类ID
     */
    refreshCurrentView(noteId, action, additionalData = {}) {
        // 检查当前页面，确定是否在特定分类页面
        const isInCategoryPage = window.location.pathname.includes('/note-categories');
        const isSingleNoteUpdate = noteId && action === 'move';

        // 处理分类更改的特殊情况
        if (isSingleNoteUpdate && action === 'move' && additionalData.categoryId !== undefined) {

            // 更新本地存储中的笔记分类
            this.updateNoteStateInGlobalCache(noteId, { categoryId: additionalData.categoryId });

            // 如果在分类页面上，需要考虑是否应该从当前视图中移除该笔记
            if (isInCategoryPage) {
                // 触发特殊的分类更新事件，允许分类页面处理是否需要刷新或移除笔记
                const categoryEvent = new CustomEvent('categoryUpdated', {
                    detail: {
                        noteId,
                        oldCategoryId: additionalData.oldCategoryId,
                        newCategoryId: additionalData.categoryId
                    }
                });
                document.dispatchEvent(categoryEvent);
                return; // 不需要触发常规刷新
            }
        }

        // 触发视图刷新事件，由具体页面的逻辑处理
        const refreshEvent = new CustomEvent('refreshNotes', {
            detail: { noteId, action, ...additionalData }
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
            return;
        }

        // 应用当前菜单配置
        this.applyMenuConfig();

        // 显示菜单
        this.showMenu(position, noteId);
    }

    /**
     * 根据笔记状态和当前页面更新菜单选项
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
                // 在收藏页面隐藏收藏选项，显示取消收藏选项
                options.hide = {
                    star: true
                };
                options.show = {
                    unstar: true
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
                    options.show = {
                        unstar: true
                    };
                }
            }

            // 应用配置
            this.toggleMenuItems(options);

        } catch (error) {
            throw error;
        }
    }

    /**
     * 打开分享设置弹窗
     * @param {String} noteId - 笔记ID
     */
    openShareModal(noteId) {
        const shareModal = document.getElementById('shareModal');
        if (!shareModal) return;

        // 保存当前要分享的笔记ID
        shareModal.dataset.noteId = noteId;

        // 更新分享方式UI
        const shareTypeRadios = document.querySelectorAll('input[name="shareType"]');
        if (shareTypeRadios.length > 0) {
            shareTypeRadios[0].checked = true; // 默认选择公开分享
        }

        // 清空密码输入框并隐藏
        const passwordGroup = document.getElementById('passwordGroup');
        const sharePassword = document.getElementById('sharePassword');
        if (passwordGroup) passwordGroup.style.display = 'none';
        if (sharePassword) sharePassword.value = '';

        // 更新分享链接
        this.updateShareLink(noteId);

        // 显示分享弹窗
        shareModal.style.display = 'flex';

        // 初始化分享弹窗的事件监听，但只初始化一次
        if (!shareModal._eventsInitialized) {
            this.initShareModalEvents();
            shareModal._eventsInitialized = true;
        }
    }

    /**
     * 更新分享链接
     * @param {String} noteId - 笔记ID
     */
    updateShareLink(noteId) {
        const shareLink = document.getElementById('shareLink');
        if (!shareLink) return;

        const shareType = document.querySelector('input[name="shareType"]:checked')?.value || 'public';
        const baseUrl = window.location.origin;
        shareLink.value = `${baseUrl}/view-shared-note.html?id=${noteId}&type=${shareType}`;
    }

    /**
     * 初始化分享弹窗的事件监听
     */
    initShareModalEvents() {
        const closeShareModal = document.getElementById('closeShareModal');
        const cancelShareBtn = document.getElementById('cancelShareBtn');
        const confirmShareBtn = document.getElementById('confirmShareBtn');
        const copyShareLink = document.getElementById('copyShareLink');
        const shareTypeRadios = document.querySelectorAll('input[name="shareType"]');
        const shareModal = document.getElementById('shareModal');

        // 关闭分享弹窗
        if (closeShareModal) {
            closeShareModal.addEventListener('click', () => {
                shareModal.style.display = 'none';
            });
        }

        // 取消分享
        if (cancelShareBtn) {
            cancelShareBtn.addEventListener('click', () => {
                shareModal.style.display = 'none';
            });
        }

        // 确认分享
        if (confirmShareBtn) {
            confirmShareBtn.addEventListener('click', async () => {
                try {
                    const noteId = shareModal.dataset.noteId;
                    const shareType = document.querySelector('input[name="shareType"]:checked').value;
                    const sharePassword = document.getElementById('sharePassword')?.value || '';
                    const shareExpiry = document.getElementById('shareExpiry')?.value || '0';

                    if (!noteId) {
                        throw new Error('找不到要分享的笔记ID');
                    }

                    // 禁用按钮，防止重复点击
                    confirmShareBtn.disabled = true;
                    confirmShareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

                    if (typeof api !== 'undefined' && api && typeof api.shareNote === 'function') {
                        const response = await api.shareNote(noteId, shareType, sharePassword, shareExpiry);
                        if (response && response.success) {
                            // 关闭弹窗并显示成功消息
                            shareModal.style.display = 'none';

                            // 如果存在ToastMessage组件，使用它显示消息
                            if (typeof ToastMessage !== 'undefined') {
                                ToastMessage.success('笔记分享成功');
                            } else {
                                alert('笔记分享成功');
                            }

                            // 刷新当前视图
                            this.refreshCurrentView(noteId, 'share');
                        } else {
                            throw new Error(response.message || '分享失败');
                        }
                    } else {
                        throw new Error('分享API不可用');
                    }
                } catch (error) {
                   // 如果存在ToastMessage组件，使用它显示错误
                    if (typeof ToastMessage !== 'undefined') {
                        ToastMessage.error(`分享失败: ${error.message}`);
                    } else {
                        alert(`分享失败: ${error.message}`);
                    }
                } finally {
                    // 恢复按钮状态
                    confirmShareBtn.disabled = false;
                    confirmShareBtn.innerHTML = '确认分享';
                }
            });
        }

        // 复制分享链接
        if (copyShareLink) {
            copyShareLink.addEventListener('click', () => {
                const shareLink = document.getElementById('shareLink');
                if (shareLink) {
                    shareLink.select();
                    document.execCommand('copy');

                    // 如果存在ToastMessage组件，使用它显示消息
                    if (typeof ToastMessage !== 'undefined') {
                        ToastMessage.success('分享链接已复制到剪贴板');
                    } else {
                        alert('分享链接已复制到剪贴板');
                    }
                }
            });
        }

        // 更新分享类型改变时的UI
        shareTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const passwordGroup = document.getElementById('passwordGroup');
                if (passwordGroup) {
                    // 如果是私密分享，显示密码输入框
                    passwordGroup.style.display = radio.value === 'private' ? 'block' : 'none';
                }

                // 更新分享链接
                this.updateShareLink(shareModal.dataset.noteId);
            });
        });
    }

    /**
     * 打开分类选择弹窗
     * @param {String} noteId - 笔记ID
     */
    openCategoryModal(noteId) {
        const categoryModal = document.getElementById('categorySelectModal');
        if (!categoryModal) return;

        // 保存当前要分类的笔记ID
        categoryModal.dataset.noteId = noteId;

        // 加载分类列表
        this.loadCategories();

        // 显示分类弹窗
        categoryModal.style.display = 'flex';

        // 初始化分类弹窗的事件监听，但只初始化一次
        if (!categoryModal._eventsInitialized) {
            this.initCategoryModalEvents();
            categoryModal._eventsInitialized = true;
        }
    }

    /**
     * 加载笔记分类列表
     */
    async loadCategories() {
        const categoriesList = document.getElementById('categoriesList');
        if (!categoriesList) return;

        try {
            // 显示加载中状态
            categoriesList.innerHTML = `
                <div class="loading-categories">
                    <i class="fas fa-spinner fa-spin"></i> 加载分类中...
                </div>
            `;

            // 获取分类数据
            const response = await api.getCategories();

            if (response && response.success && response.categories) {
                const categories = response.categories;

                if (categories.length === 0) {
                    categoriesList.innerHTML = `
                        <div class="empty-categories">
                            <i class="fas fa-folder-open"></i>
                            <p>暂无分类</p>
                        </div>
                    `;
                    return;
                }

                // 渲染分类列表
                categoriesList.innerHTML = categories.map(category => `
                    <div class="category-item" data-id="${category._id || category.id}">
                        <span class="category-color" style="background-color: ${category.color || '#1a73e8'}"></span>
                        <span class="category-name">${category.name}</span>
                        <span class="category-count">${category.noteCount || 0}</span>
                    </div>
                `).join('');

                // 添加分类项点击事件
                document.querySelectorAll('.category-item').forEach(item => {
                    item.addEventListener('click', function() {
                        // 移除其他项的选中状态
                        document.querySelectorAll('.category-item').forEach(i => i.classList.remove('selected'));
                        // 添加当前项的选中状态
                        this.classList.add('selected');
                    });
                });

            } else {
                throw new Error(response?.message || '获取分类失败');
            }
        } catch (error) {
            categoriesList.innerHTML = `
                <div class="empty-categories error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>加载分类失败: ${error.message}</p>
                    <button class="retry-btn">重试</button>
                </div>
            `;

            // 添加重试按钮事件
            const self = this;
            categoriesList.querySelector('.retry-btn')?.addEventListener('click', () => {
                self.loadCategories();
            });
        }
    }

    /**
     * 初始化分类弹窗的事件监听
     */
    initCategoryModalEvents() {
        const closeCategoryModal = document.getElementById('closeCategoryModal');
        const cancelCategorySelect = document.getElementById('cancelCategorySelect');
        const confirmCategorySelect = document.getElementById('confirmCategorySelect');
        const categorySearchInput = document.getElementById('categorySearchInput');
        const newCategoryName = document.getElementById('newCategoryName');
        const colorOptions = document.querySelectorAll('.color-option');
        const categoryModal = document.getElementById('categorySelectModal');

        // 关闭分类弹窗
        if (closeCategoryModal) {
            closeCategoryModal.addEventListener('click', () => {
                categoryModal.style.display = 'none';
            });
        }

        // 取消分类选择
        if (cancelCategorySelect) {
            cancelCategorySelect.addEventListener('click', () => {
                categoryModal.style.display = 'none';
            });
        }

        // 确认分类选择
        if (confirmCategorySelect) {
            confirmCategorySelect.addEventListener('click', async () => {
                try {
                    const noteId = categoryModal.dataset.noteId;

                    if (!noteId) {
                        throw new Error('找不到要分类的笔记ID');
                    }

                    // 禁用按钮，防止重复点击
                    confirmCategorySelect.disabled = true;
                    confirmCategorySelect.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

                    // 获取选中的分类ID，或者创建新分类
                    const selectedCategory = document.querySelector('.category-item.selected');
                    let categoryId = null;

                    // 判断是否需要创建新分类
                    const newName = newCategoryName.value.trim();

                    if (newName) {
                        // 获取选中的颜色
                        let color = '#1a73e8'; // 默认颜色
                        const selectedColor = document.querySelector('.color-option.selected');
                        if (selectedColor) {
                            color = selectedColor.dataset.color;
                        }

                        // 创建新分类
                        const createResponse = await api.createCategory({
                            name: newName,
                            color: color
                        });

                        if (createResponse && createResponse.success && createResponse.category) {
                            categoryId = createResponse.category._id || createResponse.category.id;
                        } else {
                            throw new Error(createResponse?.message || '创建分类失败');
                        }
                    } else if (selectedCategory) {
                        categoryId = selectedCategory.dataset.id;
                    } else {
                        throw new Error('请选择分类或创建新分类');
                    }

                    // 更新笔记分类
                    if (categoryId) {
                        // 获取笔记当前的分类ID
                        let oldCategoryId = null;
                        try {
                            const noteInfo = await api.getNote(noteId);
                            if (noteInfo && noteInfo.success && noteInfo.note) {
                                oldCategoryId = noteInfo.note.categoryId;
                            }
                        } catch (error) {
                            throw error;
                        }

                        const response = await api.updateNoteCategory(noteId, categoryId);

                        if (response && response.success) {
                            // 关闭弹窗并显示成功消息
                            categoryModal.style.display = 'none';

                            // 如果存在ToastMessage组件，使用它显示消息
                            if (typeof ToastMessage !== 'undefined') {
                                ToastMessage.success('笔记分类已更新');
                            } else {
                                alert('笔记分类已更新');
                            }

                            // 刷新当前视图，传递分类更新的相关信息
                            this.refreshCurrentView(noteId, 'move', {
                                categoryId: categoryId,
                                oldCategoryId: oldCategoryId
                            });
                        } else {
                            throw new Error(response?.message || '更新笔记分类失败');
                        }
                    }
                } catch (error) {
                    // 如果存在ToastMessage组件，使用它显示错误
                    if (typeof ToastMessage !== 'undefined') {
                        ToastMessage.error(`更新分类失败: ${error.message}`);
                    } else {
                        alert(`更新分类失败: ${error.message}`);
                    }
                } finally {
                    // 恢复按钮状态
                    confirmCategorySelect.disabled = false;
                    confirmCategorySelect.innerHTML = '保存';
                }
            });
        }

        // 分类搜索功能
        if (categorySearchInput) {
            categorySearchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                const categoryItems = document.querySelectorAll('.category-item');

                categoryItems.forEach(item => {
                    const categoryName = item.querySelector('.category-name').textContent.toLowerCase();
                    if (categoryName.includes(searchTerm) || searchTerm === '') {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }

        // 颜色选择事件
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }

    /**
     * 打开标签选择弹窗
     * @param {String} noteId - 笔记ID
     */
    openTagModal(noteId) {
        const tagModal = document.getElementById('tagSelectModal');
        if (!tagModal) return;

        // 保存当前要添加标签的笔记ID
        tagModal.dataset.noteId = noteId;

        // 加载标签列表
        this.loadTags(noteId);

        // 显示标签弹窗
        tagModal.style.display = 'flex';

        // 初始化标签弹窗的事件监听，但只初始化一次
        if (!tagModal._eventsInitialized) {
            this.initTagModalEvents();
            tagModal._eventsInitialized = true;
        }
    }

    /**
     * 加载标签列表
     * @param {String} noteId - 笔记ID
     */
    async loadTags(noteId) {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList) return;

        try {
            // 显示加载中状态
            tagsList.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> 加载标签中...
                </div>
            `;

            // 获取所有标签
            const response = await api.getTags();

            // 同时获取当前笔记的数据，以确定已选中的标签
            const noteResponse = await api.getNote(noteId);

            if (response && response.success && response.tags) {
                const tags = response.tags;
                const noteTags = (noteResponse && noteResponse.success && noteResponse.note.tags) || [];

                // 获取已选中的标签ID列表
                const selectedTagIds = noteTags.map(tag => tag._id || tag.id);

                if (tags.length === 0) {
                    tagsList.innerHTML = `
                        <div class="no-tags-message">
                            <p>暂无标签，您可以创建新标签</p>
                        </div>
                    `;
                    return;
                }

                // 渲染标签列表
                tagsList.innerHTML = tags.map(tag => `
                    <div class="tag-item ${selectedTagIds.includes(tag._id || tag.id) ? 'selected' : ''}" data-id="${tag._id || tag.id}">
                        <span class="tag-color-dot" style="background-color: ${tag.color || '#1a73e8'}"></span>
                        <span class="tag-name">${tag.name}</span>
                        <input type="checkbox" class="tag-checkbox" ${selectedTagIds.includes(tag._id || tag.id) ? 'checked' : ''}>
                    </div>
                `).join('');

                // 添加标签项点击事件
                document.querySelectorAll('.tag-item').forEach(item => {
                    item.addEventListener('click', function() {
                        this.classList.toggle('selected');
                        const checkbox = this.querySelector('.tag-checkbox');
                        checkbox.checked = !checkbox.checked;
                    });
                });

            } else {
                throw new Error(response?.message || '获取标签失败');
            }
        } catch (error) {
            tagsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>加载标签失败: ${error.message}</p>
                    <button class="retry-btn">重试</button>
                </div>
            `;

            // 添加重试按钮事件
            const self = this;
            tagsList.querySelector('.retry-btn')?.addEventListener('click', () => {
                self.loadTags(noteId);
            });
        }
    }

    /**
     * 初始化标签弹窗的事件监听
     */
    initTagModalEvents() {
        const closeTagModal = document.getElementById('closeTagModal');
        const cancelTagSelect = document.getElementById('cancelTagSelect');
        const confirmTagSelect = document.getElementById('confirmTagSelect');
        const tagSearchInput = document.getElementById('tagSearchInput');
        const newTagName = document.getElementById('newTagName');
        const tagColorOptions = document.querySelectorAll('.color-picker .color-option');
        const tagModal = document.getElementById('tagSelectModal');

        // 关闭标签弹窗
        if (closeTagModal) {
            closeTagModal.addEventListener('click', () => {
                tagModal.style.display = 'none';
            });
        }

        // 取消标签选择
        if (cancelTagSelect) {
            cancelTagSelect.addEventListener('click', () => {
                tagModal.style.display = 'none';
            });
        }

        // 确认标签选择
        if (confirmTagSelect) {
            confirmTagSelect.addEventListener('click', async () => {
                try {
                    const noteId = tagModal.dataset.noteId;

                    if (!noteId) {
                        throw new Error('找不到要添加标签的笔记ID');
                    }

                    // 禁用按钮，防止重复点击
                    confirmTagSelect.disabled = true;
                    confirmTagSelect.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';

                    // 获取选中的标签ID列表
                    const selectedTags = document.querySelectorAll('.tag-item .tag-checkbox:checked');
                    const selectedTagIds = Array.from(selectedTags).map(checkbox =>
                        checkbox.closest('.tag-item').dataset.id);

                    // 判断是否需要创建新标签
                    const newName = newTagName.value.trim();

                    if (newName) {
                        // 获取选中的颜色
                        let color = '#1a73e8'; // 默认颜色
                        const selectedColor = document.querySelector('.color-picker .color-option.selected');
                        if (selectedColor) {
                            color = selectedColor.dataset.color;
                        }

                        // 创建新标签
                        const createResponse = await api.createTag({
                            name: newName,
                            color: color
                        });

                        if (createResponse && createResponse.success && createResponse.tag) {
                            // 添加新创建的标签ID到选中列表
                            selectedTagIds.push(createResponse.tag._id || createResponse.tag.id);
                        } else {
                            throw new Error(createResponse?.message || '创建标签失败');
                        }
                    }

                    // 更新笔记标签
                    const response = await api.updateNoteTags(noteId, selectedTagIds);

                    if (response && response.success) {
                        // 关闭弹窗并显示成功消息
                        tagModal.style.display = 'none';

                        // 如果存在ToastMessage组件，使用它显示消息
                        if (typeof ToastMessage !== 'undefined') {
                            ToastMessage.success('笔记标签已更新');
                        } else {
                            alert('笔记标签已更新');
                        }

                        // 刷新当前视图
                        this.refreshCurrentView(noteId, 'tag');
                    } else {
                        throw new Error(response?.message || '更新笔记标签失败');
                    }
                } catch (error) {
                    // 如果存在ToastMessage组件，使用它显示错误
                    if (typeof ToastMessage !== 'undefined') {
                        ToastMessage.error(`更新标签失败: ${error.message}`);
                    } else {
                        alert(`更新标签失败: ${error.message}`);
                    }
                } finally {
                    // 恢复按钮状态
                    confirmTagSelect.disabled = false;
                    confirmTagSelect.innerHTML = '应用标签';
                }
            });
        }

        // 标签搜索功能
        if (tagSearchInput) {
            tagSearchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                const tagItems = document.querySelectorAll('.tag-item');

                tagItems.forEach(item => {
                    const tagName = item.querySelector('.tag-name').textContent.toLowerCase();
                    if (tagName.includes(searchTerm) || searchTerm === '') {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }

        // 标签颜色选择事件
        tagColorOptions.forEach(option => {
            option.addEventListener('click', function() {
                tagColorOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }

    /**
     * 更新菜单配置
     * @param {Object} config - 菜单配置
     * @param {Array} config.show - 要显示的菜单项action列表
     * @param {Array} config.hide - 要隐藏的菜单项action列表
     */
    updateMenuConfig(config) {
        if (!config) return;

        // 更新配置
        if (config.show) {
            this.options.menuConfig.show = config.show;
        }

        if (config.hide) {
            this.options.menuConfig.hide = config.hide;
        }

        // 刷新菜单项显示状态
        this.applyMenuConfig();
    }

    /**
     * 应用当前菜单配置
     */
    applyMenuConfig() {
        if (!this.menu) return;

        const { show, hide } = this.options.menuConfig;

        // 隐藏所有菜单项
        this.menu.querySelectorAll('.menu-item').forEach(item => {
            const action = item.dataset.action;

            // 默认隐藏
            item.style.display = 'none';

            // 如果在显示列表中，则显示
            if (show.includes(action)) {
                item.style.display = 'flex';
            }

            // 如果在隐藏列表中，则强制隐藏
            if (hide.includes(action)) {
                item.style.display = 'none';
            }
        });

        // 处理分隔线，如果某个分隔线前后都没有显示的菜单项，则隐藏该分隔线
        const dividers = this.menu.querySelectorAll('.menu-divider');
        dividers.forEach((divider, index) => {
            // 获取前后的菜单项
            let prevItem = divider.previousElementSibling;
            let nextItem = divider.nextElementSibling;

            // 向前查找可见的菜单项
            while (prevItem && (prevItem.style.display === 'none' || prevItem.classList.contains('menu-divider'))) {
                prevItem = prevItem.previousElementSibling;
            }

            // 向后查找可见的菜单项
            while (nextItem && (nextItem.style.display === 'none' || nextItem.classList.contains('menu-divider'))) {
                nextItem = nextItem.nextElementSibling;
            }

            // 如果前后都没有可见的菜单项，则隐藏该分隔线
            if (!prevItem || !nextItem ||
                prevItem.style.display === 'none' ||
                nextItem.style.display === 'none') {
                divider.style.display = 'none';
            } else {
                divider.style.display = 'block';
            }
        });
    }

    /**
     * 设置页面类型，自动配置适合该页面的菜单项
     * @param {String} pageType - 页面类型，如 'dashboard', 'starred', 'trash' 等
     */
    setPageType(pageType) {
        switch(pageType) {
            case 'dashboard':
                // 仪表盘页面：显示编辑、分享、收藏、分类、标签、回收站
                this.updateMenuConfig({
                    show: ['edit', 'share', 'star', 'move', 'tag', 'trash', 'download'],
                    hide: ['unstar', 'delete', 'restore']
                });
                break;

            case 'starred':
                // 收藏页面：显示编辑、分享、取消收藏、分类、标签、回收站
                this.updateMenuConfig({
                    show: ['edit', 'share', 'unstar', 'move', 'tag', 'trash'],
                    hide: ['star', 'delete', 'restore', 'download']
                });
                break;

            case 'trash':
                // 回收站页面：显示恢复、永久删除
                this.updateMenuConfig({
                    show: ['restore', 'delete'],
                    hide: ['edit', 'share', 'star', 'unstar', 'move', 'tag', 'trash', 'download']
                });
                break;

            case 'shared':
                // 分享页面：显示编辑、取消分享、收藏/取消收藏、分类、标签、回收站
                this.updateMenuConfig({
                    show: ['edit', 'unshare', 'star', 'move', 'tag', 'trash'],
                    hide: ['share', 'delete', 'restore', 'download']
                });
                break;

            default:
                // 默认配置
                this.updateMenuConfig({
                    show: ['edit', 'share', 'star', 'move', 'tag', 'trash', 'download'],
                    hide: ['unstar', 'delete', 'restore']
                });
        }
    }

    /**
     * 取消收藏笔记
     * @param {String} noteId 笔记ID
     * @returns {Promise<Object>} 响应结果
     */
    async unstarNote(noteId) {
        try {
            // 使用正确的confirm方法而不是show方法
            ConfirmDialog.confirm('取消收藏', '确定要取消收藏此笔记吗？', (confirmed) => {
                if (confirmed) {
                    this._performUnstarNote(noteId);
                }
            });

            return true; // 返回true表示对话框已显示
        } catch (error) {
            ToastMessage.error('取消收藏失败: ' + (error.message || '未知错误'));
            return false;
        }
    }

    // 执行实际的取消收藏操作
    async _performUnstarNote(noteId) {
        try {
            // 从UI中移除笔记元素
            this.removeNoteFromUI(noteId);

            // 更新全局缓存中的收藏状态
            this.updateNoteStateInGlobalCache(noteId, { isStarred: false, starred: false });

            // 刷新当前视图
            this.refreshCurrentView(noteId, 'unstar');

            // 使用commpush组件取消收藏
            const response = await this.api.unstarNote(noteId);

            if (response && response.success) {
                // 显示成功消息
                ToastMessage.success('已从收藏夹中移除');

                // 清理收藏笔记缓存，强制下次访问从API获取
                localStorage.removeItem('starred_notes_cache');
                localStorage.removeItem('starred_notes_timestamp');

                // 触发笔记更新事件
                localStorage.setItem('notes_updated', Date.now().toString());

                return response;
            } else {
                ToastMessage.error('取消收藏失败: ' + (response?.message || '未知错误'));
                return false;
            }
        } catch (error) {
            ToastMessage.error('取消收藏失败: ' + (error.message || '未知错误'));
            return false;
        }
    }

    /**
     * 下载单个笔记
     * @param {String} noteId - 笔记ID
     */
    async downloadNote(noteId) {
        try {
            // 获取笔记数据
            const apiClient = window.commpush || window.api;
            const response = await apiClient.getNote(noteId);
            
            if (!response || !response.success || !response.note) {
                console.error('获取笔记失败');
                ToastMessage.error('获取笔记失败');
                return;
            }
            
            const note = response.note;
            
            // 转换笔记内容为Markdown
            let content = this.htmlToMarkdown(note.content || note.contentData || '');
            
            // 确保内容以笔记标题开头
            content = `# ${note.title || 'Untitled'}\n\n${content}`;
            
            // 创建Blob对象
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // 使用笔记标题作为文件名，确保文件名合法
            const safeTitle = (note.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '_');
            link.download = `${safeTitle}.md`;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 释放URL对象
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            
            // 显示成功消息
            if (window.ToastMessage) {
                window.ToastMessage.success('笔记下载成功');
            }
        } catch (error) {
            console.error('下载笔记时出错:', error);
            if (window.ToastMessage) {
                window.ToastMessage.error('下载笔记失败: ' + (error.message || '未知错误'));
            }
        }
    }
    
    /**
     * 将HTML转换为Markdown
     * @param {String} html - HTML内容
     * @returns {String} Markdown内容
     */
    htmlToMarkdown(html) {
        if (!html) return '';

        // 创建临时DOM元素来解析HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 递归处理节点
        function processNode(node, level = 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            let result = '';
            const nodeName = node.nodeName.toLowerCase();

            // 处理不同类型的HTML元素
            switch (nodeName) {
                case 'h1':
                    return `# ${getTextContent(node)}\n\n`;
                case 'h2':
                    return `## ${getTextContent(node)}\n\n`;
                case 'h3':
                    return `### ${getTextContent(node)}\n\n`;
                case 'h4':
                    return `#### ${getTextContent(node)}\n\n`;
                case 'h5':
                    return `##### ${getTextContent(node)}\n\n`;
                case 'h6':
                    return `###### ${getTextContent(node)}\n\n`;
                case 'p':
                    return `${processChildren(node)}\n\n`;
                case 'strong':
                case 'b':
                    return `**${processChildren(node)}**`;
                case 'em':
                case 'i':
                    return `*${processChildren(node)}*`;
                case 'a':
                    return `[${processChildren(node)}](${node.getAttribute('href') || ''})`;
                case 'img':
                    return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`;
                case 'code':
                    if (node.parentNode && node.parentNode.nodeName.toLowerCase() === 'pre') {
                        // 这是代码块的一部分，由pre处理
                        return processChildren(node);
                    }
                    return `\`${processChildren(node)}\``;
                case 'pre':
                    return `\`\`\`\n${getTextContent(node)}\n\`\`\`\n\n`;
                case 'ul':
                case 'ol':
                    return processChildren(node) + '\n';
                case 'li':
                    return `- ${processChildren(node)}\n`;
                case 'blockquote':
                    return `> ${processChildren(node)}\n\n`;
                case 'br':
                    return '\n';
                case 'div':
                    return processChildren(node) + (level === 0 ? '\n\n' : '');
                default:
                    return processChildren(node);
            }
        }

        function processChildren(node) {
            let result = '';
            for (const child of node.childNodes) {
                result += processNode(child, 1);
            }
            return result;
        }

        function getTextContent(node) {
            return node.textContent.trim();
        }

        let markdown = '';
        for (const child of tempDiv.childNodes) {
            markdown += processNode(child);
        }

        return markdown.trim();
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteActionsMenu;
} else {
    window.NoteActionsMenu = NoteActionsMenu;
}