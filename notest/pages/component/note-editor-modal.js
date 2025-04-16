/**
 * 笔记编辑器模态窗口
 * 用于创建和编辑笔记内容
 */
class NoteEditorModal {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        this.options = Object.assign({
            containerId: 'editorModal',
            noteId: null,
            apiClient: window.api,
            onSave: null,
            onClose: null
        }, options);

        this.noteData = null;
        this.isEditing = false;
        this.isNew = !this.options.noteId;
        this.editor = null;
        this.isInitialized = false;

        try {
            this.init();
        } catch (error) {
            this.showErrorMessage('初始化编辑器失败，请刷新页面重试');
        }
    }

    /**
     * 初始化编辑器
     */
    async init() {
        // 创建或获取容器
        this.container = document.getElementById(this.options.containerId);
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = this.options.containerId;
            this.container.className = 'editor-modal-container';
            document.body.appendChild(this.container);
        }

        this.render();

        if (this.options.noteId) {
            try {
                await this.loadNote(this.options.noteId);
            } catch (error) {
                this.showErrorMessage('加载笔记失败，请稍后重试');
            }
        } else {
            this.noteData = {
                id: null,
                title: '',
                content: '',
                tags: [],
                category: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.updateUI();
        }

        this.setupEventListeners();
        this.isInitialized = true;
    }

    /**
     * 渲染编辑器界面
     */
    render() {
        this.container.innerHTML = `
            <div class="editor-modal">
                <div class="editor-header">
                    <div class="editor-title">
                        <input type="text" id="noteTitle" placeholder="输入笔记标题..." />
                    </div>
                    <div class="editor-actions">
                        <button class="editor-btn save-btn" id="saveNoteBtn">
                            <i class="fas fa-save"></i>
                            <span>保存</span>
                        </button>
                        <button class="editor-btn close-btn" id="closeEditorBtn">
                            <i class="fas fa-times"></i>
                            <span>关闭</span>
                        </button>
                    </div>
                </div>
                <div class="editor-body">
                    <div class="editor-loading">
                        <div class="spinner"></div>
                        <p>加载中...</p>
                    </div>
                    <div class="editor-container" id="editorContainer"></div>
                </div>
                <div class="editor-error" id="editorError">
                    <i class="fas fa-exclamation-circle"></i>
                    <span class="error-message"></span>
                    <button class="retry-btn">重试</button>
                </div>
            </div>
        `;

        // 显示模态窗口
        this.container.style.display = 'flex';

        // 添加样式
        this.addStyles();
    }

    /**
     * 添加编辑器样式
     */
    addStyles() {
        const styleId = 'note-editor-modal-styles';
        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .editor-modal-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                padding: 20px;
                box-sizing: border-box;
                overflow: auto;
            }

            .editor-modal {
                width: 100%;
                max-width: 800px;
                height: 80vh;
                max-height: 700px;
                background-color: var(--card-bg, #fff);
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .dark-mode .editor-modal {
                background-color: var(--card-bg, #2d2d2d);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }

            .editor-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid var(--border-color, #eee);
            }

            .dark-mode .editor-header {
                border-bottom-color: var(--border-color, #444);
            }

            .editor-title {
                flex: 1;
            }

            .editor-title input {
                width: 100%;
                font-size: 18px;
                font-weight: 600;
                padding: 8px 0;
                border: none;
                background: transparent;
                color: var(--text-color, #333);
                outline: none;
            }

            .dark-mode .editor-title input {
                color: var(--text-color, #eee);
            }

            .editor-title input::placeholder {
                color: var(--text-muted, #999);
            }

            .editor-actions {
                display: flex;
                gap: 10px;
            }

            .editor-btn {
                padding: 8px 15px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
            }

            .save-btn {
                background-color: var(--primary-color, #1a73e8);
                color: white;
            }

            .save-btn:hover {
                background-color: var(--primary-color-hover, #1765cc);
            }

            .close-btn {
                background-color: var(--btn-secondary-bg, #f0f0f0);
                color: var(--btn-secondary-text, #333);
            }

            .close-btn:hover {
                background-color: var(--btn-secondary-hover, #e0e0e0);
            }

            .dark-mode .close-btn {
                background-color: var(--btn-secondary-bg, #444);
                color: var(--btn-secondary-text, #eee);
            }

            .dark-mode .close-btn:hover {
                background-color: var(--btn-secondary-hover, #555);
            }

            .editor-body {
                flex: 1;
                overflow: hidden;
                position: relative;
            }

            .editor-container {
                width: 100%;
                height: 100%;
                overflow: auto;
            }

            .editor-loading {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background-color: var(--card-bg, rgba(255, 255, 255, 0.9));
                z-index: 1;
            }

            .dark-mode .editor-loading {
                background-color: var(--card-bg, rgba(45, 45, 45, 0.9));
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid rgba(0, 0, 0, 0.1);
                border-radius: 50%;
                border-top: 4px solid var(--primary-color, #1a73e8);
                animation: spin 1s linear infinite;
            }

            .dark-mode .spinner {
                border-color: rgba(255, 255, 255, 0.1);
                border-top-color: var(--primary-color, #4b8bf4);
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .editor-loading p {
                margin-top: 15px;
                color: var(--text-color, #666);
            }

            .dark-mode .editor-loading p {
                color: var(--text-color, #bbb);
            }

            .editor-error {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: none;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                background-color: var(--card-bg, rgba(255, 255, 255, 0.9));
                z-index: 2;
                padding: 20px;
                text-align: center;
            }

            .dark-mode .editor-error {
                background-color: var(--card-bg, rgba(45, 45, 45, 0.9));
            }

            .editor-error i {
                font-size: 48px;
                color: var(--danger-color, #ea4335);
                margin-bottom: 15px;
            }

            .editor-error .error-message {
                font-size: 16px;
                color: var(--text-color, #333);
                margin-bottom: 20px;
            }

            .dark-mode .editor-error .error-message {
                color: var(--text-color, #eee);
            }

            .editor-error .retry-btn {
                padding: 8px 15px;
                background-color: var(--primary-color, #1a73e8);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }

            .editor-error .retry-btn:hover {
                background-color: var(--primary-color-hover, #1765cc);
            }

            /* 响应式布局 */
            @media (max-width: 768px) {
                .editor-modal {
                    width: 100%;
                    height: 100%;
                    max-width: none;
                    max-height: none;
                    border-radius: 0;
                }

                .editor-modal-container {
                    padding: 0;
                }

                .editor-header {
                    padding: 10px 15px;
                }

                .editor-title input {
                    font-size: 16px;
                }

                .editor-btn span {
                    display: none;
                }

                .editor-btn {
                    padding: 8px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 保存按钮
        const saveBtn = document.getElementById('saveNoteBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveNote();
            });
        }

        // 关闭按钮
        const closeBtn = document.getElementById('closeEditorBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // 重试按钮
        const retryBtn = document.querySelector('.editor-error .retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.options.noteId) {
                    this.loadNote(this.options.noteId);
                } else {
                    // 隐藏错误信息
                    const errorEl = document.getElementById('editorError');
                    if (errorEl) {
                        errorEl.style.display = 'none';
                    }

                    // 重新初始化编辑器
                    this.initEditor();
                }
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.container.style.display === 'flex') {
                this.close();
            }
        });

        // 处理主题变化
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'themeChanged') {
                const theme = event.data.theme;
                if (theme === 'dark') {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            }
        });

        // 阻止关闭窗口时丢失未保存的更改
        window.addEventListener('beforeunload', (e) => {
            if (this.isEditing && this.hasUnsavedChanges()) {
                const message = '您有未保存的更改，确定要离开吗？';
                e.preventDefault();
                return message;
            }
        });
    }

    /**
     * 加载笔记数据
     * @param {String} noteId - 笔记ID
     */
    async loadNote(noteId) {
        try {
            this.showLoading(true);

            // 隐藏可能存在的错误信息
            this.hideError();

            // 使用API客户端获取笔记数据
            if (this.options.apiClient && typeof this.options.apiClient.getNote === 'function') {
                const response = await this.options.apiClient.getNote(noteId);

                if (response && response.success) {
                    this.noteData = response.note;
                } else {
                    throw new Error(response.message || '获取笔记数据失败');
                }
            } else {
                // 在没有API的情况下，从本地存储中获取
                this.loadNoteFromLocalStorage(noteId);
            }

            // 更新UI
            this.updateUI();

        } catch (error) {
            this.showErrorMessage('无法加载笔记数据: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 从本地存储加载笔记
     * @param {String} noteId - 笔记ID
     */
    loadNoteFromLocalStorage(noteId) {
        try {
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');

            const note = notes.find(n => (n.id === noteId || n._id === noteId));

            if (!note) {
                throw new Error('找不到指定的笔记');
            }

            this.noteData = note;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 更新UI
     */
    updateUI() {
        try {
            // 设置笔记标题
            const titleInput = document.getElementById('noteTitle');
            if (titleInput && this.noteData) {
                titleInput.value = this.noteData.title || '';
            }

            // 初始化编辑器
            this.initEditor();
        } catch (error) {
            this.showErrorMessage('更新编辑器界面失败');
        }
    }

    /**
     * 初始化编辑器
     */
    initEditor() {
        try {
            const editorContainer = document.getElementById('editorContainer');

            if (!editorContainer) {
                throw new Error('找不到编辑器容器元素');
            }

            // 清空编辑器容器
            editorContainer.innerHTML = '';

            // 创建编辑器所需的元素
            const editorArea = document.createElement('div');
            editorArea.id = 'note-editor-area';
            editorArea.className = 'note-editor-area';
            editorContainer.appendChild(editorArea);

            // 这里可以根据实际情况集成不同的编辑器，如TinyMCE、CKEditor、Quill等
            // 此处使用简单的textarea作为演示
            const textarea = document.createElement('textarea');
            textarea.className = 'note-content-editor';
            textarea.value = this.noteData ? (this.noteData.content || '') : '';
            textarea.placeholder = '在此输入笔记内容...';
            editorArea.appendChild(textarea);

            // 添加编辑器样式
            const editorStyles = document.createElement('style');
            editorStyles.textContent = `
                .note-editor-area {
                    width: 100%;
                    height: 100%;
                    padding: 15px;
                    box-sizing: border-box;
                }

                .note-content-editor {
                    width: 100%;
                    height: 100%;
                    resize: none;
                    border: none;
                    outline: none;
                    font-size: 16px;
                    line-height: 1.5;
                    color: var(--text-color, #333);
                    background-color: transparent;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }

                .dark-mode .note-content-editor {
                    color: var(--text-color, #eee);
                }

                .note-content-editor::placeholder {
                    color: var(--text-muted, #999);
                }
            `;
            document.head.appendChild(editorStyles);

            // 保存编辑器引用
            this.editor = textarea;

            // 设置为编辑模式
            this.isEditing = true;

            // 设置焦点
            setTimeout(() => {
                textarea.focus();
            }, 100);
        } catch (error) {
            this.showErrorMessage('初始化编辑器失败: ' + error.message);
        }
    }

    /**
     * 保存笔记
     */
    async saveNote() {
        try {
            if (!this.editor) {
                throw new Error('编辑器未初始化');
            }

            this.showLoading(true);

            // 获取标题和内容
            const title = document.getElementById('noteTitle').value.trim() || '无标题笔记';
            const content = this.editor.value;

            // 更新笔记数据
            if (!this.noteData) {
                this.noteData = {};
            }

            this.noteData.title = title;
            this.noteData.content = content;
            this.noteData.updatedAt = new Date().toISOString();

            if (!this.noteData.id && !this.noteData._id) {
                this.noteData.id = 'note_' + Date.now();
                this.noteData.createdAt = new Date().toISOString();
            }

            // 使用API保存
            if (this.options.apiClient && typeof this.options.apiClient.saveNote === 'function') {
                const response = await this.options.apiClient.saveNote(this.noteData);

                if (!response || !response.success) {
                    throw new Error(response.message || '保存笔记失败');
                }

                // 更新笔记数据
                if (response.note) {
                    this.noteData = response.note;
                }
            } else {
                // 在没有API的情况下，保存到本地存储
                this.saveNoteToLocalStorage();
            }

            // 调用保存回调
            if (typeof this.options.onSave === 'function') {
                this.options.onSave(this.noteData);
            }

            // 显示成功消息
            this.showSuccessMessage('笔记已保存');

            // 更新编辑状态
            this.isEditing = false;

            // 短暂延迟后关闭
            setTimeout(() => {
                this.close();
            }, 1500);
        } catch (error) {
            this.showErrorMessage('保存笔记失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * 保存笔记到本地存储
     */
    saveNoteToLocalStorage() {
        try {
            // 从本地存储获取所有笔记
            const notesStr = localStorage.getItem('notes');
            const notes = notesStr ? JSON.parse(notesStr) : [];

            // 查找是否已存在该笔记
            const index = notes.findIndex(note =>
                (note.id === this.noteData.id) || (note._id === this.noteData._id)
            );

            if (index >= 0) {
                // 更新现有笔记
                notes[index] = { ...notes[index], ...this.noteData };
            } else {
                // 添加新笔记
                notes.push(this.noteData);
            }

            // 保存回本地存储
            localStorage.setItem('notes', JSON.stringify(notes));

            // 更新缓存标志
            localStorage.setItem('notes_updated', Date.now().toString());

            // 触发自动同步
            this.syncWithServer();
        } catch (error) {
            throw error;
        }
    }

    /**
     * 与服务器同步笔记数据
     */
    async syncWithServer() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const notesStr = localStorage.getItem('notes');
            const notes = notesStr ? JSON.parse(notesStr) : [];
            const lastSync = localStorage.getItem('last_sync') || '0';

            // 获取服务器上的最新数据
            const response = await fetch(`${getBaseUrl()}/api/notes/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    lastSync: parseInt(lastSync),
                    notes: notes
                })
            });

            if (!response.ok) {
                throw new Error('同步失败');
            }

            const data = await response.json();

            // 更新本地存储
            if (data.notes) {
                localStorage.setItem('notes', JSON.stringify(data.notes));
            }

            // 更新最后同步时间
            localStorage.setItem('last_sync', Date.now().toString());

            // 更新UI
            this.updateNotesList(data.notes);
        } catch (error) {
            // 显示错误通知
            this.showNotification('同步失败，数据已保存在本地', 'error');
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * 更新笔记列表UI
     */
    updateNotesList(notes) {
        // 触发自定义事件通知其他组件更新
        const event = new CustomEvent('notesUpdated', { detail: { notes } });
        document.dispatchEvent(event);
    }

    /**
     * 关闭编辑器
     */
    close() {
        try {
            // 检查是否有未保存的更改
            if (this.isEditing && this.hasUnsavedChanges()) {
                const confirmed = window.confirm('您有未保存的更改，确定要关闭吗？');
                if (!confirmed) {
                    return;
                }
            }

            // 隐藏并清空容器
            if (this.container) {
                // 淡出动画
                this.container.style.opacity = '0';
                this.container.style.transition = 'opacity 0.3s ease';

                setTimeout(() => {
                    this.container.style.display = 'none';
                    this.container.style.opacity = '1';
                    this.container.innerHTML = '';

                    // 调用关闭回调
                    if (typeof this.options.onClose === 'function') {
                        this.options.onClose();
                    }

                    // 清理资源
                    this.editor = null;
                    this.isEditing = false;
                }, 300);
            }
        } catch (error) {
            // 强制关闭
            if (this.container) {
                this.container.style.display = 'none';
                this.container.innerHTML = '';
            }

            // 仍然调用关闭回调
            if (typeof this.options.onClose === 'function') {
                this.options.onClose();
            }
        }
    }

    /**
     * 检查是否有未保存的更改
     * @returns {Boolean} 是否有未保存的更改
     */
    hasUnsavedChanges() {
        try {
            if (!this.noteData || !this.editor) {
                return false;
            }

            const currentTitle = document.getElementById('noteTitle').value.trim();
            const currentContent = this.editor.value;

            return (
                currentTitle !== (this.noteData.title || '') ||
                currentContent !== (this.noteData.content || '')
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * 显示或隐藏加载状态
     * @param {Boolean} show - 是否显示
     */
    showLoading(show) {
        const loadingEl = document.querySelector('.editor-loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * 显示错误信息
     * @param {String} message - 错误消息
     */
    showErrorMessage(message) {
        const errorEl = document.getElementById('editorError');
        if (errorEl) {
            const messageEl = errorEl.querySelector('.error-message');
            if (messageEl) {
                messageEl.textContent = message;
            }

            errorEl.style.display = 'flex';
        }
    }

    /**
     * 隐藏错误信息
     */
    hideError() {
        const errorEl = document.getElementById('editorError');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    }

    /**
     * 显示成功消息
     * @param {String} message - 成功消息
     */
    showSuccessMessage(message) {
        // 创建浮动消息元素
        const toast = document.createElement('div');
        toast.className = 'editor-toast success';
        toast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        // 添加样式
        const toastStyle = document.createElement('style');
        toastStyle.textContent = `
            .editor-toast {
                position: absolute;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                background-color: rgba(52, 168, 83, 0.9);
                color: white;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                opacity: 0;
                transform: translateY(-10px);
                animation: toast-in 0.3s ease forwards;
            }

            @keyframes toast-in {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .editor-toast i {
                font-size: 18px;
            }
        `;

        document.head.appendChild(toastStyle);

        // 自动移除
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteEditorModal;
} else {
    window.NoteEditorModal = NoteEditorModal;
}