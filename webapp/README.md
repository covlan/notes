# 笔记应用

一个简单的笔记应用，支持创建、编辑和管理笔记，包括分类、添加到收藏夹和移动到回收站等功能。

## 功能特点

- 创建、编辑和删除笔记
- 笔记分类管理
- 收藏夹功能
- 回收站功能
- 暗色模式支持
- 响应式设计，适配桌面和移动设备

## 通用组件

为了提高代码重用性和简化开发，项目中实现了以下通用组件：

### 1. 笔记加载器 (NotesLoader)

一个通用组件，用于在不同页面（如仪表盘、回收站、分类页面、收藏夹等）加载和显示笔记数据。详细文档请参考：[笔记应用通用组件设计](docs/notes-loader.md)

### 2. 确认对话框 (ConfirmDialog)

一个用于显示确认操作对话框的通用组件，支持自定义样式、多种使用方式，并具有良好的响应式布局和键盘交互支持。

### 3. 提示消息 (ToastMessage)

一个用于显示临时提示消息的通用组件，支持多种提示类型、位置控制和自定义配置。

详细的组件API和使用示例请参考：[通用组件使用文档](docs/common-components.md)

## 组件演示

查看 [组件演示页面](pages/components-demo.html) 了解各个通用组件的实际使用效果。

## 技术栈

- 前端：HTML, CSS, JavaScript
- 存储：IndexedDB
- 图标：Font Awesome

## 项目结构

- `/pages` - 应用页面
  - `/component` - 通用组件
- `/css` - 样式文件
- `/js` - JavaScript 脚本
- `/docs` - 项目文档

## 开始使用

1. 克隆本仓库
2. 使用Web服务器（如Live Server）打开项目
3. 在浏览器中访问 `index.html` 开始使用

## 项目用途

- 创建和管理个人笔记
- 对笔记进行分类和标签管理
- 支持笔记分享功能
- 支持文件上传
- 用户个人设置管理

## 项目部署

### 方式一：本地开发环境

#### 安装依赖

```bash
npm install
```

#### 配置环境变量

创建 `.env` 文件，添加以下配置：

```
PORT=5660
MONGODB_URI=mongodb://localhost:27017/note-app
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
```

#### 启动应用

```bash
npm start
```

应用将在 http://localhost:5660 上运行。

### 方式二：Docker部署（推荐）

#### 前提条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

#### 步骤1：克隆仓库

```bash
git clone <仓库地址>
cd 笔记应用
```

#### 步骤2：Docker部署

使用提供的部署脚本一键部署：

```bash
./docker-deploy.sh
```

或者手动执行以下步骤：

1. 创建 `.env` 文件（可从 `.env.example` 复制）
2. 构建并启动容器：

```bash
docker compose up -d
```

应用将在 http://localhost:5660 上运行。

#### Docker相关命令

**查看容器状态**：
```bash
docker compose ps
```

**查看应用日志**：
```bash
docker compose logs -f app
```

**停止应用**：
```bash
docker compose down
```

**重启应用**：
```bash
docker compose restart
```

**完全删除应用（包括数据库数据）**：
```bash
docker compose down -v
```

## 自定义配置

可以通过修改 `docker-compose.yml` 或 `.env` 文件来自定义配置，如端口、数据库连接等。

主要环境变量：

- `PORT`: 应用端口
- `MONGODB_URI`: MongoDB连接URI
- `JWT_SECRET`: JWT加密密钥
- `JWT_EXPIRE`: JWT过期时间 

# 笔记应用通用组件设计

## NotesLoader 通用笔记加载组件

NotesLoader是一个通用的笔记加载组件，用于在不同页面加载、渲染和管理笔记数据。此组件提供了统一的接口和灵活的定制能力，确保在不同页面中能够保持一致的用户体验同时满足各页面的特定需求。

### 主要特性

- **统一的数据加载接口**：无需在每个页面重复编写笔记加载逻辑
- **缓存管理**：自动处理笔记数据缓存，提高加载性能
- **错误处理**：统一的错误处理和重试机制
- **自定义渲染**：支持每个页面自定义笔记渲染样式
- **页面特定按钮**：支持在不同页面添加特定的操作按钮（如回收站的恢复和永久删除按钮）

### 使用方法

#### 基本用法

```javascript
// 初始化NotesLoader实例
const notesLoader = new NotesLoader({
    containerSelector: '.notes-grid',  // 笔记容器选择器
    apiClient: window.api,             // API接口集合
    onLoadSuccess: handleSuccess,      // 加载成功回调
    onLoadError: handleError           // 加载错误回调
});

// 加载笔记
notesLoader.loadNotes({
    inTrash: false,                    // 不加载回收站中的笔记
    categoryId: null,                  // 不按分类过滤
    isStarred: false,                  // 不按收藏状态过滤
    forceRefresh: false                // 是否强制刷新(不使用缓存)
});
```

#### 自定义渲染函数

```javascript
const notesLoader = new NotesLoader({
    containerSelector: '.notes-grid',
    apiClient: window.api,
    renderFunction: (notes, container) => {
        // 自定义笔记渲染逻辑
        container.innerHTML = notes.map(note => `
            <div class="custom-note-card" data-id="${note.id}">
                <h3>${note.title}</h3>
                <p>${note.content.substring(0, 100)}...</p>
            </div>
        `).join('');
        
        // 添加事件监听等其他逻辑
    }
});
```

#### 页面特定按钮示例（回收站页面）

```javascript
const notesLoader = new NotesLoader({
    containerSelector: '.trash-notes',
    apiClient: window.api,
    actionsConfig: {
        showMoreButton: false,         // 不显示"更多"按钮
        clickable: false,              // 笔记不可点击
        additionalButtons: [           // 添加特定按钮
            {
                text: '恢复',
                icon: 'fas fa-undo',
                className: 'restore-btn',
                action: 'restore',
                onClick: (noteId) => restoreNote(noteId)
            },
            {
                text: '永久删除',
                icon: 'fas fa-times-circle',
                className: 'delete-btn',
                action: 'delete',
                onClick: (noteId) => deleteNote(noteId)
            }
        ]
    }
});
```

### 实例说明

#### 仪表盘页面

仪表盘页面使用通用组件加载普通笔记，支持笔记的点击打开和更多操作功能。

```javascript
const notesLoader = new NotesLoader({
    containerSelector: '.notes-grid',
    apiClient: window.api,
    onLoadSuccess: handleNotesLoaded,
    onLoadError: handleNotesError
});

notesLoader.loadNotes({
    inTrash: false
});
```

#### 回收站页面

回收站页面使用通用组件加载回收站中的笔记，不支持点击打开功能，但提供了恢复和永久删除操作。

```javascript
const notesLoader = new NotesLoader({
    containerSelector: '.trash-notes',
    apiClient: window.api,
    cacheExpiry: 2 * 60 * 1000,         // 回收站缓存时间更短
    actionsConfig: {
        showMoreButton: false,          // 不显示"更多"按钮
        clickable: false,               // 不可点击打开
        additionalButtons: [            // 自定义按钮
            // 恢复和永久删除按钮配置
        ]
    }
});
```

#### 分类页面

分类页面使用通用组件加载特定分类的笔记。

```javascript
notesLoader.loadNotes({
    categoryId: selectedCategoryId,
    inTrash: false,
    forceRefresh: true
});
```

#### 收藏页面

收藏页面使用通用组件加载收藏的笔记。

```javascript
notesLoader.loadNotes({
    isStarred: true,
    inTrash: false
});
```

### 组件配置选项

| 选项 | 类型 | 说明 |
|------|------|------|
| containerSelector | String | 笔记容器选择器 |
| apiClient | Object | API客户端实例 |
| renderFunction | Function | 自定义渲染函数 |
| onLoadSuccess | Function | 加载成功回调 |
| onLoadError | Function | 加载失败回调 |
| cacheExpiry | Number | 缓存过期时间(毫秒) |
| renderPageSpecificButtons | Function | 页面特定按钮渲染函数 |
| actionsConfig | Object | 笔记操作按钮配置 |

### 加载选项

| 选项 | 类型 | 说明 |
|------|------|------|
| inTrash | Boolean | 是否在回收站 |
| categoryId | String | 分类ID |
| tagId | String | 标签ID |
| isStarred | Boolean | 是否收藏 |
| isShared | Boolean | 是否分享 |
| searchQuery | String | 搜索关键词 |
| forceRefresh | Boolean | 是否强制刷新 |
| viewMode | String | 视图模式(grid/list) |

## 通用组件的优势

1. **代码复用**：避免在不同页面重复实现相同的功能
2. **一致性**：确保在所有页面中保持一致的用户体验
3. **可维护性**：集中维护核心功能，降低维护成本
4. **灵活性**：通过配置和回调支持不同页面的特定需求
5. **可扩展性**：可以方便地添加新功能，并在所有页面中使用 