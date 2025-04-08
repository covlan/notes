# 通用组件使用文档

本文档详细介绍了系统中两个核心通用组件的使用方法：确认对话框和Toast提示消息组件。

## 通用确认对话框 (ConfirmDialog)

`ConfirmDialog` 是一个用于显示确认操作对话框的通用组件，支持自定义样式、多种使用方式，并具有良好的响应式布局和键盘交互支持。

### 基本用法

#### 使用静态方法（最简单）

```javascript
// 简单确认对话框
ConfirmDialog.confirm('标题', '确认消息内容', function(confirmed) {
    if (confirmed) {
        // 用户点击了确认按钮
        console.log('用户确认了操作');
    } else {
        // 用户点击了取消按钮或点击背景关闭了对话框
        console.log('用户取消了操作');
    }
});

// 危险操作确认对话框（红色确认按钮）
ConfirmDialog.danger('删除确认', '确定要删除吗？此操作不可恢复！', function(confirmed) {
    if (confirmed) {
        // 执行删除操作
    }
});
```

#### Promise 方式使用（推荐）

```javascript
// 使用 async/await 处理确认结果
async function handleAction() {
    try {
        const result = await ConfirmDialog.confirm('保存确认', '是否保存当前更改？');
        
        if (result) {
            // 用户确认了操作
            console.log('保存操作');
        } else {
            // 用户取消了操作
            console.log('取消保存');
        }
    } catch (err) {
        console.error('对话框错误:', err);
    }
}
```

#### 使用实例方法（灵活定制）

```javascript
// 创建自定义确认框实例
const dialog = new ConfirmDialog({
    confirmButtonText: '发布',
    cancelButtonText: '继续编辑',
    confirmButtonClass: 'confirm-btn primary',
    closeOnBackdrop: false
});

// 显示对话框
dialog.show('发布确认', '确定要发布此文章吗？', {
    // 此处可传递额外选项覆盖实例选项
}, function(confirmed) {
    if (confirmed) {
        // 执行发布操作
    }
});
```

### API 参考

#### 构造函数选项

```javascript
const dialog = new ConfirmDialog({
    confirmButtonText: '确认',      // 确认按钮文本
    cancelButtonText: '取消',       // 取消按钮文本
    confirmButtonClass: 'confirm-btn primary', // 确认按钮CSS类
    cancelButtonClass: 'cancel-btn',    // 取消按钮CSS类
    onConfirm: null,                    // 确认回调
    onCancel: null,                     // 取消回调
    closeOnBackdrop: true,              // 点击背景是否关闭对话框
});
```

#### 实例方法

- **show(title, message, options, callback)**：显示确认对话框
  - `title`：对话框标题
  - `message`：对话框内容
  - `options`：（可选）配置选项，会覆盖实例选项
  - `callback`：（可选）确认回调函数，如果未提供则返回Promise
  - 返回：如果未提供回调，返回Promise对象

- **close()**：关闭对话框

#### 静态方法

- **ConfirmDialog.confirm(title, message, callback)**：显示确认对话框的快捷方法
- **ConfirmDialog.danger(title, message, callback)**：显示危险操作确认对话框的快捷方法

### 键盘交互

- **Enter**：触发确认按钮
- **Escape**：触发取消按钮

### 样式自定义

组件内置了响应式样式，并且会跟随系统的深色/浅色模式。如果需要进一步自定义样式，可以覆盖以下CSS变量：

```css
:root {
  --card-bg: #ffffff;               /* 对话框背景色 */
  --text-color: #333;               /* 文本颜色 */
  --text-muted: #666;               /* 次要文本颜色 */
  --primary-color: #1a73e8;         /* 主色调 */
  --primary-color-hover: #1765cc;   /* 主色调悬停 */
  --danger-color: #ea4335;          /* 危险色调 */
  --danger-color-hover: #d33426;    /* 危险色调悬停 */
  --btn-primary-bg: #1a73e8;        /* 主按钮背景 */
  --btn-primary-text: white;        /* 主按钮文本 */
  --btn-secondary-bg: #f0f0f0;      /* 次要按钮背景 */
  --btn-secondary-text: #333;       /* 次要按钮文本 */
}

.dark-mode {
  --card-bg: #2d2d2d;
  --text-color: #eee;
  --text-muted: #bbb;
  --btn-secondary-bg: #444;
  --btn-secondary-text: #eee;
  --btn-secondary-hover: #555;
}
```

## 通用提示消息 (ToastMessage)

`ToastMessage` 是一个用于显示临时提示消息的通用组件，支持多种提示类型、位置控制和自定义配置。

### 基本用法

#### 使用静态方法（最简单）

```javascript
// 成功提示
ToastMessage.success('操作已成功完成！');

// 错误提示
ToastMessage.error('操作失败，请稍后重试！');

// 信息提示
ToastMessage.info('系统将在30分钟后进行维护');

// 警告提示
ToastMessage.warning('您的会话即将过期，请及时保存');
```

#### 使用实例方法（灵活定制）

```javascript
// 创建自定义提示实例
const toast = new ToastMessage({
    duration: 5000,           // 显示5秒
    position: 'bottom',       // 底部显示
    closeButton: true,        // 显示关闭按钮
    animationType: 'fade'     // 淡入淡出动画
});

// 显示自定义提示
toast.show('这是一个带关闭按钮的自定义提示', 'info');

// 成功提示
toast.show('数据已保存', 'success');
```

### API 参考

#### 构造函数选项

```javascript
const toast = new ToastMessage({
    duration: 3000,          // 消息显示时长(毫秒)，0表示不自动关闭
    position: 'center',      // 消息显示位置：'center', 'top', 'bottom'
    closeButton: false,      // 是否显示关闭按钮
    animationType: 'fade'    // 动画类型：'fade', 'slide'
});
```

#### 实例方法

- **show(message, type, options)**：显示提示消息
  - `message`：提示消息内容
  - `type`：（可选）提示类型，可选值：'success', 'error', 'info', 'warning'，默认为'info'
  - `options`：（可选）配置选项，会覆盖实例选项
  - 返回：创建的Toast元素

- **close(toast)**：关闭提示消息
  - `toast`：要关闭的Toast元素，通常是show方法的返回值

#### 静态方法

- **ToastMessage.success(message, options)**：显示成功提示的快捷方法
- **ToastMessage.error(message, options)**：显示错误提示的快捷方法
- **ToastMessage.info(message, options)**：显示信息提示的快捷方法
- **ToastMessage.warning(message, options)**：显示警告提示的快捷方法

### 样式自定义

组件内置了响应式样式，并且会跟随系统的深色/浅色模式。如果需要进一步自定义样式，可以覆盖以下CSS变量：

```css
:root {
  --toast-bg: #ffffff;              /* 提示背景色 */
  --toast-text: #333;               /* 提示文本颜色 */
  --success-color: #34a853;         /* 成功色调 */
  --danger-color: #ea4335;          /* 错误色调 */
  --info-color: #4285f4;            /* 信息色调 */
  --warning-color: #fbbc05;         /* 警告色调 */
}

.dark-mode {
  --toast-bg: #2d2d2d;
  --toast-text: #eee;
}
```

## 组件示例

您可以查看 [components-demo.html](../pages/components-demo.html) 页面，了解这两个组件的实际使用效果和代码示例。

## 最佳实践

### 确认对话框

1. **使用Promise API**：优先使用Promise方式处理用户交互，代码更清晰简洁。
2. **危险操作使用danger**：对于删除等危险操作，优先使用`ConfirmDialog.danger`方法，使用红色按钮提醒用户。
3. **提供明确的操作说明**：在对话框标题和内容中清楚说明操作的具体内容和可能的后果。

### 提示消息

1. **使用正确的提示类型**：根据消息性质选择合适的类型，如成功操作用success，警告用warning等。
2. **简短明了**：保持提示消息简洁清晰，通常不超过20个字。
3. **避免频繁提示**：避免短时间内显示多个提示，可能导致用户体验不佳。
4. **重要消息增加显示时间**：对于重要信息，可以适当增加显示时间或添加关闭按钮。

## 注意事项

1. 这些组件依赖于Font Awesome图标库，确保在使用前引入：
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   ```

2. 组件使用了CSS变量进行样式定制，在使用时请注意浏览器兼容性。

3. 在移动设备上，组件会自动调整样式以适应小屏幕。 