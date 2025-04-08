# 组件目录说明文档

本文档提供了笔记平台前端项目中 `component` 目录下各组件的详细说明，帮助开发者理解各组件的功能、用途和调用方式。

## 组件概览

| 组件文件名 | 主要功能 | 调用方式 |
|------------|----------|----------|
| api.js | API接口调用封装 | 全局引用 |
| confirm-dialog.js | 确认对话框组件 | 实例化 |
| content-header.js | 内容头部组件 | 实例化 |
| dashboard.js | 仪表盘页面控制器 | 页面引用 |
| note-actions-menu.js | 笔记操作菜单组件 | 实例化 |
| note-editor-modal.js | 笔记编辑器模态框组件 | 页面引用 |
| notes-loader.js | 笔记数据加载器 | 全局引用 |
| sidebar-menu.js | 侧边栏导航菜单组件 | 实例化 |
| site-info.js | 站点信息加载器 | 页面引用 |
| toast-message.js | 消息提示组件 | 静态调用 |

## 详细组件说明

### api.js

**功能**: 封装所有与后端API的通信接口，处理请求、响应和错误。

**主要方法**:
- `login(username, password)` - 用户登录
- `register(userData)` - 用户注册
- `getNotes(filters)` - 获取笔记列表
- `getNoteById(id)` - 获取单个笔记
- `createNote(noteData)` - 创建笔记
- `updateNote(id, noteData)` - 更新笔记
- `deleteNote(id)` - 删除笔记
- `trashNote(id)` - 将笔记移至回收站
- `restoreNote(id)` - 从回收站恢复笔记

**使用示例**:
```javascript
// 引入API
// <script src="component/api.js"></script>

// 登录
api.login(username, password)
  .then(response => {
    if (response.success) {
      // 登录成功
    }
  });

// 获取笔记
api.getNotes({inTrash: false})
  .then(response => {
    if (response.success) {
      const notes = response.notes;
      // 处理笔记数据
    }
  });
```

### confirm-dialog.js

**功能**: 提供可自定义的确认对话框，支持多种样式和交互方式。

**初始化选项**:
- `title` - 对话框标题
- `message` - 对话框内容
- `confirmText` - 确认按钮文本
- `cancelText` - 取消按钮文本
- `type` - 对话框类型 (info/warning/error/success)
- `onConfirm` - 确认回调函数
- `onCancel` - 取消回调函数

**使用示例**:
```javascript
// 引入组件
// <script src="component/confirm-dialog.js"></script>

// 创建并显示确认对话框
const dialog = new ConfirmDialog({
  title: '确认删除',
  message: '确定要删除这个笔记吗？此操作不可撤销。',
  confirmText: '删除',
  cancelText: '取消',
  type: 'warning',
  onConfirm: () => {
    // 处理确认操作
  },
  onCancel: () => {
    // 处理取消操作
  }
});

dialog.show();
```

### content-header.js

**功能**: 页面内容头部组件，包含标题、视图切换按钮、刷新按钮和用户菜单。

**初始化选项**:
- `containerId` - 容器元素ID
- `title` - 页面标题
- `showViewToggle` - 是否显示视图切换按钮
- `showRefreshBtn` - 是否显示刷新按钮
- `hideOnMobile` - 是否在移动端隐藏
- `onRefresh` - 刷新按钮点击回调
- `onViewChange` - 视图切换回调

**使用示例**:
```javascript
// 引入组件
// <script src="component/content-header.js"></script>

// 初始化内容头部
const contentHeader = new ContentHeader({
  containerId: 'contentHeader',
  title: '我的笔记',
  showViewToggle: true,
  showRefreshBtn: true,
  onRefresh: () => loadNotes(),
  onViewChange: (view) => switchView(view)
});

// 更新标题
contentHeader.setTitle('收藏笔记');
```

### dashboard.js

**功能**: 仪表盘页面的核心控制器，负责页面初始化、笔记列表加载、笔记操作处理等。

**主要方法**:
- `loadDashboardNotes(forceRefresh)` - 加载仪表盘笔记
- `renderNoteCard(note)` - 渲染笔记卡片
- `renderNoteListItem(note)` - 渲染笔记列表项
- `trashNote(noteId)` - 将笔记移至回收站

**使用示例**:
```javascript
// 引入控制器
// <script src="component/dashboard.js"></script>

// 手动刷新笔记列表
window.loadDashboardNotes(true);

// 调用删除笔记函数
window.trashNote('note-id-123');
```

### note-actions-menu.js

**功能**: 笔记操作菜单组件，提供笔记的各种操作选项。

**初始化选项**:
- `menuId` - 菜单元素ID
- `overlayId` - 遮罩层元素ID
- `menuItems` - 菜单项配置
- `onMenuItemClick` - 菜单项点击回调

**使用示例**:
```javascript
// 引入组件
// <script src="component/note-actions-menu.js"></script>

// 创建笔记操作菜单
const noteActionsMenu = new NoteActionsMenu({
  menuId: 'noteActionsMenu',
  overlayId: 'menuOverlay',
  onMenuItemClick: (action, noteId) => {
    // 处理菜单操作
    switch (action) {
      case 'edit':
        openNoteEditor(noteId);
        break;
      case 'trash':
        trashNote(noteId);
        break;
      // 其他操作...
    }
  }
});

// 显示菜单
noteActionsMenu.show({x: 100, y: 100}, 'note-id-123');
```

### note-editor-modal.js

**功能**: 笔记编辑器模态框组件，提供笔记创建和编辑界面。

**主要方法**:
- `init(noteId)` - 初始化编辑器
- `loadNote(noteId)` - 加载笔记数据
- `saveNote()` - 保存笔记
- `close()` - 关闭编辑器

**使用示例**:
```javascript
// 引入组件
// <script src="component/note-editor-modal.js"></script>

// 打开编辑器创建新笔记
window.openNoteEditor();

// 打开编辑器编辑现有笔记
window.openNoteEditor('note-id-123');
```

### notes-loader.js

**功能**: 笔记数据加载器，管理笔记数据的获取、缓存和处理。

**主要方法**:
- `loadNotes(options)` - 加载笔记
- `loadStarredNotes()` - 加载收藏笔记
- `loadTrashNotes()` - 加载回收站笔记
- `forceRefreshAllCaches()` - 强制刷新所有缓存

**使用示例**:
```javascript
// 引入组件
// <script src="component/notes-loader.js"></script>

// 创建加载器实例
const notesLoader = new NotesLoader();

// 加载笔记
notesLoader.loadNotes({inTrash: false})
  .then(notes => {
    // 处理笔记数据
  });

// 强制刷新缓存
notesLoader.forceRefreshAllCaches();
```

### sidebar-menu.js

**功能**: 侧边栏导航菜单组件，提供应用的主要导航功能。

**初始化选项**:
- `containerId` - 容器元素ID
- `menuItems` - 菜单项配置
- `activeItem` - 当前活动项
- `onItemClick` - 菜单项点击回调

**使用示例**:
```javascript
// 引入组件
// <script src="component/sidebar-menu.js"></script>

// 初始化侧边栏菜单
const sidebarMenu = new SidebarMenu({
  containerId: 'sidebar',
  activeItem: 'my-notes',
  onItemClick: (itemId) => {
    // 处理菜单项点击
    switch (itemId) {
      case 'my-notes':
        window.location.href = 'dashboard.html';
        break;
      // 其他菜单项...
    }
  }
});

// 更新菜单项
sidebarMenu.updateMenuItems([
  { id: 'my-notes', icon: 'fas fa-sticky-note', text: '我的笔记' },
  { id: 'starred', icon: 'fas fa-star', text: '收藏笔记' }
]);
```

### site-info.js

**功能**: 站点信息加载器，负责获取和管理站点基本信息。

**主要方法**:
- `loadSiteInfo()` - 加载站点信息
- `updateSiteTitle(title)` - 更新站点标题
- `getSiteInfo()` - 获取站点信息

**使用示例**:
```javascript
// 引入组件
// <script src="component/site-info.js"></script>

// 加载站点信息
SiteInfo.loadSiteInfo()
  .then(info => {
    // 使用站点信息
    document.title = info.title;
  });
```

### toast-message.js

**功能**: 消息提示组件，用于显示各种类型的提示消息。

**静态方法**:
- `success(message, options)` - 显示成功提示
- `error(message, options)` - 显示错误提示
- `warning(message, options)` - 显示警告提示
- `info(message, options)` - 显示信息提示

**使用示例**:
```javascript
// 引入组件
// <script src="component/toast-message.js"></script>

// 显示成功提示
ToastMessage.success('操作成功！', {
  duration: 3000,
  position: 'top-right'
});

// 显示错误提示
ToastMessage.error('操作失败，请重试', {
  duration: 5000
});
```

## 组件间的依赖关系

- `dashboard.js` 依赖 `api.js`、`notes-loader.js`、`toast-message.js`
- `note-actions-menu.js` 依赖 `api.js`、`toast-message.js`
- `content-header.js` 依赖 `api.js`
- `note-editor-modal.js` 依赖 `api.js`、`toast-message.js`

## 组件引入顺序建议

在HTML页面中引入组件时，建议按以下顺序引入：

1. 核心工具: `api.js`, `site-info.js`
2. 通用组件: `toast-message.js`, `confirm-dialog.js`
3. 数据加载器: `notes-loader.js`
4. 界面组件: `sidebar-menu.js`, `content-header.js`, `note-actions-menu.js`
5. 页面控制器: `dashboard.js`, `note-editor-modal.js`

## 开发指南

1. 保持组件的独立性和可复用性
2. 组件接口参数应当文档化
3. 统一错误处理和日志记录方式
4. 对于复杂组件，建议创建单独的使用说明文档
5. 遵循项目的样式指南和组件设计规范
6. 添加合适的DEBUG日志，便于追踪问题 