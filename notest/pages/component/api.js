/**
 * 笔记应用API交互工具类
 * 管理与后端的所有API通信
 */

class API {
    constructor() {
        // API基础URL - 根据部署环境自动适配
        this.baseUrl = this.getBaseUrl();
        this.token = localStorage.getItem('token');
        this.tokenRefreshPromise = null;
        this.isRefreshing = false;

        // 添加没有token或token失效的处理队列
        this.failedQueue = [];
        this.tokenRefreshThreshold = 5 * 60 * 1000; // 5分钟，如果距离上次刷新token的时间小于这个值，则不刷新
        this.lastTokenRefresh = localStorage.getItem('lastTokenRefresh') ? parseInt(localStorage.getItem('lastTokenRefresh')) : 0;

        // 添加URL重写功能
        this.setupUrlRewriting();
    }

    /**
     * 设置URL重写功能
     * 确保所有内部链接使用无后缀URL
     */
    setupUrlRewriting() {
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

    // 处理令牌刷新队列
    processQueue(error, token = null) {
        this.failedQueue.forEach(prom => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });

        this.failedQueue = [];
    }

    /**
     * 处理会话过期或数据库重置
     * @param {Object} response - API响应对象
     * @param {string} errorCode - 错误代码
     * @param {string} errorMsg - 错误消息
     */
    handleSessionExpiration(response, errorCode, errorMsg) {
        // 备份用户数据，以便重新登录后恢复
        const userData = localStorage.getItem('user');
        const userNotes = localStorage.getItem('notes');
        const userCategories = localStorage.getItem('categories');
        const userTags = localStorage.getItem('tags');

        // 存储备份数据
        if (userData) {
            localStorage.setItem('user_backup', userData);
        }
        if (userNotes) {
            localStorage.setItem('notes_backup', userNotes);
        }
        if (userCategories) {
            localStorage.setItem('categories_backup', userCategories);
        }
        if (userTags) {
            localStorage.setItem('tags_backup', userTags);
        }

        // 只清除认证相关的状态，保留其他数据
        localStorage.removeItem('token');
        localStorage.removeItem('auth_errors');
        localStorage.removeItem('lastTokenRefresh'); // 清除令牌刷新时间
        this.token = null;
        this.lastTokenRefresh = 0;

        // 设置会话过期的原因，登录页面可以根据不同原因显示不同消息
        let expireReason;
        if (errorCode === 'DB_RESET') {
            expireReason = 'db_reset';
        } else if (errorCode === 'DB_INITIALIZED' || errorCode === 'DB_NEEDS_INIT') {
            expireReason = 'db_initialized';
        } else if (errorCode === 'USER_NOT_FOUND') {
            expireReason = 'user_deleted';
        } else if (errorCode === 'AUTH_EXPIRED' || errorCode === 'INVALID_TOKEN') {
            expireReason = 'auth_expired';
        } else {
            expireReason = 'session_expired';
        }

        // 存储会话过期原因，登录页面可以根据不同原因显示不同消息
        localStorage.setItem('session_expire_reason', expireReason);
        localStorage.setItem('session_expire_message', errorMsg || '会话已过期，请重新登录');
        localStorage.setItem('session_expire_time', Date.now().toString());

        // 添加跨设备登录标记，帮助识别跨设备登录问题
        if (errorCode === 'AUTH_EXPIRED' || errorCode === 'INVALID_TOKEN') {
            localStorage.setItem('cross_device_login', 'true');
        }

        // 如果不是登录页面，则重定向到登录页面
        if (!window.location.pathname.includes('/login') &&
            !window.location.pathname.includes('/register') &&
            !window.location.pathname.includes('/view-shared-note')) {
            // 使用可被登录页面检测的特定查询参数
            window.location.href = '/login?session=' + expireReason;
            return true; // 表示已处理
        }

        return false; // 表示未重定向
    }

    /**
     * 获取API基础URL
     * 根据当前环境自动选择API基础URL
     * @returns {string} 基础URL
     */
    getBaseUrl() {
        // 从当前页面URL获取主机和端口
        const { protocol, hostname, port } = window.location;
        // 在本地开发环境可能使用的是特定端口，如5000
        // 但在Docker部署后，前端和API使用相同的服务，无需特殊端口
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }

    /**
     * 获取用于请求的头部信息
     * @param {boolean} withAuth - 是否包含授权令牌
     * @returns {Object} 请求头部信息
     */
    getHeaders(withAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (withAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    /**
     * 获取当前的访问令牌
     * @returns {string|null} 访问令牌，如果未登录则为null
     */
    getToken() {
        // 优先返回实例存储的token
        if (this.token) {
            return this.token;
        }

        // 如果实例中没有token，尝试从localStorage获取
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            // 更新实例存储的token
            this.token = storedToken;
            return storedToken;
        }

        return null;
    }

    /**
     * 刷新当前的访问令牌
     * @returns {Promise<string>} 新的访问令牌
     */
    async refreshToken() {
        // 防止多次同时刷新token
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject });
            });
        }

        const now = Date.now();
        // 如果距离上次刷新token的时间小于阈值，直接返回当前token
        if (now - this.lastTokenRefresh < this.tokenRefreshThreshold) {
            return this.token;
        }

        this.isRefreshing = true;

        try {
            // 在刷新令牌前先检查当前令牌是否存在
            if (!this.token) {
                // 如果实例中没有令牌，尝试从localStorage获取
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    this.token = storedToken;
                } else {
                    // 如果没有令牌，返回空值
                    this.processQueue(new Error('没有可用的令牌进行刷新'));
                    return null;
                }
            }

            // 调用令牌刷新接口
            const refreshResult = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                credentials: 'include' // 确保包含cookie
            });

            // 如果刷新成功，更新token
            if (refreshResult.ok) {
                const data = await refreshResult.json();
                if (data.token) {
                    this.token = data.token;
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('lastTokenRefresh', Date.now().toString());
                    this.lastTokenRefresh = Date.now();

                    // 处理队列中的请求
                    this.processQueue(null, data.token);
                    return data.token;
                }
            }

            // 如果刷新失败，检查是否是认证问题
            if (refreshResult.status === 401 || refreshResult.status === 403) {
                // 认证失败，清除本地令牌
                this.token = null;
                localStorage.removeItem('token');

                // 处理队列中的请求
                this.processQueue(new Error('令牌刷新失败，认证已过期'));

                // 返回空值表示刷新失败
                return null;
            }

            // 其他错误情况
            const error = new Error('刷新令牌失败');
            this.processQueue(error);

            // 尝试返回原有令牌，可能还能继续使用
            return this.token;
        } catch (error) {
            console.error('刷新令牌时出错:', error);
            this.processQueue(error);
            return this.token; // 尝试返回原有令牌
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * 发送API请求
     * @param {String} url - 请求地址
     * @param {String} method - 请求方法
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据对象
     */
    async request(url, method = 'GET', data = null) {
        try {
            // 检查URL格式
            if (!url.startsWith('http') && !url.startsWith('/')) {
                url = `/${url}`;
            }

            // 构建完整URL
            const baseUrl = this.baseUrl || '';
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            // 设置请求选项
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            };

            // 添加认证头
            let token;
            try {
                // 使用getToken方法获取令牌，确保令牌的一致性
                token = this.getToken();

                // 如果没有令牌，尝试从localStorage直接获取
                if (!token) {
                    token = localStorage.getItem('token');
                    // 如果从localStorage获取到了令牌，更新实例变量
                    if (token) {
                        this.token = token;
                    }
                }
            } catch (tokenError) {
                console.error('获取令牌时出错:', tokenError);
                token = null;
            }

            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            // 添加请求体
            if (data) {
                options.body = JSON.stringify(data);
            }

            // 发送请求
            const response = await fetch(fullUrl, options);

            // 检查重定向
            if (response.redirected) {
                // 如果是重定向到登录页，可能是token过期
                if (response.url.includes('login') || response.url.includes('auth')) {
                    return this.handleSessionExpiration();
                }
            }

            // 检查响应状态
            if (!response.ok) {
                // 对于401错误，尝试刷新token
                if (response.status === 401) {
                    // 尝试解析错误响应
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { code: 'UNKNOWN_ERROR' };
                    }

                    // 如果是数据库重置或用户不存在等特定错误，直接处理会话过期
                    if (errorData.code === 'DB_RESET' ||
                        errorData.code === 'DB_INITIALIZED' ||
                        errorData.code === 'USER_NOT_FOUND') {
                        return this.handleSessionExpiration(response, errorData.code, errorData.message);
                    }

                    // 尝试刷新令牌
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // 重新尝试请求
                        return this.request(url, method, data);
                    } else {
                        // 刷新失败，处理会话过期
                        return this.handleSessionExpiration(response, 'AUTH_EXPIRED', '认证已过期，请重新登录');
                    }
                }

                // 其他错误状态
                const errorText = await response.text();
                let errorMessage;

                try {
                    // 尝试解析错误响应为JSON
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || errorText;
                } catch (e) {
                    // 如果不是JSON，直接使用文本
                    errorMessage = errorText || `请求失败，状态码: ${response.status}`;

                    // 检查是否是HTML响应(通常是服务器错误页面)
                    if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
                        errorMessage = `服务器返回了HTML而不是API数据，状态码: ${response.status}`;
                    }
                }

                throw new Error(errorMessage);
            }

            // 检查响应内容类型
            const contentType = response.headers.get('content-type');

            // 如果是HTML，可能是服务器错误页面
            if (contentType && contentType.includes('text/html')) {
                // 读取响应文本
                const htmlText = await response.text();
                throw new Error('服务器返回了HTML页面而不是API数据');
            }

            // 处理空响应
            if (response.status === 204) {
                return { success: true };
            }

            // 解析JSON响应
            let responseData;
            try {
                const text = await response.text();
                if (!text) {
                    return { success: true };
                }
                responseData = JSON.parse(text);
            } catch (error) {
                throw new Error('服务器返回的数据格式不正确');
            }

            // 标准化响应格式
            if (typeof responseData === 'object' && responseData !== null) {
                if (responseData.success === undefined) {
                    responseData.success = true;
                }
            }

            return responseData;
        } catch (error) {
            // 构造统一的错误响应对象
            return {
                success: false,
                error: true,
                message: error.message || '请求失败',
                originalError: error
            };
        }
    }

    // 用户相关API
    async login(username, password, remember = false) {
        return this.request('/api/auth/login', 'POST', { username, password, remember }, false);
    }

    async register(userData) {
        return this.request('/api/auth/register', 'POST', userData, false);
    }

    async getCurrentUser() {
        return this.request('/api/auth/me');
    }

    async logout() {
        return this.request('/api/auth/logout', 'POST');
    }

    async updateProfile(userData) {
        return this.request('/api/users/profile', 'PUT', userData);
    }

    async changePassword(passwordData) {
        return this.request('/api/users/change-password', 'POST', passwordData);
    }

    // 笔记相关API
    async getNotes(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const result = await this.request(`/api/notes?${queryString}`);

        // 标准化数据，确保API返回的数据和localStorage中的数据格式一致
        if (result.notes && Array.isArray(result.notes)) {
            // 如果请求的是回收站笔记，确保只返回真正在回收站中的笔记
            if (params.inTrash === true || params.inTrash === 'true') {
                result.notes = result.notes.filter(note => note.inTrash === true);
            }

            // 复制到result.data以保持兼容性
            result.data = result.notes.map(note => {
                // 确保同时有id和_id字段
                if (note._id && !note.id) {
                    note.id = note._id;
                } else if (note.id && !note._id) {
                    note._id = note.id;
                }

                // 确保有fileName字段
                if (!note.fileName) {
                    note.fileName = `${note._id || note.id}_${Date.now()}`;
                }

                return note;
            });
        } else if (result.data && Array.isArray(result.data)) {
            // 如果请求的是回收站笔记，确保只返回真正在回收站中的笔记
            if (params.inTrash === true || params.inTrash === 'true') {
                result.data = result.data.filter(note => note.inTrash === true);
            }

            // 标准化data数组中的笔记数据
            result.data = result.data.map(note => {
                // 确保同时有id和_id字段
                if (note._id && !note.id) {
                    note.id = note._id;
                } else if (note.id && !note._id) {
                    note._id = note.id;
                }

                // 确保有fileName字段
                if (!note.fileName) {
                    note.fileName = `${note._id || note.id}_${Date.now()}`;
                }

                return note;
            });

            // 复制到result.notes以保持兼容性
            result.notes = [...result.data];
        }

        return result;
    }

    async getNoteById(noteId) {
        return this.request(`/api/notes/${noteId}`);
    }

    async createNote(noteData) {
        return this.request('/api/notes', 'POST', noteData);
    }

    async updateNote(noteId, noteData) {
        return this.request(`/api/notes/${noteId}`, 'PUT', noteData);
    }

    async deleteNote(noteId) {
        try {
            // 直接尝试删除笔记
            try {
                return await this.request(`/api/notes/${noteId}`, 'DELETE');
            } catch (directDeleteError) {

                // 查询笔记状态，检查是否在回收站
                try {
                    const note = await this.getNote(noteId);
                    if (!note.inTrash) {
                        // 如果笔记不在回收站，先移至回收站
                        await this.request(`/api/notes/${noteId}/trash`, 'PUT');

                        // 等待短暂延迟，确保回收站操作完成
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // 再次尝试删除
                        return await this.request(`/api/notes/${noteId}`, 'DELETE');
                    } else {
                        // 笔记已在回收站，但删除失败，可能是其他原因
                        throw directDeleteError;
                    }
                } catch (getError) {
                    // 获取笔记信息失败，可能是笔记不存在

                    // 如果是404错误，则尝试从本地删除
                    if (directDeleteError.status === 404 || getError.status === 404) {
                        const notesResult = this.removeNoteFromLocalStorage(noteId);
                        if (notesResult) {
                            return { success: true, message: '笔记已从本地存储中删除' };
                        }
                    }

                    // 其他错误，继续向上抛出
                    throw directDeleteError;
                }
            }
        } catch (error) {


            // 尝试从本地存储删除作为最后手段
            const notesResult = this.removeNoteFromLocalStorage(noteId);
            if (notesResult) {
                return { success: true, message: '笔记已从本地存储中删除' };
            }

            // 如果所有尝试都失败，抛出更友好的错误信息
            if (error.status === 404) {
                throw new Error('笔记不存在或已被删除');
            } else {
                throw new Error(`删除失败: ${error.message || '未知错误'}`);
            }
        }
    }

    // 添加deleteNotePermanently方法作为deleteNote的别名，保持兼容性
    async deleteNotePermanently(noteId) {
        return this.deleteNote(noteId);
    }

    // 从本地存储中删除笔记的辅助方法
    removeNoteFromLocalStorage(noteId) {
        // 尝试从所有可能的存储位置删除笔记
        let success = false;

        // 从普通笔记存储中删除
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(note => note.id === noteId || note._id === noteId);
        if (noteIndex !== -1) {
            notes.splice(noteIndex, 1);
            localStorage.setItem('notes', JSON.stringify(notes));
            success = true;
        }

        // 从缓存中删除
        const cachedNotes = JSON.parse(localStorage.getItem('notes_cache') || '[]');
        const cacheIndex = cachedNotes.findIndex(note => note.id === noteId || note._id === noteId);
        if (cacheIndex !== -1) {
            cachedNotes.splice(cacheIndex, 1);
            localStorage.setItem('notes_cache', JSON.stringify(cachedNotes));
            success = true;
        }

        return success;
    }

    async trashNote(noteId) {
        try {
            const result = await this.request(`/api/notes/${noteId}/trash`, 'PUT');

            if (result.success) {
                // 更新本地存储中的笔记状态
                this.updateLocalTrashStatus(noteId, true);

                // 清除笔记缓存，确保下次加载时获取最新数据
                localStorage.removeItem('notes_cache');
                localStorage.removeItem('notes_cache_timestamp');

                // 触发存储事件，通知其他页面刷新
                localStorage.setItem('notes_updated', Date.now().toString());
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    // 添加moveNoteToTrash方法，作为trashNote的别名，保持兼容性
    async moveNoteToTrash(noteId) {
        return this.trashNote(noteId);
    }

    // 更新本地存储中笔记的回收站状态
    updateLocalTrashStatus(noteId, inTrash = true) {
        // 更新主存储
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(note => note.id === noteId || note._id === noteId);

        if (noteIndex !== -1) {
            // 保存当前笔记的starred状态，防止丢失
            const isStarred = notes[noteIndex].isStarred || notes[noteIndex].starred;

            // 更新回收站状态
            notes[noteIndex].inTrash = inTrash;

            // 如果放入回收站，添加删除时间，同时保留starred状态
            if (inTrash) {
                notes[noteIndex].deletedAt = new Date().toISOString();
                // 确保保留星标状态
                if (isStarred) {
                    notes[noteIndex].starred = true;
                    notes[noteIndex].isStarred = true; // 兼容两种可能的字段名
                }
            } else {
                // 如果恢复，移除删除时间
                delete notes[noteIndex].deletedAt;
                // 恢复时也要确保星标状态保持一致
                if (isStarred) {
                    notes[noteIndex].starred = true;
                    notes[noteIndex].isStarred = true;
                }
            }

            localStorage.setItem('notes', JSON.stringify(notes));

            // 清理相关的缓存，确保下次加载获取最新数据
            if (inTrash) {
                localStorage.removeItem('starred_notes_cache');
                localStorage.removeItem('starred_notes_timestamp');
            } else {
                localStorage.removeItem('trash_notes_cache');
                localStorage.removeItem('trash_notes_timestamp');
            }

            return true;
        }

        return false;
    }

    async restoreNote(noteId) {
        try {
            const result = await this.request(`/api/notes/${noteId}/restore`, 'POST');

            if (result.success) {
                // 更新本地存储中的笔记状态
                this.updateLocalTrashStatus(noteId, false);

                // 清除笔记缓存
                localStorage.removeItem('notes_cache');
                localStorage.removeItem('notes_cache_timestamp');
                localStorage.removeItem('trash_notes_cache');
                localStorage.removeItem('trash_notes_timestamp');

                // 触发存储事件，通知其他页面刷新
                localStorage.setItem('notes_updated', Date.now().toString());
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    // 添加restoreNoteFromTrash方法作为restoreNote的别名，保持兼容性
    async restoreNoteFromTrash(noteId) {
        return this.restoreNote(noteId);
    }

    async starNote(noteId) {
        return this.request(`/api/notes/${noteId}/star`, 'PUT');
    }

    async unstarNote(noteId) {
        // 调用相同的端点，后端会自动切换星标状态
        return this.request(`/api/notes/${noteId}/star`, 'PUT');
    }

    // 保存Markdown文件
    async saveMarkdown(fileName, content, title) {


        // 准备请求数据
        const requestData = {
            fileName: fileName,
            content: content,
            title: title, // 添加标题参数
            inTrash: false // 明确指定不在回收站中
        };

        // 发送请求
        return await this.request('/api/notes/save-markdown', 'POST', requestData);
    }

    // 获取单个笔记
    async getNote(noteId) {
        return await this.request(`/api/notes/${noteId}`);
    }

    // 获取回收站笔记
    async getTrashedNotes() {
        return await this.request('/api/notes/trash');
    }

    // 分类相关API
    async getCategories() {
        return this.request('/api/categories');
    }

    async createCategory(categoryData) {
        return this.request('/api/categories', 'POST', categoryData);
    }

    async updateCategory(categoryId, categoryData) {
        return this.request(`/api/categories/${categoryId}`, 'PUT', categoryData);
    }

    async deleteCategory(categoryId) {
        return this.request(`/api/categories/${categoryId}`, 'DELETE');
    }

    // 更新笔记分类
    async updateNoteCategory(noteId, categoryId) {
        return this.request(`/api/notes/${noteId}`, 'PUT', { categoryId });
    }

    // 标签相关API
    async getTags() {
        return this.request('/api/tags');
    }

    // 根据标签获取笔记
    async getNotesByTag(tagId) {
        try {
            // 尝试从标签专用接口获取笔记
            const response = await this.request(`/api/tags/${tagId}/notes`);

            // 确保响应是正确格式
            if (response && response.success && Array.isArray(response.notes)) {
                return response;
            } else if (response && !response.notes && response.data) {
                // 规范化响应格式
                return {
                    success: true,
                    notes: response.data
                };
            } else if (response && response.success && !Array.isArray(response.notes)) {
                throw error;
            }

            return response;
        } catch (error) {

            // 详细记录错误以便于调试
            if (error.message) {
                // 如果服务器返回HTML而非JSON，很可能是需要登录
                if (error.message.includes('格式不正确') ||
                    error.message.includes('HTML') ||
                    error.message.includes('服务器返回了HTML页面')) {

                    // 检查用户是否已登录，如果存在token但请求返回HTML，说明会话已过期
                    if (this.token) {
                        // 清除token并通知可能的监听者
                        localStorage.removeItem('token');
                        this.token = null;

                        // 设置会话过期标记，便于UI层处理
                        localStorage.setItem('session_expire_reason', 'session_expired');
                        localStorage.setItem('session_expire_message', '会话已过期，请重新登录');
                        localStorage.setItem('session_expire_time', Date.now().toString());

                        // 如果不是在共享笔记页面，准备重定向信息
                        if (!window.location.pathname.includes('/view-shared-note')) {
                            // 返回特定错误，让调用者知道是会话过期
                            return {
                                success: false,
                                error: true,
                                session_expired: true,
                                message: '会话已过期，请重新登录'
                            };
                        }
                    }
                }
            }

            // 回退方案：优先从本地存储查找相关笔记
            try {
                // 从本地存储获取笔记
                const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                const tagNotes = localNotes.filter(note => {
                    // 过滤掉已删除或在回收站的笔记
                    if (note.inTrash || note.deleted) return false;

                    // 检查笔记是否包含指定的标签ID
                    return note.tags && (
                        Array.isArray(note.tags) ?
                        note.tags.includes(tagId) :
                        note.tags === tagId || note.tagId === tagId
                    );
                });

                // 如果本地有数据就返回
                if (tagNotes.length > 0) {
                    return {
                        success: true,
                        notes: tagNotes
                    };
                }

                // 如果本地没有数据，再尝试获取所有笔记
                // 使用tag参数获取笔记，确保只返回当前标签的笔记
                const allNotes = await this.getNotes({ tag: tagId });

                // 确保返回数据格式一致
                const result = {
                    success: true,
                    notes: []
                };

                // 从所有笔记中筛选出具有指定标签的笔记
                if (allNotes && (allNotes.notes || allNotes.data)) {
                    const notes = allNotes.notes || allNotes.data || [];
                    result.notes = notes.filter(note => {
                        // 检查笔记是否包含指定的标签ID
                        return note.tags && (
                            Array.isArray(note.tags) ?
                            note.tags.includes(tagId) :
                            note.tags === tagId || note.tagId === tagId
                        );
                    });
                }

                return result;
            } catch (backupError) {
                throw error; // 如果备用方案也失败，返回原始错误
            }
        }
    }

    async createTag(tagData) {
        return this.request('/api/tags', 'POST', tagData);
    }

    async updateTag(tagId, tagData) {
        return this.request(`/api/tags/${tagId}`, 'PUT', tagData);
    }

    async deleteTag(tagId) {
        return this.request(`/api/tags/${tagId}`, 'DELETE');
    }

    // 笔记标签关联API
    async updateNoteTags(noteId, tagIds) {
        return this.request(`/api/notes/${noteId}/tags`, 'PUT', { tagIds });
    }

    // 分享相关API
    async shareNote(noteId, shareType, password, expiry) {
        const shareData = {
            noteId,
            shareType,
            expiry: expiry || '0'
        };

        if (shareType === 'private' && password) {
            shareData.password = password;
        }

        try {
            // 首先检查笔记是否存在
            const note = await this.getNote(noteId);
            if (!note || !note.success) {
                throw new Error('找不到指定的笔记');
            }

            // 发送分享请求
            const result = await this.request('/api/shares', 'POST', shareData);

            // 如果API调用成功但未返回share对象(可能发生在测试环境)
            if (result && result.success && !result.share) {
                // 创建一个模拟的分享对象
                const mockShareId = `share_${Date.now()}`;
                const baseUrl = window.location.origin;

                // 更新本地存储中的笔记
                await this._updateNoteSharedStatus(noteId, true, shareType);

                return {
                    success: true,
                    message: '笔记分享成功(本地模式)',
                    share: {
                        id: mockShareId,
                        noteId: noteId,
                        shareType: shareType,
                        createdAt: new Date().toISOString()
                    },
                    link: `${baseUrl}/view-shared-note.html?id=${mockShareId}`
                };
            }

            // 正常API返回处理
            if (result && result.success && result.share) {
                // 构建完整的分享链接
                const baseUrl = window.location.origin;
                const shareId = result.share._id || result.share.id;

                // 更新本地存储中的笔记
                await this._updateNoteSharedStatus(noteId, true, shareType);

                return {
                    ...result,
                    link: `${baseUrl}/view-shared-note.html?id=${shareId}`
                };
            }

            return result;
        } catch (error) {
            throw error;

            // 检查是否是"已分享"错误，尝试获取分享状态
            if (error.message && error.message.includes('已被分享')) {
                try {
                    // 获取笔记当前的分享状态
                    const shares = await this.getSharedNotes();

                    // 找到该笔记的分享记录
                    const existingShare = shares.shares?.find(share =>
                        share.noteId === noteId ||
                        (share.noteTitle && note.success && note.note && share.noteTitle === note.note.title)
                    );

                    // 如果没有找到分享，可能是已取消但后端未更新
                    if (!existingShare) {
                        // 从本地存储获取笔记
                        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
                        const noteObj = notes.find(n => n.id === noteId || n._id === noteId);

                        // 如果本地笔记显示已被取消分享，建议用户刷新后再试
                        if (noteObj && noteObj.isCanceled) {
                            throw new Error('此笔记分享状态有冲突，请刷新页面后重试');
                        }
                    }

                    // 原始错误，笔记确实已分享
                    throw error;
                } catch (checkError) {
                    // 如果检查过程出错，返回更明确的错误
                    if (checkError !== error) {
                        throw checkError;
                    } else {
                        throw error;
                    }
                }
            }

            throw error;
        }
    }

    // 辅助方法：更新笔记的分享状态
    async _updateNoteSharedStatus(noteId, shared, shareType) {
        try {
            // 从本地存储获取笔记
            const notesStr = localStorage.getItem('notes');
            if (!notesStr) return;

            const notes = JSON.parse(notesStr);
            const index = notes.findIndex(n => n.id === noteId || n._id === noteId);

            if (index !== -1) {
                // 更新笔记分享状态
                notes[index] = {
                    ...notes[index],
                    shared: shared,
                    shareType: shared ? shareType : null,
                    sharedAt: shared ? new Date().toISOString() : null
                };

                // 保存回本地存储
                localStorage.setItem('notes', JSON.stringify(notes));
                localStorage.setItem('shares_updated', Date.now().toString());
            }
        } catch (error) {
            throw error;
            // 不抛出错误，让主流程继续
        }
    }

    async getSharedNotes() {
        try {
            const result = await this.request('/api/shares');
            // 记录详细的API响应

            if (!result) {
                throw new Error('获取分享笔记失败：无响应');
            }

            // 确保响应结构符合预期
            if (!result.success && !result.shares) {
                throw new Error(result.message || '获取分享笔记失败：响应格式错误');
            }

            // 如果没有分享笔记数据，提供一个空数组
            if (!result.shares) {
                result.shares = [];
            } else {
                // 过滤掉已取消的分享
                result.shares = result.shares.filter(share => !share.isCanceled);
            }

            return result;
        } catch (error) {
            // 返回一个统一格式的错误对象
            return {
                success: false,
                message: error.message || '获取分享笔记时发生错误',
                shares: []
            };
        }
    }

    // 获取收藏笔记
    async getStarredNotes() {
        return this.request('/api/notes/starred');
    }

    async updateShareSettings(shareId, shareData) {
        return this.request(`/api/shares/${shareId}`, 'PUT', shareData);
    }

    async removeShare(shareId) {
        try {
            // 先获取分享详情，确保我们有笔记ID用于本地更新
            const shares = await this.getSharedNotes();
            const share = shares.shares?.find(s => s._id === shareId || s.id === shareId);

            // 发送取消分享请求
            const result = await this.request(`/api/shares/${shareId}`, 'DELETE');

            // 如果请求成功，更新本地存储状态
            if (result && result.success) {
                // 如果有笔记ID，更新本地笔记状态
                if (share && share.noteId) {
                    await this._updateNoteCancelStatus(share.noteId, true);
                } else {
                    // 尝试从本地存储中找到对应的笔记
                    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
                    const noteWithShare = notes.find(n => n.shareId === shareId);
                    if (noteWithShare) {
                        await this._updateNoteCancelStatus(noteWithShare.id || noteWithShare._id, true);
                    }
                }
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    // 辅助方法：更新笔记的取消分享状态
    async _updateNoteCancelStatus(noteId, isCanceled) {
        try {
            // 从本地存储获取笔记
            const notesStr = localStorage.getItem('notes');
            if (!notesStr) return;

            const notes = JSON.parse(notesStr);
            const index = notes.findIndex(n => n.id === noteId || n._id === noteId);

            if (index !== -1) {
                // 更新笔记分享状态
                notes[index] = {
                    ...notes[index],
                    isCanceled: isCanceled,
                    shared: isCanceled ? false : notes[index].shared
                };

                // 保存回本地存储
                localStorage.setItem('notes', JSON.stringify(notes));
                localStorage.setItem('shares_updated', Date.now().toString());
            }
        } catch (error) {
            // 不抛出错误，让主流程继续
        }
    }

    // 文件上传相关API
    async uploadFile(formData) {
        const url = `${this.baseUrl}/api/files/upload`;
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData // 文件上传使用FormData，不需要JSON.stringify
        };

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '文件上传失败');
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    async deleteFile(fileId) {
        return this.request(`/api/files/${fileId}`, 'DELETE');
    }

    // 设置相关API
    async getUserSettings() {
        return this.request('/api/settings');
    }

    async updateUserSettings(settingsData) {
        return this.request('/api/settings', 'PUT', settingsData);
    }

    // 站点设置相关API
    async getSiteSettings() {
        return this.request('/api/settings/site');
    }

    async updateSiteSettings(siteSettingsData) {
        return this.request('/api/settings/site', 'PUT', siteSettingsData);
    }

    // 安全设置相关API
    async getSecuritySettings() {
        return this.request('/api/settings/security');
    }

    async updateSecuritySettings(securitySettingsData) {
        return this.request('/api/settings/security', 'PUT', securitySettingsData);
    }

    // 备份设置相关API
    async getBackupSettings() {
        return this.request('/api/backup/settings');
    }

    async updateBackupSettings(backupSettingsData) {
        return this.request('/api/backup/settings', 'PUT', backupSettingsData);
    }

    async createBackup() {
        return this.request('/api/backup/create', 'POST');
    }

    async restoreBackup(formData) {
        const url = `${this.baseUrl}/api/backup/restore`;
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData // 文件上传使用FormData，不需要JSON.stringify
        };

        try {
            const response = await fetch(url, options);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '恢复备份失败');
            }

            return result;
        } catch (error) {
            throw error;
        }
    }

    // 高级设置相关API
    async getAdvancedSettings() {
        return this.request('/api/admin/settings');
    }

    async updateAdvancedSettings(advancedSettingsData) {
        return this.request('/api/admin/settings', 'PUT', advancedSettingsData);
    }
}

// 创建全局API实例
const api = new API();