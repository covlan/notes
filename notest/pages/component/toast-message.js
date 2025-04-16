/**
 * 通用提示消息组件
 * 提供统一的消息提示功能，支持多种类型：成功、错误、警告和信息
 */
class ToastMessage {
  /**
   * 构造函数
   * @param {String} message 消息内容
   * @param {String} type 消息类型 (success/error/warning/info)
   * @param {Object} options 配置选项
   * @param {Number} options.duration 显示时长(毫秒)
   * @param {Boolean} options.closable 是否可手动关闭
   * @param {Function} options.onClose 关闭时的回调函数
   */
  constructor(message, type = 'info', options = {}) {
    this.message = message;
    this.type = type;
    this.options = Object.assign({
      duration: 1000,
      closable: true,
      onClose: null
    }, options);

    // 添加样式
    this.addStyles();
    
    // 创建并显示提示
    this.show();
  }

  /**
   * 添加Toast样式
   */
  addStyles() {
    const styleId = 'toast-message-styles';
    // 检查样式是否已存在
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .toast-message-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 100%;
        align-items: center;
      }
      
      .toast-message-item {
        background-color: var(--card-bg, #ffffff);
        color: var(--text-color, #333333);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        max-width: 350px;
        pointer-events: auto;
        margin: 0 10px;
        position: relative;
        overflow: hidden;
      }
      
      .dark-mode .toast-message-item {
        background-color: var(--card-bg, #2d2d2d);
        color: var(--text-color, #f0f0f0);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }
      
      .toast-message-item.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .toast-message-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 4px;
      }
      
      .toast-message-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      
      .toast-message-content {
        flex: 1;
        font-size: 14px;
        overflow-wrap: break-word;
        word-break: break-word;
      }
      
      .toast-message-close {
        background: none;
        border: none;
        color: var(--text-muted, #777);
        cursor: pointer;
        font-size: 14px;
        padding: 4px;
        margin: -4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        border-radius: 50%;
      }
      
      .toast-message-close:hover {
        background-color: rgba(0, 0, 0, 0.05);
        color: var(--text-color, #333);
      }
      
      .dark-mode .toast-message-close:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: var(--text-color, #eee);
      }
      
      /* 成功样式 */
      .toast-message-item.success::before {
        background-color: var(--success-color, #34a853);
      }
      
      .toast-message-item.success .toast-message-icon {
        color: var(--success-color, #34a853);
      }
      
      /* 错误样式 */
      .toast-message-item.error::before {
        background-color: var(--danger-color, #ea4335);
      }
      
      .toast-message-item.error .toast-message-icon {
        color: var(--danger-color, #ea4335);
      }
      
      /* 警告样式 */
      .toast-message-item.warning::before {
        background-color: var(--warning-color, #fbbc05);
      }
      
      .toast-message-item.warning .toast-message-icon {
        color: var(--warning-color, #fbbc05);
      }
      
      /* 信息样式 */
      .toast-message-item.info::before {
        background-color: var(--info-color, #4285f4);
      }
      
      .toast-message-item.info .toast-message-icon {
        color: var(--info-color, #4285f4);
      }
      
      /* 消息自动消失的计时器指示器 */
      .toast-message-timer {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background-color: rgba(0, 0, 0, 0.1);
        width: 100%;
        transform-origin: left;
      }
      
      .dark-mode .toast-message-timer {
        background-color: rgba(255, 255, 255, 0.15);
      }
      
      /* 移动设备响应式 */
      @media (max-width: 480px) {
        .toast-message-container {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 40px);
        }
        
        .toast-message-item {
          min-width: 0;
          width: 100%;
          max-width: 100%;
          margin: 0;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // 创建消息容器
    if (!document.querySelector('.toast-message-container')) {
      const container = document.createElement('div');
      container.className = 'toast-message-container';
      document.body.appendChild(container);
    }
  }

  /**
   * 显示提示消息
   */
  show() {
    // 获取容器
    const container = document.querySelector('.toast-message-container');
    
    // 创建消息元素
    const toast = document.createElement('div');
    toast.className = `toast-message-item ${this.type}`;
    
    // 设置图标
    const icon = this.getIconByType(this.type);
    
    // 创建HTML结构
    toast.innerHTML = `
      <div class="toast-message-icon">
        <i class="${icon}"></i>
      </div>
      <div class="toast-message-content">${this.message}</div>
      ${this.options.closable ? `
        <button class="toast-message-close" aria-label="关闭">
          <i class="fas fa-times"></i>
        </button>
      ` : ''}
      <div class="toast-message-timer"></div>
    `;
    
    // 添加到容器
    container.appendChild(toast);
    
    // 强制回流，以便应用过渡效果
    toast.offsetHeight;
    
    // 显示消息
    toast.classList.add('show');
    
    // 如果有自动消失时间，添加计时器效果
    if (this.options.duration > 0) {
      const timer = toast.querySelector('.toast-message-timer');
      timer.style.transition = `transform ${this.options.duration}ms linear`;
      timer.style.transform = 'scaleX(0)';
      
      // 设置自动关闭
      this.autoCloseTimeout = setTimeout(() => {
        this.close(toast);
      }, this.options.duration);
    }
    
    // 添加关闭按钮事件
    if (this.options.closable) {
      const closeBtn = toast.querySelector('.toast-message-close');
      closeBtn.addEventListener('click', () => {
        // 清除自动关闭计时器
        if (this.autoCloseTimeout) {
          clearTimeout(this.autoCloseTimeout);
        }
        this.close(toast);
      });
    }
    
    // 保存引用
    this.element = toast;
  }

  /**
   * 关闭提示消息
   * @param {HTMLElement} toast 提示消息元素
   */
  close(toast) {
    // 移除显示类
    toast.classList.remove('show');
    
    // 添加淡出动画
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // 执行回调
      if (typeof this.options.onClose === 'function') {
        this.options.onClose();
      }
    }, 300);
  }

  /**
   * 根据类型获取对应图标
   * @param {String} type 消息类型
   * @returns {String} 图标类名
   */
  getIconByType(type) {
    switch (type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
      default:
        return 'fas fa-info-circle';
    }
  }

  /**
   * 显示成功消息的静态方法
   * @param {String} message 消息内容
   * @param {Object} options 配置选项
   */
  static success(message, options = {}) {
    return new ToastMessage(message, 'success', options);
  }

  /**
   * 显示错误消息的静态方法
   * @param {String} message 消息内容
   * @param {Object} options 配置选项
   */
  static error(message, options = {}) {
    return new ToastMessage(message, 'error', options);
  }

  /**
   * 显示警告消息的静态方法
   * @param {String} message 消息内容
   * @param {Object} options 配置选项
   */
  static warning(message, options = {}) {
    return new ToastMessage(message, 'warning', options);
  }

  /**
   * 显示信息消息的静态方法
   * @param {String} message 消息内容
   * @param {Object} options 配置选项
   */
  static info(message, options = {}) {
    return new ToastMessage(message, 'info', options);
  }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToastMessage;
} else {
  window.ToastMessage = ToastMessage;
} 