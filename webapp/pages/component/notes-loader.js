/**
 * 通用笔记加载组件
 * 支持根据不同参数筛选加载笔记
 */

class NotesLoader {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {Function} options.apiClient - API接口函数集合
   * @param {String} options.containerSelector - 笔记容器选择器
   * @param {Function} options.renderFunction - 渲染笔记的函数
   * @param {Function} options.onLoadSuccess - 加载成功回调
   * @param {Function} options.onLoadError - 加载失败回调
   * @param {Number} options.cacheExpiry - 缓存过期时间(毫秒)，默认5分钟
   * @param {Function} options.renderPageSpecificButtons - 渲染页面特定按钮的函数
   * @param {Object} options.actionsConfig - 笔记操作按钮配置
   */
  constructor(options) {
    this.options = Object.assign({
      apiClient: window.api,
      containerSelector: '.notes-grid',
      renderFunction: null,
      onLoadSuccess: null,
      onLoadError: null,
      cacheExpiry: 5 * 60 * 1000, // 5分钟缓存过期
      renderPageSpecificButtons: null, // 页面特定按钮渲染函数
      actionsConfig: {  // 默认操作配置
        showMoreButton: true,     // 是否显示"更多"按钮
        clickable: true,          // 是否可点击打开笔记
        additionalButtons: []     // 附加按钮配置，例如回收站的"恢复"和"永久删除"按钮
      }
    }, options);

    this.defaultRenderFunction = this.createDefaultRenderFunction();
    this.lastQuery = null; // 上次查询参数缓存
  }

  /**
   * 创建默认渲染函数
   * @returns {Function} 默认渲染函数
   */
  createDefaultRenderFunction() {
    return (notes, container, viewMode = 'grid') => {
      // 清空容器但保留可能存在的加载状态指示器
      const loadingIndicator = container.querySelector('#notesLoadingIndicator');
      container.innerHTML = '';
      
      if (!notes || notes.length === 0) {
        const emptyNotes = document.createElement('div');
        
        // 根据当前查询参数确定正确的空状态类名和图标
        let emptyClassName = 'empty-notes';
        let iconClassName = 'fas fa-sticky-note';
        let emptyMessage = '没有找到笔记';
        
        // 根据lastQuery判断当前页面类型
        if (this.lastQuery) {
          if (this.lastQuery.isStarred) {
            emptyClassName = 'empty-starred';
            iconClassName = 'fas fa-star';
            emptyMessage = '没有收藏的笔记';
          } else if (this.lastQuery.inTrash) {
            emptyClassName = 'empty-trash';
            iconClassName = 'fas fa-trash';
            emptyMessage = '回收站是空的';
          } else if (this.lastQuery.isShared) {
            emptyClassName = 'empty-shared';
            iconClassName = 'fas fa-share-alt';
            emptyMessage = '没有分享的笔记';
          } else if (this.lastQuery.categoryId) {
            emptyClassName = 'empty-category';
            iconClassName = 'fas fa-folder';
            emptyMessage = '此分类中没有笔记';
          } else if (this.lastQuery.tagId) {
            emptyClassName = 'empty-tag';
            iconClassName = 'fas fa-tag';
            emptyMessage = '此标签中没有笔记';
          }
        }
        
        emptyNotes.className = emptyClassName;
        
        const icon = document.createElement('i');
        icon.className = iconClassName;
        emptyNotes.appendChild(icon);
        
        const message = document.createElement('p');
        message.textContent = emptyMessage;
        emptyNotes.appendChild(message);
        
        container.appendChild(emptyNotes);
        return;
      }
      
      notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.dataset.id = note.id || note._id;
        
        // 标题
        const noteTitle = document.createElement('div');
        noteTitle.className = 'note-title';
        noteTitle.textContent = note.title || '无标题笔记';
        noteCard.appendChild(noteTitle);
        
        // 内容预览
        const noteContent = document.createElement('div');
        noteContent.className = 'note-content';
        noteContent.textContent = this.getContentPreview(note.content || '');
        noteCard.appendChild(noteContent);
        
        // 底部信息栏
        const noteFooter = document.createElement('div');
        noteFooter.className = 'note-footer';
        
        // 更新时间
        const noteDate = document.createElement('div');
        noteDate.className = 'note-date';
        noteDate.textContent = this.formatDate(note.updatedAt || note.createdAt);
        noteFooter.appendChild(noteDate);
        
        // 更多操作按钮
        if (this.options.actionsConfig.showMoreButton) {
          const moreBtn = document.createElement('button');
          moreBtn.className = 'more-btn';
          moreBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
          moreBtn.dataset.id = note.id || note._id;
          noteFooter.appendChild(moreBtn);
        }
        
        noteCard.appendChild(noteFooter);
        
        // 如果笔记已分享，添加分享标识
        if (note.shared) {
          const shareBadge = document.createElement('div');
          shareBadge.className = `note-badge ${note.shareType === 'private' ? 'private' : ''}`;
          shareBadge.innerHTML = `
            <i class="fas ${note.shareType === 'private' ? 'fa-lock' : 'fa-share-alt'}"></i>
            ${note.shareType === 'private' ? '私密分享' : '已分享'}
          `;
          noteCard.appendChild(shareBadge);
        }
        
        // 添加页面特定的按钮(如回收站的恢复和永久删除按钮)
        if (typeof this.options.renderPageSpecificButtons === 'function') {
          this.options.renderPageSpecificButtons(noteCard, note);
        }
        
        // 如果配置了附加按钮，添加它们
        if (this.options.actionsConfig.additionalButtons && this.options.actionsConfig.additionalButtons.length > 0) {
          const buttonsContainer = document.createElement('div');
          buttonsContainer.className = 'note-additional-actions';
          
          this.options.actionsConfig.additionalButtons.forEach(btnConfig => {
            const button = document.createElement('button');
            button.className = btnConfig.className || 'note-action-btn';
            button.dataset.id = note.id || note._id;
            button.dataset.action = btnConfig.action;
            button.innerHTML = btnConfig.icon ? `<i class="${btnConfig.icon}"></i> ${btnConfig.text}` : btnConfig.text;
            
            if (btnConfig.onClick && typeof btnConfig.onClick === 'function') {
              button.addEventListener('click', (e) => {
                e.stopPropagation();
                btnConfig.onClick(note.id || note._id, note);
              });
            }
            
            buttonsContainer.appendChild(button);
          });
          
          noteCard.appendChild(buttonsContainer);
        }
        
        container.appendChild(noteCard);
      });
    };
  }

  /**
   * 格式化日期
   * @param {String} dateString - 日期字符串
   * @returns {String} 格式化后的日期
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // 今天内
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 一周内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      return `周${days[date.getDay()]} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // 今年内
    if (date.getFullYear() === now.getFullYear()) {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
    
    // 更早
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  /**
   * 获取内容预览
   * @param {String} content - 笔记内容
   * @param {Number} maxLength - 最大长度
   * @returns {String} 内容预览
   */
  getContentPreview(content, maxLength = 100) {
    if (!content) return '';
    
    // 移除HTML标签
    const plainText = content.replace(/<[^>]+>/g, '');
    
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  }

  /**
   * 加载笔记
   * @param {Object} options - 加载选项
   * @param {Boolean} options.inTrash - 是否在回收站
   * @param {String} options.categoryId - 分类ID
   * @param {String} options.tagId - 标签ID
   * @param {Boolean} options.isStarred - 是否收藏
   * @param {Boolean} options.isShared - 是否分享
   * @param {String} options.searchQuery - 搜索关键词
   * @param {Boolean} options.forceRefresh - 是否强制刷新
   * @param {String} options.noteIdToRemove - 要从缓存中移除的笔记ID
   * @param {String} options.viewMode - 视图模式 (grid/list)
   * @returns {Promise<Array>} 笔记列表
   */
  async loadNotes(options = {}) {
    // 默认选项
    const defaultOptions = {
      inTrash: false,
      categoryId: null,
      tagId: null,
      isStarred: false,
      isShared: false,
      searchQuery: null,
      forceRefresh: false,
      noteIdToRemove: null,
      viewMode: localStorage.getItem('viewMode') || 'grid'
    };
    
    // 合并选项
    const loadOptions = Object.assign({}, defaultOptions, options);
    
    // 查找容器元素
    const container = document.querySelector(this.options.containerSelector);
    if (!container) {
      console.error(`找不到容器: ${this.options.containerSelector}`);
      return [];
    }
    
    // 保存查询参数
    this.lastQuery = loadOptions;
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey(loadOptions);
    
    // 显示加载状态
    this.showLoadingState(container);
    
    try {
      // 如果指定了要移除的笔记ID，先从缓存中移除
      if (loadOptions.noteIdToRemove) {
        this.removeNoteFromCache(loadOptions.noteIdToRemove);
      }
      
      // 如果是强制刷新，不检查缓存，直接调用API刷新数据
      let notes = [];
      if (loadOptions.forceRefresh) {
        console.log('强制刷新，跳过缓存直接从API获取数据');
        
        // 构建API请求参数
        const apiParams = this.buildApiParams(loadOptions);
        
        // 调用API
        const response = await this.callApi(apiParams);
        
        // 处理API响应
        notes = this.processApiResponse(response);
        
        // 更新缓存
        localStorage.setItem(cacheKey, JSON.stringify(notes));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        
        // 同步更新相关缓存
        this.updateAllCaches(notes, loadOptions);
      } else {
        // 否则，尝试从缓存或API获取笔记
        notes = await this.fetchNotes(loadOptions, cacheKey);
      }
      
      // 清除加载状态
      this.clearLoadingState(container);
      
      // 渲染笔记
      const renderFn = this.options.renderFunction || this.defaultRenderFunction;
      renderFn(notes, container, loadOptions.viewMode);
      
      // 如果是列表视图，也更新列表视图的内容
      if (loadOptions.viewMode === 'list' && typeof window.updateListView === 'function') {
        window.updateListView(notes);
      }
      
      // 调用成功回调
      if (typeof this.options.onLoadSuccess === 'function') {
        this.options.onLoadSuccess(notes, loadOptions);
      }
      
      return notes;
    } catch (error) {
      console.error('加载笔记失败:', error);
      
      // 清除加载状态
      this.clearLoadingState(container);
      
      // 显示错误状态
      this.showErrorState(container, error.message);
      
      // 调用错误回调
      if (typeof this.options.onLoadError === 'function') {
        this.options.onLoadError(error, loadOptions);
      }
      
      return [];
    }
  }

  /**
   * 生成缓存键
   * @param {Object} options - 查询选项
   * @returns {String} 缓存键
   */
  generateCacheKey(options) {
    return `notes_cache_${JSON.stringify(options)}`;
  }

  /**
   * 显示加载状态
   * @param {HTMLElement} container - 容器元素
   */
  showLoadingState(container) {
    // 根据当前查询参数确定正确的加载状态类名
    let loadingClassName = 'loading-notes';
    
    // 根据lastQuery判断当前页面类型
    if (this.lastQuery) {
      if (this.lastQuery.isStarred) {
        loadingClassName = 'loading-starred';
      } else if (this.lastQuery.inTrash) {
        loadingClassName = 'loading-trash';
      } else if (this.lastQuery.isShared) {
        loadingClassName = 'loading-shared';
      }
    }
    
    container.innerHTML = `
      <div class="${loadingClassName}" id="notesLoadingIndicator">
        <i class="fas fa-spinner fa-spin"></i>
        <p>加载笔记中...</p>
      </div>
    `;
  }

  /**
   * 清除加载状态
   * @param {HTMLElement} container - 容器元素
   */
  clearLoadingState(container) {
    const loadingIndicator = container.querySelector('#notesLoadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }

  /**
   * 显示错误状态
   * @param {HTMLElement} container - 容器元素
   * @param {String} errorMessage - 错误信息
   */
  showErrorState(container, errorMessage) {
    // 根据当前查询参数确定正确的错误状态类名
    let errorClassName = 'empty-notes error';
    
    // 根据lastQuery判断当前页面类型
    if (this.lastQuery) {
      if (this.lastQuery.isStarred) {
        errorClassName = 'empty-starred error';
      } else if (this.lastQuery.inTrash) {
        errorClassName = 'empty-trash error';
      } else if (this.lastQuery.isShared) {
        errorClassName = 'empty-shared error';
      } else if (this.lastQuery.categoryId) {
        errorClassName = 'empty-category error';
      } else if (this.lastQuery.tagId) {
        errorClassName = 'empty-tag error';
      }
    }
    
    container.innerHTML = `
      <div class="${errorClassName}">
        <i class="fas fa-exclamation-circle"></i>
        <p>加载失败: ${errorMessage || '未知错误'}</p>
        <button class="retry-btn">重试</button>
      </div>
    `;
    
    // 添加重试按钮事件
    const retryBtn = container.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadNotes(this.lastQuery);
      });
    }
  }

  /**
   * 从API或缓存获取笔记数据
   * @param {Object} options - 查询选项
   * @param {String} cacheKey - 缓存键
   * @returns {Promise<Array>} 笔记数据
   */
  async fetchNotes(options, cacheKey) {
    // 保存查询参数
    this.lastQuery = options;
    
    const now = Date.now();
    
    // 检查特殊视图加载，如回收站、收藏夹等总是强制从API获取最新数据
    const forceFromApi = options.inTrash === true || 
                         options.isStarred === true || 
                         options.isShared === true;
                         
    if (forceFromApi) {
      console.log(`加载特殊视图(${options.inTrash ? '回收站' : ''}${options.isStarred ? '收藏夹' : ''}${options.isShared ? '已分享' : ''})，强制从API获取数据`);
    } else {
      console.log('优先从API获取笔记数据');
    }
    
    try {
      // 构建API请求参数
      const apiParams = this.buildApiParams(options);
      
      // 调用API
      const response = await this.callApi(apiParams);
      
      // 处理API响应
      const notes = this.processApiResponse(response);
      
      console.log(`API返回${notes.length}条笔记`);
      
      // 更新全局缓存和相关视图缓存
      this.updateGlobalNotesWithState(notes, options);
      
      // 更新当前视图缓存
      localStorage.setItem(cacheKey, JSON.stringify(notes));
      localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
      
      return notes;
      
    } catch (apiError) {
      console.error('API获取笔记失败:', apiError);
      
      // 如果是特殊视图且API请求失败，尝试从全局缓存中过滤
      if (forceFromApi) {
        console.log('特殊视图API请求失败，尝试从全局缓存过滤数据');
        const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        if (localNotes.length > 0) {
          const filteredNotes = this.filterLocalNotes(localNotes, options);
          console.log(`从全局缓存中过滤出${filteredNotes.length}条笔记`);
          return filteredNotes;
        }
      }
      
      // API请求失败，尝试从缓存获取数据
      const cachedNotes = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      
      // 如果缓存有效且未过期，则使用缓存
      if (cachedNotes && cacheTimestamp && (now - parseInt(cacheTimestamp)) <= this.options.cacheExpiry) {
        console.log('API请求失败，使用有效缓存');
        return JSON.parse(cachedNotes);
      }
      
      // 如果缓存无效或已过期，尝试从localStorage获取笔记作为备份
      const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
      if (localNotes.length > 0) {
        console.log('从localStorage加载笔记作为备份');
        const filteredNotes = this.filterLocalNotes(localNotes, options);
        
        // 更新缓存
        localStorage.setItem(cacheKey, JSON.stringify(filteredNotes));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());
        
        return filteredNotes;
      }
      
      // 如果本地也没有数据，抛出错误
      throw apiError;
    }
  }

  /**
   * 根据特定状态更新全局笔记缓存
   * @param {Array} notes - 新的笔记数据
   * @param {Object} options - 当前查询选项
   */
  updateGlobalNotesWithState(notes, options) {
    // 只有在处理特定状态的笔记时才更新全局缓存
    if (!options.inTrash && !options.isStarred && !options.isShared) {
      // 常规笔记视图，直接使用updateAllCaches
      this.updateAllCaches(notes, options);
      return;
    }
    
    console.log(`更新全局缓存中的笔记状态: ${options.inTrash ? '回收站' : ''}${options.isStarred ? '收藏夹' : ''}${options.isShared ? '已分享' : ''}`);
    
    // 获取全局笔记缓存
    const globalNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    
    // 创建ID到笔记的映射
    const noteMap = {};
    globalNotes.forEach(note => {
      const noteId = note.id || note._id;
      if (noteId) {
        noteMap[noteId] = note;
      }
    });
    
    // 使用API返回的笔记更新状态
    notes.forEach(note => {
      const noteId = note.id || note._id;
      if (!noteId) return;
      
      if (options.inTrash) {
        // 确保回收站状态正确
        note.inTrash = true;
      }
      
      if (options.isStarred) {
        // 确保收藏状态正确
        note.isStarred = true;
      }
      
      if (options.isShared) {
        // 确保分享状态正确
        note.isShared = true;
      }
      
      // 更新或添加笔记
      noteMap[noteId] = note;
    });
    
    // 转换回数组
    const updatedNotes = Object.values(noteMap);
    
    // 保存回全局缓存
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    console.log(`全局缓存已更新，包含${updatedNotes.length}条笔记`);
  }

  /**
   * 更新所有相关缓存数据
   * @param {Array} latestNotes - 最新的笔记数据
   * @param {Object} currentOptions - 当前查询选项
   */
  updateAllCaches(latestNotes, currentOptions) {
    // 保存到全局笔记缓存
    // 先获取现有的全局笔记缓存
    const existingNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    
    // 创建笔记ID到笔记的映射，用于快速查找和更新
    const noteMap = {};
    existingNotes.forEach(note => {
      const noteId = note.id || note._id;
      if (noteId) {
        noteMap[noteId] = note;
      }
    });
    
    // 使用最新数据更新映射
    latestNotes.forEach(note => {
      const noteId = note.id || note._id;
      if (noteId) {
        noteMap[noteId] = note;
      }
    });
    
    // 转换回数组并保存
    const mergedNotes = Object.values(noteMap);
    localStorage.setItem('notes', JSON.stringify(mergedNotes));
    console.log(`全局笔记缓存已更新，共${mergedNotes.length}条笔记`);
    
    // 清除所有笔记缓存
    console.log('清除所有相关笔记缓存以保证数据一致性');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('notes_cache_') && !key.endsWith('_timestamp')) {
        // 直接移除所有缓存，确保下次加载时从API获取最新数据
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
        i--; // 因为我们删除了一个项目，需要调整索引
      }
    }
  }

  /**
   * 从缓存中移除笔记
   * @param {String} noteId - 笔记ID
   */
  removeNoteFromCache(noteId) {
    console.log(`移除笔记ID ${noteId} 的缓存`);
    
    // 从全局缓存中移除笔记
    const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
    const updatedLocal = localNotes.filter(note => {
      return note.id !== noteId && note._id !== noteId;
    });
    
    if (localNotes.length !== updatedLocal.length) {
      console.log('从全局缓存中移除了笔记');
      localStorage.setItem('notes', JSON.stringify(updatedLocal));
    } else {
      console.log('笔记不在全局缓存中，可能已被移除');
    }
    
    // 收集所有要清理的缓存键
    const keysToUpdate = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('notes_cache_') && !key.endsWith('_timestamp')) {
        keysToUpdate.push(key);
      }
    }
    
    // 逐个处理缓存
    keysToUpdate.forEach(key => {
      try {
        const notes = JSON.parse(localStorage.getItem(key) || '[]');
        const updatedNotes = notes.filter(note => {
          return note.id !== noteId && note._id !== noteId;
        });
        
        if (notes.length !== updatedNotes.length) {
          console.log(`从缓存 ${key} 中移除了笔记`);
          localStorage.setItem(key, JSON.stringify(updatedNotes));
          localStorage.setItem(`${key}_timestamp`, Date.now().toString());
        }
      } catch (e) {
        console.error(`处理缓存键 ${key} 时出错:`, e);
        // 如果出错，直接删除该缓存条目
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
      }
    });
    
    console.log(`笔记缓存清理完成，处理了${keysToUpdate.length}个缓存键`);
  }

  /**
   * 构建API请求参数
   * @param {Object} options - 查询选项
   * @returns {Object} API请求参数
   */
  buildApiParams(options) {
    const params = {};
    
    if (options.inTrash !== undefined) params.inTrash = options.inTrash;
    if (options.categoryId) params.categoryId = options.categoryId;
    if (options.tagId) params.tagId = options.tagId;
    if (options.isStarred) params.isStarred = options.isStarred;
    if (options.isShared) params.isShared = options.isShared;
    if (options.searchQuery) params.query = options.searchQuery;
    
    return params;
  }

  /**
   * 调用API
   * @param {Object} params - API请求参数
   * @returns {Promise<Object>} API响应
   */
  async callApi(params) {
    try {
      // 选择合适的API方法
      if (params.inTrash) {
        if (this.options.apiClient.getTrashedNotes) {
          return await this.options.apiClient.getTrashedNotes();
        } else {
          console.log('getTrashedNotes方法不可用，使用getNotes方法并传递trash=true参数作为回退');
          return await this.options.apiClient.getNotes({ trash: true });
        }
      } else if (params.categoryId) {
        return await this.options.apiClient.getNotesByCategory(params.categoryId);
      } else if (params.tagId) {
        return await this.options.apiClient.getNotesByTag(params.tagId);
      } else if (params.isStarred) {
        return await this.options.apiClient.getStarredNotes();
      } else if (params.isShared) {
        return await this.options.apiClient.getSharedNotes();
      } else if (params.query) {
        return await this.options.apiClient.searchNotes(params.query);
      } else {
        return await this.options.apiClient.getNotes(params);
      }
    } catch (error) {
      console.error('API调用出错:', error);
      // 在API调用失败时，尝试使用更通用的方法作为回退
      if (params.inTrash && (!this.options.apiClient.getTrashedNotes || error.message.includes('getTrashedNotes'))) {
        console.log('尝试使用getNotes方法作为回退');
        return await this.options.apiClient.getNotes({ trash: true });
      }
      throw error;
    }
  }

  /**
   * 处理API响应
   * @param {Object} response - API响应
   * @returns {Array} 笔记数组
   */
  processApiResponse(response) {
    if (response && response.notes) {
      return response.notes || [];
    } else if (response && response.data) {
      return response.data || [];
    } else if (Array.isArray(response)) {
      return response;
    } else {
      console.log('API返回数据格式不正确:', response);
      return [];
    }
  }

  /**
   * 根据条件过滤本地笔记
   * @param {Array} notes - 本地笔记数组
   * @param {Object} options - 过滤条件
   * @returns {Array} 过滤后的笔记数组
   */
  filterLocalNotes(notes, options) {
    console.log(`按条件筛选本地笔记: inTrash=${options.inTrash}, isStarred=${options.isStarred}, isShared=${options.isShared}`);
    
    return notes.filter(note => {
      // 回收站过滤 - 特别注意确保布尔值比较正确
      if (options.inTrash !== undefined) {
        const noteInTrash = note.inTrash === true;
        if (noteInTrash !== options.inTrash) {
          return false;
        }
      }
      
      // 分类过滤
      if (options.categoryId && note.categoryId !== options.categoryId) {
        return false;
      }
      
      // 标签过滤
      if (options.tagId && (!note.tags || !note.tags.includes(options.tagId))) {
        return false;
      }
      
      // 收藏过滤 - 特别注意确保布尔值比较正确
      if (options.isStarred) {
        const noteIsStarred = note.isStarred === true;
        if (!noteIsStarred) {
          return false;
        }
      }
      
      // 分享过滤 - 特别注意确保布尔值比较正确
      if (options.isShared) {
        const noteIsShared = note.isShared === true || note.shared === true;
        if (!noteIsShared) {
          return false;
        }
      }
      
      // 搜索过滤
      if (options.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        const title = (note.title || '').toLowerCase();
        const content = (note.content || '').toLowerCase();
        
        if (!title.includes(query) && !content.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * 刷新笔记
   * @param {Object} options - 刷新选项
   * @returns {Promise<Array>} 笔记列表
   */
  refreshNotes(options = {}) {
    return this.loadNotes(Object.assign({}, this.lastQuery || {}, options, { forceRefresh: true }));
  }

  /**
   * 移除笔记
   * @param {String} noteId - 笔记ID
   * @returns {Promise<Array>} 更新后的笔记列表
   */
  removeNote(noteId) {
    return this.loadNotes(Object.assign({}, this.lastQuery || {}, { noteIdToRemove: noteId, forceRefresh: true }));
  }

  /**
   * 设置视图模式
   * @param {String} viewMode - 视图模式 'grid' 或 'list'
   * @param {Boolean} reloadNotes - 是否重新加载笔记，默认为true
   * @returns {Promise<Array>} 如果重新加载笔记，返回笔记列表Promise
   */
  setViewMode(viewMode) {
    console.log('NotesLoader: 设置视图模式:', viewMode);
    
    if (viewMode !== 'grid' && viewMode !== 'list') {
      console.error('NotesLoader: 无效的视图模式:', viewMode);
      return Promise.resolve([]);
    }
    
    // 保存视图模式到本地存储
    localStorage.setItem('viewMode', viewMode);
    
    // 同步更新ContentHeader组件状态，如果存在
    if (window.contentHeader && typeof window.contentHeader.setViewMode === 'function') {
      console.log('NotesLoader: 同步更新ContentHeader状态');
      window.contentHeader.setViewMode(viewMode);
    }
    
    // 更新主内容区域的类名
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      const classList = mainContent.className.split(' ')
        .filter(cls => !cls.startsWith('view-'));
      classList.push(`view-${viewMode}`);
      mainContent.className = classList.join(' ');
    }
    
    // 重新加载笔记，确保视图与选择一致
    if (this.lastQuery) {
      console.log('NotesLoader: 重新加载笔记以匹配新的视图模式');
      return this.loadNotes({...this.lastQuery, viewMode: viewMode});
    }
    
    return Promise.resolve([]);
  }

  /**
   * 强制清除所有笔记缓存并重新加载
   */
  forceRefreshAllCaches() {
    console.log('强制清除所有笔记缓存');
    
    // 清除所有与笔记相关的缓存
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('notes_cache_')) {
        keysToRemove.push(key);
      }
    }
    
    // 删除收集的键
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`已清除 ${keysToRemove.length} 项缓存`);
    
    // 如果有最后一次查询，使用它来重新加载
    if (this.lastQuery) {
      // 如果是在查看特殊视图（回收站、收藏夹等），进行额外处理确保状态正确
      const specialView = {
        inTrash: this.lastQuery.inTrash === true,
        isStarred: this.lastQuery.isStarred === true,
        isShared: this.lastQuery.isShared === true
      };
      
      if (specialView.inTrash || specialView.isStarred || specialView.isShared) {
        console.log(`正在刷新特殊视图(${specialView.inTrash ? '回收站' : ''}${specialView.isStarred ? '收藏夹' : ''}${specialView.isShared ? '已分享' : ''})`);
      }
      
      // 强制重新加载，始终从API获取最新数据
      return this.loadNotes({...this.lastQuery, forceRefresh: true});
    }
    
    return Promise.resolve([]);
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotesLoader;
} else {
  window.NotesLoader = NotesLoader;
} 