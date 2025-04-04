/**
 * 笔记应用API交互工具类
 * 管理与后端的所有API通信
 */

class API {
    constructor() {
        // API基础URL - 根据部署环境自动适配
        this.baseUrl = this.getBaseUrl();
        this.token = localStorage.getItem('token');
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
     * 发送HTTP请求
     * @param {string} endpoint - API端点路径
     * @param {string} method - HTTP方法
     * @param {Object} data - 请求数据
     * @param {boolean} withAuth - 是否包含授权令牌
     * @returns {Promise} 响应数据的Promise
     */
    async request(endpoint, method = 'GET', data = null, withAuth = true) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders(withAuth)
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
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        // 如果不是登录页面，则重定向到登录页面
                        if (!window.location.pathname.includes('index.html') && 
                            !window.location.pathname.includes('register.html')) {
                            window.location.href = 'index.html?session=expired';
                            return null; // 防止继续执行
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
        console.log('请求笔记API:', `/api/notes?${queryString}`);
        const result = await this.request(`/api/notes?${queryString}`);
        console.log('API返回原始数据:', result);
        
        // 标准化数据，确保API返回的数据和localStorage中的数据格式一致
        if (result.notes && Array.isArray(result.notes)) {
            // 如果请求的是回收站笔记，确保只返回真正在回收站中的笔记
            if (params.inTrash === true) {
                console.log('处理回收站笔记请求，筛选inTrash=true的笔记');
                result.notes = result.notes.filter(note => note.inTrash === true);
                console.log(`筛选后的回收站笔记数量: ${result.notes.length}`);
            }
            
            result.data = result.notes.map(note => {
                // 确保同时有id和_id字段
                if (note._id && !note.id) {
                    note.id = note._id;
                } else if (note.id && !note._id) {
                    note._id = note.id;
                }
                
                // 确保有fileName字段
                if (!note.fileName) {
                    console.log('笔记缺少fileName字段:', note._id || note.id);
                    note.fileName = `${note._id || note.id}_${Date.now()}`;
                }
                
                return note;
            });
        } else if (result.data && Array.isArray(result.data)) {
            // 如果请求的是回收站笔记，确保只返回真正在回收站中的笔记
            if (params.inTrash === true) {
                console.log('处理回收站笔记请求，筛选inTrash=true的笔记');
                result.data = result.data.filter(note => note.inTrash === true);
                console.log(`筛选后的回收站笔记数量: ${result.data.length}`);
            }
            
            result.data = result.data.map(note => {
                // 确保同时有id和_id字段
                if (note._id && !note.id) {
                    note.id = note._id;
                } else if (note.id && !note._id) {
                    note._id = note.id;
                }
                
                // 确保有fileName字段
                if (!note.fileName) {
                    console.log('笔记缺少fileName字段:', note._id || note.id);
                    note.fileName = `${note._id || note.id}_${Date.now()}`;
                }
                
                return note;
            });
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

    // 更新本地存储中笔记的回收站状态
    updateLocalTrashStatus(noteId, inTrash = true) {
        console.log(`更新本地笔记回收站状态: ${noteId}, inTrash: ${inTrash}`);
        
        // 更新主存储
        const notes = JSON.parse(localStorage.getItem('notes') || '[]');
        const noteIndex = notes.findIndex(note => note.id === noteId || note._id === noteId);
        
        if (noteIndex !== -1) {
            console.log(`找到本地笔记: ${notes[noteIndex].title}, 更新inTrash=${inTrash}`);
            notes[noteIndex].inTrash = inTrash;
            
            // 如果放入回收站，添加删除时间
            if (inTrash) {
                notes[noteIndex].deletedAt = new Date().toISOString();
            } else {
                // 如果恢复，移除删除时间
                delete notes[noteIndex].deletedAt;
            }
            
            localStorage.setItem('notes', JSON.stringify(notes));
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

    // 分享相关API
    async shareNote(noteId, shareType, password, expiry) {
        const shareData = {
            noteId,
            shareType,
            expiry
        };
        
        if (shareType === 'private' && password) {
            shareData.password = password;
        }
        
        try {
            const result = await this.request('/api/shares', 'POST', shareData);
            if (result && result.success && result.share) {
                // 构建完整的分享链接
                const baseUrl = window.location.origin;
                const shareId = result.share._id || result.share.id;
                return {
                    ...result,
                    link: `${baseUrl}/view-shared-note.html?id=${shareId}`
                };
            }
            return result;
        } catch (error) {
            console.error('分享笔记失败:', error);
            throw error;
        }
    }
    
    async getSharedNotes() {
        return this.request('/api/shares');
    }
    
    async updateShareSettings(shareId, shareData) {
        return this.request(`/api/shares/${shareId}`, 'PUT', shareData);
    }
    
    async removeShare(shareId) {
        return this.request(`/api/shares/${shareId}`, 'DELETE');
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