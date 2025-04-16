/**
 * 通用笔记加载组件
 * 支持根据不同参数筛选加载笔记
 */

// 防止重复声明NotesLoader类
if (typeof window.NotesLoader === 'undefined') {
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
        apiClient: window.commpush || window.api, // 优先使用commpush组件
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

      // 如果没有提供API客户端实例，尝试使用全局commpush或api
      if (!this.options.apiClient) {
        this.options.apiClient = window.commpush || window.api || new API();
      }

      this.defaultRenderFunction = this.createDefaultRenderFunction();
      this.lastQuery = null; // 上次查询参数缓存
      this._skipNextRefresh = false; // 新增_skipNextRefresh属性
    }

    /**
     * 创建默认渲染函数
     * @returns {Function} 默认渲染函数
     */
    createDefaultRenderFunction() {
      return (notes, container, viewMode = 'grid') => {
        // 清空容器
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
      // 检查是否需要跳过本次刷新（针对特定操作的临时状态）
      if (this._skipNextRefresh) {
        this._skipNextRefresh = false; // 重置标记
        return [];
      }

      // 默认选项
      const defaultOptions = {
        inTrash: false,         // 是否加载回收站笔记
        categoryId: null,       // 分类ID
        tagId: null,            // 标签ID
        isStarred: false,       // 是否加载收藏笔记
        isShared: false,        // 是否加载分享笔记
        searchQuery: null,      // 搜索关键词
        forceRefresh: false,    // 是否强制刷新
        fallbackToLocalStorage: false,  // 当API请求失败时是否回退到本地存储
        excludeTrash: false,    // 是否排除回收站笔记(与inTrash=false不同，这是额外保障)
        viewMode: null,         // 视图模式：grid(网格) 或 list(列表)
        noteIdToRemove: null    // 要从缓存中移除的笔记ID
      };

      // 合并选项
      options = Object.assign({}, defaultOptions, options);

      // 保存最后的查询参数
      this.lastQuery = options;

      // 查找容器元素
      const container = document.querySelector(this.options.containerSelector);
      if (!container) {
        return [];
      }

      // 显示加载状态
      this.showLoadingState(container);

      try {
        // 如果指定了要移除的笔记ID，先从缓存中移除
        if (options.noteIdToRemove) {
          this.removeNoteFromCache(options.noteIdToRemove);
        }

        // 如果是强制刷新，不检查缓存，直接调用API刷新数据
        let notes = [];
        if (options.forceRefresh) {
          // 构建API请求参数
          const apiParams = this.buildApiParams(options);

          // 调用API
          const response = await this.callApi(apiParams);

          // 处理API响应
          notes = this.processApiResponse(response);

          // 更新缓存
          localStorage.setItem(this.generateCacheKey(options), JSON.stringify(notes));
          localStorage.setItem(`${this.generateCacheKey(options)}_timestamp`, Date.now().toString());

          // 同步更新相关缓存
          this.updateAllCaches(notes, options);
        } else {
          // 否则，尝试从缓存或API获取笔记
          notes = await this.fetchNotes(options, this.generateCacheKey(options));
        }

        // 清除加载状态
        this.clearLoadingState(container);

        // 渲染笔记
        const renderFn = this.options.renderFunction || this.defaultRenderFunction;
        renderFn(notes, container, options.viewMode);

        // 如果是列表视图，也更新列表视图的内容
        if (options.viewMode === 'list' && typeof window.updateListView === 'function') {
          window.updateListView(notes);
        }

        // 调用成功回调
        if (typeof this.options.onLoadSuccess === 'function') {
          this.options.onLoadSuccess(notes, options);
        }

        return notes;
      } catch (error) {
        // 清除加载状态
        this.clearLoadingState(container);

        // 显示错误状态
        this.showErrorState(container, error.message);

        // 调用错误回调
        if (typeof this.options.onLoadError === 'function') {
          this.options.onLoadError(error, options);
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

      try {
        // 构建API请求参数
        const apiParams = this.buildApiParams(options);

        // 调用API
        const response = await this.callApi(apiParams);

        // 处理API响应
        const notes = this.processApiResponse(response);

        // 更新全局缓存和相关视图缓存
        this.updateGlobalNotesWithState(notes, options);

        // 更新当前视图缓存
        localStorage.setItem(cacheKey, JSON.stringify(notes));
        localStorage.setItem(`${cacheKey}_timestamp`, now.toString());

        return notes;

      } catch (apiError) {
        // 如果是特殊视图且API请求失败，尝试从全局缓存中过滤
        if (forceFromApi) {
          const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
          if (localNotes.length > 0) {
            const filteredNotes = this.filterLocalNotes(localNotes, options);
            return filteredNotes;
          }
        }

        // API请求失败，尝试从缓存获取数据
        const cachedNotes = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

        // 如果缓存有效且未过期，则使用缓存
        if (cachedNotes && cacheTimestamp && (now - parseInt(cacheTimestamp)) <= this.options.cacheExpiry) {
          return JSON.parse(cachedNotes);
        }

        // 如果缓存无效或已过期，尝试从localStorage获取笔记作为备份
        const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
        if (localNotes.length > 0) {
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
    }

    /**
     * 更新所有缓存，确保数据一致性
     * @param {Array} latestNotes - 最新获取的笔记
     * @param {Object} currentOptions - 当前查询选项
     */
    updateAllCaches(latestNotes, currentOptions) {
      // 只有在没有特定过滤条件时才更新全局笔记缓存
      const isFilteredView = currentOptions.tagId || currentOptions.categoryId;

      if (!isFilteredView) {
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
      }

      // 只清除当前视图的缓存，保留其他缓存
      const cacheKeyToUpdate = this.generateCacheKey(currentOptions);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key === cacheKeyToUpdate && !key.endsWith('_timestamp')) {
          // 只更新当前查询对应的缓存
          localStorage.setItem(key, JSON.stringify(latestNotes));
          localStorage.setItem(`${key}_timestamp`, Date.now().toString());
          break;
        }
      }
    }

    /**
     * 从缓存中移除笔记
     * @param {String} noteId - 笔记ID
     */
    removeNoteFromCache(noteId) {
      // 从全局缓存中移除笔记
      const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
      const updatedLocal = localNotes.filter(note => {
        return note.id !== noteId && note._id !== noteId;
      });

      if (localNotes.length !== updatedLocal.length) {
        localStorage.setItem('notes', JSON.stringify(updatedLocal));
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
            localStorage.setItem(key, JSON.stringify(updatedNotes));
            localStorage.setItem(`${key}_timestamp`, Date.now().toString());
          }
        } catch (e) {
          // 如果出错，直接删除该缓存条目
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_timestamp`);
        }
      });
    }

    /**
     * 构建API请求参数
     * @param {Object} options - 查询选项
     * @returns {Object} API请求参数
     */
    buildApiParams(options) {
      const params = {};

      if (options.inTrash !== undefined) params.inTrash = options.inTrash;
      if (options.categoryId && options.categoryId !== 'null' && options.categoryId !== 'undefined') {
        params.categoryId = options.categoryId;
      }
      if (options.tagId) params.tagId = options.tagId;
      if (options.isStarred) params.starred = options.isStarred;
      if (options.isShared) params.shared = options.isShared;
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
            return await this.options.apiClient.getNotes({ trash: true });
          }
        } else if (params.categoryId) {
          // 检查API是否有getNotesByCategory方法
          if (this.options.apiClient.getNotesByCategory) {
            return await this.options.apiClient.getNotesByCategory(params.categoryId);
          } else {
            // 回退到getNotes方法，以categoryId作为参数
            return await this.options.apiClient.getNotes({ categoryId: params.categoryId });
          }
        } else if (params.tagId) {
          // 检查API是否有getNotesByTag方法
          if (this.options.apiClient.getNotesByTag) {
            try {
              const response = await this.options.apiClient.getNotesByTag(params.tagId);

              // 确保只返回当前标签的笔记
              if (response && response.success) {
                if (response.notes) {
                  // 过滤确保只返回当前标签的笔记
                  response.notes = response.notes.filter(note => this.noteHasTag(note, params.tagId));
                } else if (response.data) {
                  // 如果数据在data字段中
                  response.data = response.data.filter(note => this.noteHasTag(note, params.tagId));
                }
              }

              return response;
            } catch (error) {
              // 如果失败，尝试使用getNotes方法并传递tagId参数
              const response = await this.options.apiClient.getNotes({ tagId: params.tagId });

              // 确保只返回当前标签的笔记
              if (response && response.success) {
                if (response.notes) {
                  response.notes = response.notes.filter(note => this.noteHasTag(note, params.tagId));
                } else if (response.data) {
                  response.data = response.data.filter(note => this.noteHasTag(note, params.tagId));
                }
              }

              return response;
            }
          } else {
            // 回退到getNotes方法，以tagId作为参数
            const response = await this.options.apiClient.getNotes({ tagId: params.tagId });

            // 确保只返回当前标签的笔记
            if (response && response.success) {
              if (response.notes) {
                response.notes = response.notes.filter(note => this.noteHasTag(note, params.tagId));
              } else if (response.data) {
                response.data = response.data.filter(note => this.noteHasTag(note, params.tagId));
              }
            }

            return response;
          }
        } else if (params.isStarred) {
          if (this.options.apiClient.getStarredNotes) {
            return await this.options.apiClient.getStarredNotes();
          } else {
            return await this.options.apiClient.getNotes({ starred: true });
          }
        } else if (params.isShared) {
          if (this.options.apiClient.getSharedNotes) {
            return await this.options.apiClient.getSharedNotes();
          } else {
            return await this.options.apiClient.getNotes({ shared: true });
          }
        } else if (params.query) {
          if (this.options.apiClient.searchNotes) {
            return await this.options.apiClient.searchNotes(params.query);
          } else {
            return await this.options.apiClient.getNotes({ query: params.query });
          }
        } else {
          return await this.options.apiClient.getNotes(params);
        }
      } catch (error) {
        // 在API调用失败时，尝试更通用的方法作为回退
        if (params.categoryId && error.message && error.message.includes('getNotesByCategory')) {
          return await this.options.apiClient.getNotes({ category: params.categoryId });
        }
        if (params.tagId && error.message && error.message.includes('getNotesByTag')) {
          return await this.options.apiClient.getNotes({ tagId: params.tagId });
        }
        if (params.inTrash && (!this.options.apiClient.getTrashedNotes || error.message.includes('getTrashedNotes'))) {
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
      return notes.filter(note => {
        // 回收站过滤 - 特别注意确保布尔值比较正确
        if (options.inTrash !== undefined) {
          const noteInTrash = note.inTrash === true;
          if (noteInTrash !== options.inTrash) {
            return false;
          }
        }

        // 分类过滤 - 注意处理空值和显式过滤
        if (options.categoryId) {
          // 如果特定分类ID不匹配，则排除
          if (note.categoryId !== options.categoryId) {
            return false;
          }
        } else if (options.excludeCategory) {
          // 如果定义了excludeCategory，排除特定分类
          if (note.categoryId === options.excludeCategory) {
            return false;
          }
        }

        // 标签过滤 - 更严格的标签匹配
        if (options.tagId) {
          // 如果没有标签数据或标签不匹配，则排除
          if (!note.tags && !note.tagId) {
            return false;
          }

          // 使用noteHasTag方法检查标签匹配
          if (!this.noteHasTag(note, options.tagId)) {
            return false;
          }
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
     * 检查笔记是否包含指定标签
     * @param {Object} note - 笔记对象
     * @param {String} tagId - 标签ID
     * @returns {Boolean} 是否包含该标签
     */
    noteHasTag(note, tagId) {
      if (!tagId) return true;

      // 1. 如果标签是数组形式 note.tags = ['tag1', 'tag2']
      if (Array.isArray(note.tags)) {
        if (note.tags.length > 0) {
          if (typeof note.tags[0] === 'object') {
            // 对象数组形式：[{id: 'tag1'}, {id: 'tag2'}]
            return note.tags.some(tag => tag.id === tagId || tag._id === tagId);
          } else {
            // 简单数组形式：['tag1', 'tag2']
            return note.tags.includes(tagId);
          }
        }
        return false;
      }
      // 2. 如果标签是单值形式 note.tagId = 'tag1' 或 note.tags = 'tag1'
      else if (typeof note.tags === 'string') {
        return note.tags === tagId;
      }

      // 3. 也检查note.tagId
      if (note.tagId) {
        return note.tagId === tagId;
      }

      return false;
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
      if (viewMode !== 'grid' && viewMode !== 'list') {
        return Promise.resolve([]);
      }

      // 保存视图模式到本地存储
      localStorage.setItem('viewMode', viewMode);

      // 同步更新ContentHeader组件状态，如果存在
      if (window.contentHeader && typeof window.contentHeader.setViewMode === 'function') {
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
        return this.loadNotes({...this.lastQuery, viewMode: viewMode});
      }

      return Promise.resolve([]);
    }

    /**
     * 强制清除所有笔记缓存并重新加载
     */
    forceRefreshAllCaches() {
      // 清除所有与笔记相关的缓存
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('notes_cache_') || key.includes('_timestamp'))) {
          keysToRemove.push(key);
        }
      }

      // 删除收集的键
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // 触发内存中的缓存清除
      this.cache = {};

      console.log("所有笔记缓存已清除，准备重新加载...");

      // 如果有最后一次查询，使用它来重新加载
      if (this.lastQuery) {
        // 强制重新加载，始终从API获取最新数据
        console.log("使用上次查询重新加载笔记:", this.lastQuery);
        return this.loadNotes({...this.lastQuery, forceRefresh: true});
      } else {
        // 如果没有最后查询，尝试加载默认笔记（未删除的笔记）
        console.log("没有上次查询信息，加载默认笔记");
        const defaultQuery = {
          container: document.querySelector('.notes-container') || document.body,
          inTrash: false,
          forceRefresh: true
        };
        return this.loadNotes(defaultQuery);
      }
    }

    /**
     * 手动导出笔记
     * @param {Object} options - 导出选项
     * @param {String} options.format - 导出格式 'markdown' 或 'html'
     * @param {Boolean} options.includeDeleted - 是否包含已删除笔记
     * @param {Boolean} options.includeMetadata - 是否包含元数据
     * @returns {Promise<Blob>} 包含导出笔记的ZIP文件Blob
     */
    async exportNotes(options = {}) {
      const format = options.format || 'markdown';
      const includeDeleted = options.includeDeleted !== undefined ? options.includeDeleted : true;
      const includeMetadata = options.includeMetadata !== undefined ? options.includeMetadata : true;
      
      // 获取所有笔记
      let notes = JSON.parse(localStorage.getItem('notes') || '[]');
      
      // 过滤笔记
      if (!includeDeleted) {
        notes = notes.filter(note => !note.inTrash);
      }
      
      // 确保有笔记可导出
      if (notes.length === 0) {
        throw new Error('没有可导出的笔记');
      }
      
      // 加载JSZip库
      let JSZip;
      try {
        JSZip = window.JSZip || await this.loadJSZip();
      } catch (error) {
        throw new Error('无法加载JSZip库: ' + error.message);
      }
      
      const zip = new JSZip();
      
      // 添加README文件
      zip.file('README.txt', `笔记平台导出
导出日期: ${new Date().toLocaleString()}
导出格式: ${format === 'markdown' ? 'Markdown' : 'HTML'}
笔记数量: ${notes.length}
包含已删除笔记: ${includeDeleted ? '是' : '否'}
包含元数据: ${includeMetadata ? '是' : '否'}

文件说明:
- 每个笔记以"id_标题.${format === 'markdown' ? 'md' : 'html'}"形式命名
- 如果包含元数据，每个笔记文件的开头会包含创建时间、更新时间等信息
`);
      
      // 处理每个笔记
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const fileName = `${note.id}_${note.title}.${format === 'markdown' ? 'md' : 'html'}`;
        
        let content = '';
        
        // 添加元数据
        if (includeMetadata) {
          if (format === 'markdown') {
            content += `---
id: ${note.id}
title: ${note.title}
createdAt: ${note.createdAt || '未知'}
updatedAt: ${note.updatedAt || '未知'}
inTrash: ${note.inTrash ? 'true' : 'false'}
---\n\n`;
          } else {
            content += `<!--
id: ${note.id}
title: ${note.title}
createdAt: ${note.createdAt || '未知'}
updatedAt: ${note.updatedAt || '未知'}
inTrash: ${note.inTrash ? 'true' : 'false'}
-->\n\n`;
          }
        }
        
        // 添加标题
        if (format === 'markdown') {
          content += `# ${note.title}\n\n`;
        }
        
        // 添加内容
        if (format === 'markdown') {
          // HTML转Markdown
          content += this.htmlToMarkdown(note.content || note.contentData || '');
        } else {
          // HTML格式
          content += `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${note.title}</title>
</head>
<body>
  <h1>${note.title}</h1>
  ${note.content || note.contentData || ''}
</body>
</html>`;
        }
        
        // 添加到ZIP
        zip.file(fileName, content);
      }
      
      // 生成ZIP
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      return blob;
    }
    
    /**
     * 加载JSZip库
     * @returns {Promise<Object>} JSZip库对象
     */
    async loadJSZip() {
      return new Promise((resolve, reject) => {
        if (window.JSZip) {
          resolve(window.JSZip);
          return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = () => reject(new Error('无法加载JSZip库'));
        document.head.appendChild(script);
      });
    }
    
    /**
     * HTML转Markdown (简化版)
     * @param {String} html - HTML内容
     * @returns {String} Markdown文本
     */
    htmlToMarkdown(html) {
      let text = html
        // 移除HTML标签之前先处理一些常见元素
        .replace(/<h1>(.*?)<\/h1>/gi, '\n# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '\n## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n\n')
        .replace(/<h4>(.*?)<\/h4>/gi, '\n#### $1\n\n')
        .replace(/<h5>(.*?)<\/h5>/gi, '\n##### $1\n\n')
        .replace(/<h6>(.*?)<\/h6>/gi, '\n###### $1\n\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i>(.*?)<\/i>/gi, '*$1*')
        .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img src="(.*?)".*?alt="(.*?)".*?>/gi, '![$2]($1)')
        .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
        .replace(/<ul>([\s\S]*?)<\/ul>/gi, function(match, list) {
          return list.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
        })
        .replace(/<ol>([\s\S]*?)<\/ol>/gi, function(match, list) {
          let index = 1;
          return list.replace(/<li>(.*?)<\/li>/gi, function(match, item) {
            return (index++) + '. ' + item + '\n';
          }) + '\n';
        })
        // 移除剩余的HTML标签
        .replace(/<[^>]*>/g, '')
        // 处理HTML实体
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        // 清理多余的空行
        .replace(/\n\s*\n\s*\n/g, '\n\n');
      
      return text;
    }
  }

  // 导出组件
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotesLoader;
  } else {
    window.NotesLoader = NotesLoader;
  }
}