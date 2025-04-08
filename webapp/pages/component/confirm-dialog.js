/**
 * 通用确认对话框组件
 * 支持自定义确认/取消按钮文本、样式和回调
 */
class ConfirmDialog {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {String} options.confirmButtonText - 确认按钮文本
   * @param {String} options.cancelButtonText - 取消按钮文本
   * @param {String} options.confirmButtonClass - 确认按钮CSS类
   * @param {String} options.cancelButtonClass - 取消按钮CSS类
   * @param {Function} options.onConfirm - 确认回调
   * @param {Function} options.onCancel - 取消回调
   * @param {Boolean} options.closeOnBackdrop - 点击背景是否关闭对话框
   */
  constructor(options = {}) {
    this.options = Object.assign({
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      confirmButtonClass: 'confirm-btn primary',
      cancelButtonClass: 'cancel-btn',
      onConfirm: null,
      onCancel: null,
      closeOnBackdrop: true
    }, options);

    // 添加样式
    this.addStyles();
    
    // 绑定方法
    this.close = this.close.bind(this);
    
    // 保存当前实例
    ConfirmDialog.currentInstance = this;
  }

  /**
   * 添加默认样式
   */
  addStyles() {
    const styleId = 'confirm-dialog-styles';
    // 检查样式是否已存在
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .confirm-dialog-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .confirm-dialog-backdrop.show {
        opacity: 1;
      }
      
      .confirm-dialog {
        width: 100%;
        max-width: 400px;
        margin: 20px;
        background-color: var(--card-bg, #ffffff);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateY(20px);
        transition: transform 0.3s ease;
        overflow: hidden;
      }
      
      .dark-mode .confirm-dialog {
        background-color: var(--card-bg, #2d2d2d);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      
      .confirm-dialog.show {
        transform: translateY(0);
      }
      
      .confirm-dialog-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #eee);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .dark-mode .confirm-dialog-header {
        border-bottom-color: var(--border-color, #444);
      }
      
      .confirm-dialog-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-color, #333);
        margin: 0;
      }
      
      .dark-mode .confirm-dialog-title {
        color: var(--text-color, #eee);
      }
      
      .confirm-dialog-close {
        background: none;
        border: none;
        color: var(--text-muted, #666);
        font-size: 20px;
        cursor: pointer;
        display: flex;
        padding: 4px;
        margin: -4px;
        line-height: 1;
      }
      
      .dark-mode .confirm-dialog-close {
        color: var(--text-muted, #bbb);
      }
      
      .confirm-dialog-close:hover {
        color: var(--text-color, #333);
      }
      
      .dark-mode .confirm-dialog-close:hover {
        color: var(--text-color, #eee);
      }
      
      .confirm-dialog-body {
        padding: 20px;
        color: var(--text-muted, #666);
        font-size: 14px;
        line-height: 1.5;
      }
      
      .dark-mode .confirm-dialog-body {
        color: var(--text-muted, #bbb);
      }
      
      .confirm-dialog-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--border-color, #eee);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      .dark-mode .confirm-dialog-footer {
        border-top-color: var(--border-color, #444);
      }
      
      .confirm-btn,
      .cancel-btn {
        padding: 8px 20px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
      }
      
      .cancel-btn {
        background-color: var(--btn-secondary-bg, #f0f0f0);
        color: var(--btn-secondary-text, #333);
      }
      
      .dark-mode .cancel-btn {
        background-color: var(--btn-secondary-bg, #444);
        color: var(--btn-secondary-text, #eee);
      }
      
      .cancel-btn:hover {
        background-color: var(--btn-secondary-hover, #e0e0e0);
      }
      
      .dark-mode .cancel-btn:hover {
        background-color: var(--btn-secondary-hover, #555);
      }
      
      .confirm-btn.primary {
        background-color: var(--btn-primary-bg, #1a73e8);
        color: var(--btn-primary-text, white);
      }
      
      .confirm-btn.primary:hover {
        background-color: var(--primary-color-hover, #1765cc);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
      
      .confirm-btn.danger {
        background-color: var(--danger-color, #ea4335);
        color: white;
      }
      
      .confirm-btn.danger:hover {
        background-color: var(--danger-color-hover, #d33426);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
      
      /* 提供键盘交互焦点样式 */
      .confirm-btn:focus,
      .cancel-btn:focus,
      .confirm-dialog-close:focus {
        outline: 2px solid var(--primary-color, #1a73e8);
        outline-offset: 2px;
      }
      
      .dark-mode .confirm-btn:focus,
      .dark-mode .cancel-btn:focus,
      .dark-mode .confirm-dialog-close:focus {
        outline-color: var(--primary-color, #8ab4f8);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 显示确认对话框
   * @param {String} title - 对话框标题
   * @param {String} message - 对话框内容
   * @param {Object} options - 配置选项，会覆盖实例配置
   * @param {Function} callback - 可选的回调函数，如未提供则返回Promise
   * @returns {Promise|undefined} 如未提供回调则返回Promise
   */
  show(title, message, options = {}, callback) {
    // 移除可能存在的旧对话框
    this.close();
    
    // 合并配置
    const mergedOptions = Object.assign({}, this.options, options);
    
    // 创建对话框元素
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'confirm-dialog-backdrop';
    
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    
    dialog.innerHTML = `
      <div class="confirm-dialog-header">
        <h3 class="confirm-dialog-title">${title}</h3>
        <button class="confirm-dialog-close" aria-label="关闭">&times;</button>
      </div>
      <div class="confirm-dialog-body">
        ${message}
      </div>
      <div class="confirm-dialog-footer">
        <button class="cancel-btn ${mergedOptions.cancelButtonClass}">${mergedOptions.cancelButtonText}</button>
        <button class="confirm-btn ${mergedOptions.confirmButtonClass}">${mergedOptions.confirmButtonText}</button>
      </div>
    `;
    
    // 添加到容器
    this.backdrop.appendChild(dialog);
    document.body.appendChild(this.backdrop);
    
    // 获取元素引用
    this.dialog = dialog;
    const closeBtn = dialog.querySelector('.confirm-dialog-close');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const confirmBtn = dialog.querySelector('.confirm-btn');
    
    // 使用Promise处理用户选择
    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    // 定义处理函数
    const handleConfirm = () => {
      try {
        if (typeof mergedOptions.onConfirm === 'function') {
          mergedOptions.onConfirm();
        }
        if (typeof callback === 'function') {
          callback(true);
        } else {
          resolvePromise(true);
        }
      } catch (error) {
        console.error('确认回调执行错误:', error);
      } finally {
        this.close();
      }
    };
    
    const handleCancel = () => {
      try {
        if (typeof mergedOptions.onCancel === 'function') {
          mergedOptions.onCancel();
        }
        if (typeof callback === 'function') {
          callback(false);
        } else {
          resolvePromise(false);
        }
      } catch (error) {
        console.error('取消回调执行错误:', error);
      } finally {
        this.close();
      }
    };
    
    // 移除旧的事件监听器（如果存在）
    if (closeBtn._clickHandler) closeBtn.removeEventListener('click', closeBtn._clickHandler);
    if (cancelBtn._clickHandler) cancelBtn.removeEventListener('click', cancelBtn._clickHandler);
    if (confirmBtn._clickHandler) confirmBtn.removeEventListener('click', confirmBtn._clickHandler);
    
    // 保存事件处理函数引用，以便后续移除
    closeBtn._clickHandler = handleCancel;
    cancelBtn._clickHandler = handleCancel;
    confirmBtn._clickHandler = handleConfirm;
    
    // 添加事件监听
    closeBtn.addEventListener('click', closeBtn._clickHandler);
    cancelBtn.addEventListener('click', cancelBtn._clickHandler);
    confirmBtn.addEventListener('click', confirmBtn._clickHandler);
    
    // 点击背景关闭
    if (mergedOptions.closeOnBackdrop) {
      // 移除旧的事件监听器（如果存在）
      if (this.backdrop._clickHandler) {
        this.backdrop.removeEventListener('click', this.backdrop._clickHandler);
      }
      
      // 新的事件处理函数
      this.backdrop._clickHandler = (e) => {
        if (e.target === this.backdrop) {
          handleCancel();
        }
      };
      
      this.backdrop.addEventListener('click', this.backdrop._clickHandler);
    }
    
    // 键盘交互
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        // 检查焦点是否在取消按钮上
        if (document.activeElement === cancelBtn) {
          handleCancel();
        } else {
          handleConfirm();
        }
      }
    };
    
    // 移除旧的键盘事件监听器
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
    }
    
    // 保存新的键盘事件处理函数
    this._keydownHandler = handleKeydown;
    document.addEventListener('keydown', this._keydownHandler);
    
    // 确保在对话框关闭后移除事件监听
    this.cleanup = () => {
      // 移除所有事件监听器
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
      
      if (closeBtn) {
        closeBtn.removeEventListener('click', closeBtn._clickHandler);
        closeBtn._clickHandler = null;
      }
      
      if (cancelBtn) {
        cancelBtn.removeEventListener('click', cancelBtn._clickHandler);
        cancelBtn._clickHandler = null;
      }
      
      if (confirmBtn) {
        confirmBtn.removeEventListener('click', confirmBtn._clickHandler);
        confirmBtn._clickHandler = null;
      }
      
      if (this.backdrop && this.backdrop._clickHandler) {
        this.backdrop.removeEventListener('click', this.backdrop._clickHandler);
        this.backdrop._clickHandler = null;
      }
    };
    
    // 显示对话框
    requestAnimationFrame(() => {
      this.backdrop.classList.add('show');
      dialog.classList.add('show');
      
      // 自动聚焦确认按钮
      confirmBtn.focus();
    });
    
    // 如果没有提供回调函数，则返回Promise
    return typeof callback === 'function' ? undefined : promise;
  }

  /**
   * 关闭对话框
   */
  close() {
    // 如果有清理函数，执行清理
    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }
    
    // 如果对话框不存在，直接返回
    if (!this.backdrop) {
      return;
    }
    
    // 移除显示类
    if (this.backdrop) {
      this.backdrop.classList.remove('show');
    }
    
    if (this.dialog) {
      this.dialog.classList.remove('show');
    }
    
    // 延迟移除元素，等待过渡效果完成
    setTimeout(() => {
      if (this.backdrop && this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      
      this.backdrop = null;
      this.dialog = null;
    }, 300);
  }
  
  /**
   * 显示确认对话框的静态方法
   * @param {String} title - 对话框标题
   * @param {String} message - 对话框内容
   * @param {Function} callback - 可选的回调函数
   * @returns {Promise|undefined} 如未提供回调则返回Promise
   */
  static confirm(title, message, callback) {
    // 关闭可能存在的其他对话框
    if (ConfirmDialog.currentInstance) {
      ConfirmDialog.currentInstance.close();
    }
    
    const dialog = new ConfirmDialog();
    return dialog.show(title, message, {
      confirmButtonText: '确认',
      confirmButtonClass: 'confirm-btn primary'
    }, callback);
  }
  
  /**
   * 显示危险操作确认对话框的静态方法
   * @param {String} title - 对话框标题
   * @param {String} message - 对话框内容
   * @param {Function} callback - 可选的回调函数
   * @returns {Promise|undefined} 如未提供回调则返回Promise
   */
  static danger(title, message, callback) {
    // 关闭可能存在的其他对话框
    if (ConfirmDialog.currentInstance) {
      ConfirmDialog.currentInstance.close();
    }
    
    const dialog = new ConfirmDialog();
    return dialog.show(title, message, {
      confirmButtonText: '确认删除',
      confirmButtonClass: 'confirm-btn danger'
    }, callback);
  }
  
  /**
   * 显示分享确认对话框的静态方法
   * @param {String} title - 对话框标题
   * @param {String} message - 对话框内容
   * @param {Function} callback - 可选的回调函数
   * @returns {Promise|undefined} 如未提供回调则返回Promise
   */
  static share(title, message, callback) {
    // 关闭可能存在的其他对话框
    if (ConfirmDialog.currentInstance) {
      ConfirmDialog.currentInstance.close();
    }
    
    const dialog = new ConfirmDialog();
    return dialog.show(title, message, {
      confirmButtonText: '确认分享',
      confirmButtonClass: 'confirm-btn primary'
    }, callback);
  }
}

// 保存当前实例的静态属性
ConfirmDialog.currentInstance = null;

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfirmDialog;
} else {
  window.ConfirmDialog = ConfirmDialog;
} 