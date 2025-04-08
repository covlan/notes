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
            // 调用令牌刷新接口
            const refreshResult = await fetch(`${this.baseUrl}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
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
            
            // 如果刷新失败，但状态码不是401，抛出错误
            if (refreshResult.status !== 401) {
                const error = new Error('刷新令牌失败');
                this.processQueue(error);
                throw error;
            }
            
            // 如果是401错误，静默处理，不跳转登录页
            // 这里我们假设这是一个令牌过期的错误，但不需要立即强制用户重新登录
            return this.token;
        } catch (error) {
            console.error('刷新令牌出错:', error);
            this.processQueue(error);
            throw error;
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * 发送HTTP请求
     * @param {string} endpoint - API端点路径
     * @param {string} method - HTTP方法
     * @param {Object} data - 请求数据
     * @param {boolean} withAuth - 是否包含授权令牌
     * @returns {Promise} 响应数据的Promise
     */
    async request(endpoint, method = 'GET', data = null, withAuth = true) {
        // 如果需要认证，但不是登录或注册请求，尝试刷新令牌
        if (withAuth && this.token && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
            try {
                // 尝试刷新令牌，但不阻止原始请求继续
                this.refreshToken().catch(err => {
                    console.warn('令牌刷新失败，继续使用原有令牌:', err.message);
                });
            } catch (refreshError) {
                console.warn('令牌刷新过程出错，继续使用原有令牌:', refreshError);
            }
        }
        
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders(withAuth),
            credentials: 'include',
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        
        console.log(`发送${method}请求到:`, url);
        if (data) {
            console.log('请求数据:', data);
        }
        
        try {
            // 设置请求超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('请求超时，服务器无响应')), 10000);
            });
            
            // 执行请求
            const fetchPromise = fetch(url, options);
            
            // 使用Promise.race来处理超时
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            console.log('响应状态:', response.status);
            
            // 检查非成功状态码，提供更详细的错误信息
            if (!response.ok) {
                // 尝试解析错误响应
                let errorMsg = '请求失败';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || `HTTP错误: ${response.status}`;
                    
                    // 处理401未授权错误（令牌过期等）
                    if (response.status === 401) {
                        // 如果是登录或注册请求返回401，不做特殊处理
                        if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
                            throw new Error(errorMsg);
                        }
                        
                        // 如果不是登录相关的请求，尝试静默刷新令牌
                        try {
                            const newToken = await this.refreshToken();
                            if (newToken) {
                                // 使用新令牌重试原始请求
                                options.headers['Authorization'] = `Bearer ${newToken}`;
                                const retryResponse = await fetch(url, options);
                                
                                if (retryResponse.ok) {
                                    // 重试成功，返回结果
                                    return await retryResponse.json();
                                }
                                
                                // 如果重试仍然失败，但不是401错误，抛出常规错误
                                if (retryResponse.status !== 401) {
                                    const retryData = await retryResponse.json();
                                    throw new Error(retryData.message || `重试请求失败: ${retryResponse.status}`);
                                }
                            }
                        } catch (refreshError) {
                            console.error('刷新令牌后重试请求失败:', refreshError);
                        }
                        
                        // 如果刷新令牌和重试都失败，且已超过最大重试次数，则进行登出处理
                        // 设置会话过期标记，但只有在3次连续401错误之后才强制登出
                        const authErrors = parseInt(localStorage.getItem('auth_errors') || '0') + 1;
                        localStorage.setItem('auth_errors', authErrors.toString());
                        
                        if (authErrors >= 3) {
                            // 清除认证状态
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            localStorage.removeItem('auth_errors');
                            
                            // 如果不是登录页面，则重定向到登录页面
                            if (!window.location.pathname.includes('login.html') && 
                                !window.location.pathname.includes('register.html') &&
                                !window.location.pathname.includes('view-shared-note.html')) {
                                console.warn('连续多次认证失败，重定向到登录页面');
                                window.location.href = 'login.html?session=expired';
                                return null; // 防止继续执行
                            }
                        } else {
                            // 如果不是401错误，重置认证错误计数
                            localStorage.removeItem('auth_errors');
                        }
                    }
                } catch (parseError) {
                    errorMsg = `服务器错误 (${response.status})`;
                }
                
                // 构建详细的错误对象
                const error = new Error(errorMsg);
                error.status = response.status;
                error.endpoint = endpoint;
                error.method = method;
                throw error;
            }
            
            // 如果请求成功，重置认证错误计数
            localStorage.removeItem('auth_errors');
            
            // 解析响应数据
            let result;
            try {
                const text = await response.text();
                result = text ? JSON.parse(text) : {};
                console.log('响应数据:', result);
            } catch (jsonError) {
                console.error('解析JSON响应失败:', jsonError);
                throw new Error('服务器返回的数据格式不正确');
            }
            
            return result;
        } catch (error) {
            // 处理网络错误
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.error('网络连接错误:', error);
                throw new Error('无法连接到服务器，请检查您的网络连接');
            }
            
            // 处理CORS错误
            if (error.name === 'TypeError' && error.message.includes('CORS')) {
                console.error('CORS错误:', error);
                throw new Error('跨域请求被拒绝，请联系管理员');
            }
            
            // 处理超时
            if (error.message === '请求超时，服务器无响应') {
                console.error('请求超时:', url);
                throw error;
            }
            
            console.error('API请求错误:', error);
            throw error;
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
            console.log('尝试直接删除笔记:', noteId);
            try {
                return await this.request(`/api/notes/${noteId}`, 'DELETE');
            } catch (directDeleteError) {
                console.error('直接删除笔记失败:', directDeleteError);
                
                // 查询笔记状态，检查是否在回收站
                try {
                    const note = await this.getNote(noteId);
                    if (!note.inTrash) {
                        // 如果笔记不在回收站，先移至回收站
                        console.log('笔记不在回收站，先移至回收站再删除');
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
                    console.error('获取笔记信息失败:', getError);
                    
                    // 如果是404错误，则尝试从本地删除
                    if (directDeleteError.status === 404 || getError.status === 404) {
                        console.log('笔记在服务器上不存在，尝试从本地存储删除');
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
            console.error('所有删除尝试均失败:', error);
            
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
        console.log('从本地存储中删除笔记:', noteId);
        
        // 尝试从所有可能的存储位置删除笔记
        let success = false;
        
        // 从普通笔记存储中删除
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(note => note.id === noteId || note._id === noteId);
        if (noteIndex !== -1) {
            notes.splice(noteIndex, 1);
            localStorage.setItem('notes', JSON.stringify(notes));
            success = true;
            console.log('从notes存储中删除成功');
        }
        
        // 从缓存中删除
        const cachedNotes = JSON.parse(localStorage.getItem('notes_cache') || '[]');
        const cacheIndex = cachedNotes.findIndex(note => note.id === noteId || note._id === noteId);
        if (cacheIndex !== -1) {
            cachedNotes.splice(cacheIndex, 1);
            localStorage.setItem('notes_cache', JSON.stringify(cachedNotes));
            success = true;
            console.log('从notes_cache中删除成功');
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
            console.error('移动笔记到回收站失败:', error);
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
            console.error('从回收站恢复笔记失败:', error);
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
    async saveMarkdown(fileName, content) {
        console.log('保存Markdown文件:', {
            fileName,
            contentLength: content.length
        });
        
        // 准备请求数据
        const requestData = {
            fileName: fileName,
            content: content,
            inTrash: false // 明确指定不在回收站中
        };
        
        // 发送请求
        return await this.request('/api/notes/save-markdown', 'POST', requestData);
    }

    // 获取单个笔记
    async getNote(noteId) {
        console.log('获取笔记:', noteId);
        return await this.request(`/api/notes/${noteId}`);
    }

    // 获取回收站笔记
    async getTrashedNotes() {
        console.log('获取回收站笔记');
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
            console.error('分享笔记失败:', error);
            
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
            console.error('更新笔记分享状态失败:', error);
            // 不抛出错误，让主流程继续
        }
    }
    
    async getSharedNotes() {
        try {
            const result = await this.request('/api/shares');
            // 记录详细的API响应
            console.log('分享笔记API响应:', result);
            
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
                console.log('过滤后的分享列表:', result.shares);
            }
            
            return result;
        } catch (error) {
            console.error('获取分享笔记出错:', error);
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
            console.error('取消分享失败:', error);
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
            console.error('更新笔记取消状态失败:', error);
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
            console.error('文件上传错误:', error);
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
}

// 创建全局API实例
const api = new API(); 