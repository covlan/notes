/**
 * Dashboard页面脚本
 * 使用NotesLoader组件加载笔记
 */

// 导入NotesLoader组件
let notesLoader = null;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

/**
 * 初始化仪表盘
 */
function initDashboard() {
    // 确保CommPush实例已初始化
    const apiClient = window.commpush || (window.api ? new CommPush() : new API());
    window.commpush = apiClient;

    // 验证当前用户会话状态
    validateUserSession()
        .then(valid => {
            if (valid) {
                initNotesLoader();
            }
        })
        .catch(error => {
            // 会话验证失败将自动跳转到登录页
        });
}

/**
 * 验证用户会话状态
 * @returns {Promise<boolean>} 会话是否有效
 */
async function validateUserSession() {
    try {
        // 检查本地存储中是否有令牌
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login?session=not_found';
            return false;
        }

        // 在加载笔记前验证一次会话状态(无需显示错误提示)
        try {
            // 使用commpush组件替代直接API调用
            const result = await window.commpush.getCurrentUser();

            if (!result || !result.success) {
                return false;
            }

            return true;
        } catch (apiError) {
            return false;
        }
    } catch (error) {
        // API.js中的handleSessionExpiration将处理特定错误并重定向
        return false;
    }
}

/**
 * 初始化笔记加载器
 */
function initNotesLoader() {
    // 初始化NotesLoader
    notesLoader = new NotesLoader({
        containerSelector: '.notes-grid',
        apiClient: window.commpush, // 使用commpush替代api
        onLoadSuccess: handleNotesLoaded,
        onLoadError: handleNotesError
    });

    // 设置全局对象以便ContentHeader组件访问
    window.notesLoader = notesLoader;
    window.loadDashboardNotes = loadDashboardNotes;

    // 加载笔记，使用当前视图模式
    const currentViewMode = localStorage.getItem('viewMode') || 'grid';
    loadDashboardNotes(false, currentViewMode);
}

/**
 * 加载仪表盘笔记
 * @param {Boolean} forceRefresh 是否强制刷新
 * @param {String} viewMode 视图模式 (grid/list)
 * @returns {Promise} 加载完成的Promise
 */
function loadDashboardNotes(forceRefresh = false, viewMode = null) {
    // 如果未提供viewMode，从localStorage获取
    if (viewMode === null) {
        viewMode = localStorage.getItem('viewMode') || 'grid';
    }

    // 加载非回收站笔记，明确设置参数
    return notesLoader.loadNotes({
        inTrash: false,     // 明确排除回收站笔记
        forceRefresh: forceRefresh, // 是否强制刷新
        excludeTrash: true,  // 额外参数，确保在所有情况下排除回收站笔记
        fallbackToLocalStorage: true, // 启用本地存储回退，确保API失败时仍能显示笔记
        viewMode: viewMode   // 传递视图模式
    });
}

/**
 * 处理笔记加载成功
 * @param {Array} notes 已加载的笔记
 * @param {Object} options 加载选项
 */
function handleNotesLoaded(notes, options) {
    // 列表视图的更新由NotesLoader直接处理，这里不需要重复调用

    // 添加笔记点击事件
    attachNoteEvents(notes);
}

/**
 * 更新列表视图
 * @param {Array} notes 笔记数据
 */
function updateListView(notes) {
    const notesList = document.querySelector('.notes-list');
    if (!notesList) return;

    if (!notes || notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-notes">
                <i class="fas fa-book-open"></i>
                <p>暂无笔记，点击右下角按钮创建</p>
            </div>
        `;
        return;
    }

    // 生成列表视图
    notesList.innerHTML = notes.map(note => `
        <div class="note-list-item" data-id="${note._id || note.id}">
            <div class="note-list-content">
                <div class="note-list-title">
                    ${note.title || '无标题笔记'}
                    ${note.shared ? `<span class="note-badge-small ${note.shareType === 'private' ? 'private' : 'public'}">
                        <i class="fas ${note.shareType === 'private' ? 'fa-lock' : 'fa-share-alt'}"></i>
                        ${note.shareType === 'private' ? '私密' : '已分享'}
                    </span>` : ''}
                </div>
                <div class="note-list-preview">${notesLoader.getContentPreview(note.content || '', 200)}</div>
            </div>
            <div class="note-list-meta">
                <span><i class="far fa-clock"></i> ${notesLoader.formatDate(note.updatedAt || note.createdAt)}</span>
                <span><i class="far fa-file-alt"></i> ${note.category ? note.category.name : '未分类'}</span>
            </div>
            <button class="note-action-btn" data-id="${note._id || note.id}">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </div>
    `).join('');

    // 添加列表项点击事件
    attachNoteEvents(notes, '.note-list-item');
}

/**
 * 处理笔记加载错误
 * @param {Error} error 错误对象
 */
function handleNotesError(error) {
    // 在列表视图中也显示错误信息
    const notesList = document.querySelector('.notes-list');
    if (notesList) {
        notesList.innerHTML = `
            <div class="empty-notes error">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载笔记失败: ${error.message || '未知错误'}</p>
                <button class="retry-btn">重试</button>
            </div>
        `;

        // 添加重试按钮事件
        const retryBtn = notesList.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                const currentViewMode = localStorage.getItem('viewMode') || 'grid';
                loadDashboardNotes(true, currentViewMode);
            });
        }
    }
}

/**
 * 设置视图切换功能
 * 注意：现在由ContentHeader组件处理，此方法不再使用
 * 保留用于兼容旧代码
 */
function setupViewToggle() {
    // 此函数保留是为了兼容性，实际功能已由ContentHeader组件接管
}

/**
 * 设置刷新按钮功能
 * 注意：现在由ContentHeader组件处理，此方法不再使用
 * 保留用于兼容旧代码
 */
function setupRefreshButton() {
    // 此函数保留是为了兼容性，实际功能已由ContentHeader组件接管
}

/**
 * 笔记卡片的点击事件
 * @param {Array} notes 笔记数据
 * @param {String} selector 额外的选择器
 */
function attachNoteEvents(notes, selector = '') {
    // 添加笔记点击事件
    document.querySelectorAll(`.note-card${selector ? ', ' + selector : ''}`).forEach(item => {
        // 移除之前可能存在的事件监听
        item.removeEventListener('click', noteClickHandler);

        // 添加点击事件处理
        item.addEventListener('click', noteClickHandler);
    });

    // 添加操作按钮点击事件
    document.querySelectorAll('.note-action-btn, .more-btn').forEach(btn => {
        // 移除之前可能存在的事件监听
        btn.removeEventListener('click', menuBtnClickHandler);

        // 添加点击事件处理
        btn.addEventListener('click', menuBtnClickHandler);
    });

    // 笔记点击处理函数
    function noteClickHandler(e) {
        // 检查点击的不是操作按钮
        if (!e.target.closest('.note-action-btn') && !e.target.closest('.more-btn')) {
            const noteId = this.dataset.id;

            // 查找笔记的详细信息
            const note = notes.find(n => (n.id === noteId || n._id === noteId));

            if (note) {
                // 检查笔记是否已经被分享
                if (note.shared) {
                    // 如果已分享，使用常规分享链接格式
                    const shareUrl = `${window.location.origin}/view-shared-note?id=${note.shareId || noteId}`;
                    window.open(shareUrl, '_blank');
                } else {
                    // 如果未分享，传递用户令牌以便查看
                    const token = localStorage.getItem('token');
                    const viewUrl = `${window.location.origin}/view-shared-note?id=${noteId}&mode=private&token=${encodeURIComponent(token)}`;
                    window.open(viewUrl, '_blank');
                }
            } else {
                // 常规方式打开编辑器
                openNoteEditor(noteId);
            }
        }
    }

    // 菜单按钮点击处理函数
    function menuBtnClickHandler(e) {
        e.stopPropagation();
        e.preventDefault();

        const btn = this;
        const noteCard = btn.closest('.note-card') || btn.closest('.note-list-item');

        // 优先从按钮获取noteId，如果没有再从卡片获取
        let noteId = btn.dataset.id;

        // 如果按钮上没有ID，尝试从卡片获取
        if (!noteId && noteCard) {
            noteId = noteCard.dataset.id;
        }

        // 确保noteId存在
        if (!noteId) {
            return;
        }

        // 获取按钮位置
        const rect = btn.getBoundingClientRect();

        // 显示菜单 - 优先使用按钮底部中心位置更符合用户期望
        const position = {
            x: rect.left + (rect.width / 2),  // 按钮中心
            y: rect.bottom + 5  // 按钮底部略微偏下
        };

        // 保存事件对象，确保不会被document点击事件捕获
        const originalEvent = e;

        // 立即调用全局菜单显示函数
        if (typeof window.showNoteMenu === 'function') {
            // 标记事件已处理，防止document点击事件关闭菜单
            originalEvent._menuBtnHandled = true;
            window.showNoteMenu(position, noteId);
        }
    }
}

/**
 * 将笔记移到垃圾桶
 * @param {String} noteId 笔记ID
 * @returns {Promise} 移动结果的Promise
 */
async function trashNote(noteId) {
    try {
        // 注释掉此API调用，因为NoteActionsMenu组件已经处理了API调用和提示
        // 这里不需要重复调用API，只需处理UI更新

        // 刷新笔记列表
        loadDashboardNotes(true);
        return true;
    } catch (error) {
        ToastMessage.error('操作失败: ' + (error.message || '未知错误'));
        return false;
    }
}

/**
 * 显示Toast消息
 * @param {String} message 消息内容
 * @param {String} type 消息类型
 * @param {Number} duration 持续时间
 */
function showToast(message, type = 'success', duration = 3000) {
    if (typeof ToastMessage !== 'undefined') {
        if (type === 'success') {
            ToastMessage.success(message, duration);
        } else if (type === 'error') {
            ToastMessage.error(message, duration);
        } else if (type === 'warning') {
            ToastMessage.warning(message, duration);
        } else {
            ToastMessage.info(message, duration);
        }
    } else {
        // 简单的后备方案
        alert(message);
    }
}

// 导出函数供外部使用
window.loadDashboardNotes = loadDashboardNotes;