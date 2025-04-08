# 笔记应用通用组件设计

## 笔记加载器 (NotesLoader)

`NotesLoader` 是一个通用组件，专门用于在笔记应用的不同页面（如仪表盘、回收站、分类页面和收藏夹等）加载和显示笔记数据，确保在不同页面中维持一致的用户体验和数据处理逻辑。

### 主要特性

1. **统一的数据加载接口**：提供一致的方法来加载笔记，无论是从哪个页面或基于什么条件加载。
2. **缓存管理**：支持缓存数据，减少重复请求，提高应用性能。
3. **错误处理**：统一处理加载错误，提供友好的用户反馈。
4. **自定义渲染**：允许页面自定义笔记卡片的渲染方式，以适应不同页面的需求。
5. **页面专属按钮**：支持为不同页面配置特定的操作按钮，如回收站页面的恢复和永久删除按钮。

### 基本用法

#### 初始化加载器

```javascript
// 初始化笔记加载器实例
const notesLoader = new NotesLoader({
    // 配置选项
    container: document.getElementById('notes-container'),
    emptyMessage: '没有找到笔记',
    errorMessage: '加载笔记时出错',
    renderNoteCard: customRenderFunction,  // 可选的自定义渲染函数
    pageButtons: [],  // 页面特定的按钮配置
});
```

#### 加载笔记

```javascript
// 基本加载
notesLoader.loadNotes({
    inTrash: false,  // 是否加载回收站中的笔记
    forceRefresh: false,  // 是否强制刷新，忽略缓存
});

// 加载分类下的笔记
notesLoader.loadNotes({
    categoryId: 'category-123',
    inTrash: false,
});

// 加载收藏夹中的笔记
notesLoader.loadNotes({
    starred: true,
    inTrash: false,
});

// 使用回调函数处理加载结果
notesLoader.loadNotes(
    { inTrash: true },
    function(notes) {
        console.log('成功加载了', notes.length, '条笔记');
    },
    function(error) {
        console.error('加载失败:', error);
    }
);
```

### 自定义渲染

```javascript
// 自定义笔记卡片渲染函数
function customRenderNoteCard(note, container, pageButtons) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
        <h3>${note.title || '无标题笔记'}</h3>
        <p>${note.content || ''}</p>
        <div class="note-footer">
            <span class="note-date">${new Date(note.updatedAt).toLocaleString()}</span>
            <div class="note-actions"></div>
        </div>
    `;
    
    // 添加页面特定按钮
    const actionsContainer = card.querySelector('.note-actions');
    if (pageButtons && pageButtons.length) {
        pageButtons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = button.className || '';
            btn.innerHTML = button.icon ? `<i class="${button.icon}"></i>` : button.text;
            btn.title = button.text;
            btn.onclick = (e) => {
                e.stopPropagation();
                button.action(note);
            };
            actionsContainer.appendChild(btn);
        });
    }
    
    // 添加卡片点击事件
    card.addEventListener('click', () => {
        // 打开笔记详情
        window.location.href = `note-detail.html?id=${note.id}`;
    });
    
    container.appendChild(card);
    return card;
}
```

### 页面特定按钮配置

不同页面可以为笔记卡片配置特定的操作按钮：

#### 回收站页面按钮

```javascript
const trashPageButtons = [
    {
        text: '恢复',
        icon: 'fas fa-trash-restore',
        className: 'btn-restore',
        action: function(note) {
            // 恢复笔记
            restoreNote(note.id)
                .then(() => {
                    notesLoader.loadNotes({ inTrash: true, forceRefresh: true });
                })
                .catch(error => {
                    console.error('恢复失败:', error);
                });
        }
    },
    {
        text: '永久删除',
        icon: 'fas fa-trash-alt',
        className: 'btn-delete danger',
        action: function(note) {
            // 确认后永久删除
            if (confirm('确定要永久删除该笔记吗？此操作不可恢复！')) {
                deleteNotePermanently(note.id)
                    .then(() => {
                        notesLoader.loadNotes({ inTrash: true, forceRefresh: true });
                    })
                    .catch(error => {
                        console.error('删除失败:', error);
                    });
            }
        }
    }
];

// 使用页面特定按钮初始化笔记加载器
const trashNotesLoader = new NotesLoader({
    container: document.getElementById('trash-notes-container'),
    emptyMessage: '回收站为空',
    errorMessage: '加载回收站笔记时出错',
    pageButtons: trashPageButtons
});
```

#### 仪表盘页面按钮

```javascript
const dashboardPageButtons = [
    {
        text: '编辑',
        icon: 'fas fa-edit',
        className: 'btn-edit',
        action: function(note) {
            // 打开编辑页面
            window.location.href = `edit-note.html?id=${note.id}`;
        }
    },
    {
        text: '移到回收站',
        icon: 'fas fa-trash',
        className: 'btn-trash',
        action: function(note) {
            // 移动到回收站
            moveNoteToTrash(note.id)
                .then(() => {
                    notesLoader.loadNotes({ forceRefresh: true });
                })
                .catch(error => {
                    console.error('移动失败:', error);
                });
        }
    },
    {
        text: note.starred ? '取消收藏' : '收藏',
        icon: note.starred ? 'fas fa-star' : 'far fa-star',
        className: 'btn-star',
        action: function(note) {
            // 切换收藏状态
            toggleStarNote(note.id, !note.starred)
                .then(() => {
                    notesLoader.loadNotes({ forceRefresh: true });
                })
                .catch(error => {
                    console.error('操作失败:', error);
                });
        }
    }
];
```

### API 参考

#### 构造函数选项

`NotesLoader` 构造函数接受以下配置选项：

| 选项 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `container` | Element | 笔记卡片的容器元素 | 必填 |
| `emptyMessage` | String | 无笔记时显示的消息 | '没有找到笔记' |
| `errorMessage` | String | 加载错误时显示的消息 | '加载笔记时出错' |
| `renderNoteCard` | Function | 自定义笔记卡片渲染函数 | 内置渲染函数 |
| `pageButtons` | Array | 页面特定按钮配置 | [] |
| `onNoteClick` | Function | 点击笔记卡片的回调函数 | null |

#### 加载选项

`loadNotes` 方法接受以下加载选项：

| 选项 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `inTrash` | Boolean | 是否加载回收站中的笔记 | false |
| `categoryId` | String | 按分类ID过滤笔记 | null |
| `starred` | Boolean | 是否只加载收藏的笔记 | null |
| `forceRefresh` | Boolean | 是否强制刷新，忽略缓存 | false |

## 各页面实现示例

### 回收站页面

```javascript
// 回收站页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 按钮配置
    const trashPageButtons = [
        {
            text: '恢复',
            icon: 'fas fa-trash-restore',
            className: 'btn-restore',
            action: function(note) {
                // 恢复笔记实现...
            }
        },
        {
            text: '永久删除',
            icon: 'fas fa-trash-alt',
            className: 'btn-delete danger',
            action: function(note) {
                // 永久删除实现...
            }
        }
    ];
    
    // 初始化加载器
    const notesLoader = new NotesLoader({
        container: document.getElementById('notes-container'),
        emptyMessage: '回收站为空',
        errorMessage: '加载回收站笔记时出错',
        pageButtons: trashPageButtons
    });
    
    // 加载回收站笔记
    notesLoader.loadNotes({ inTrash: true });
    
    // 绑定刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', function() {
        notesLoader.loadNotes({ inTrash: true, forceRefresh: true });
    });
});
```

### 分类页面

```javascript
// 分类页面初始化
function showCategoryNotes(categoryId, categoryName) {
    // 按钮配置
    const categoryPageButtons = [
        // 编辑按钮...
        // 移到回收站按钮...
        // 切换收藏按钮...
    ];
    
    // 初始化或复用加载器
    if (!window.notesLoader) {
        window.notesLoader = new NotesLoader({
            container: document.getElementById('category-notes-container'),
            emptyMessage: '该分类下没有笔记',
            errorMessage: '加载分类笔记时出错',
            pageButtons: categoryPageButtons
        });
    }
    
    // 更新分类标题
    document.getElementById('category-title').textContent = categoryName || '未命名分类';
    
    // 显示加载中状态
    document.getElementById('category-notes-container').innerHTML = '<div class="loading">加载中...</div>';
    
    // 加载分类下的笔记
    window.notesLoader.loadNotes({
        categoryId: categoryId,
        inTrash: false,
        forceRefresh: true
    });
}
```

### 收藏夹页面

```javascript
// 收藏夹页面初始化
document.addEventListener('DOMContentLoaded', function() {
    // 按钮配置
    const starredPageButtons = [
        // 编辑按钮...
        // 移到回收站按钮...
        // 取消收藏按钮...
    ];
    
    // 初始化加载器
    const notesLoader = new NotesLoader({
        container: document.getElementById('starred-notes-container'),
        emptyMessage: '收藏夹为空',
        errorMessage: '加载收藏笔记时出错',
        pageButtons: starredPageButtons
    });
    
    // 加载收藏笔记
    loadStarredNotes();
    
    // 绑定刷新按钮
    document.getElementById('refresh-starred-btn').addEventListener('click', function() {
        loadStarredNotes(true);
    });
    
    function loadStarredNotes(forceRefresh = false) {
        // 显示加载中状态
        if (!notesLoader.isLoading) {
            document.getElementById('starred-notes-container').innerHTML = '<div class="loading">加载中...</div>';
        }
        
        // 加载收藏笔记
        notesLoader.loadNotes({
            starred: true,
            inTrash: false,
            forceRefresh: forceRefresh
        });
    }
});
```

## 最佳实践

1. **缓存管理**：对于不太可能变化的数据，利用缓存减少不必要的加载。
2. **错误处理**：始终提供用户友好的错误消息，并提供重试选项。
3. **加载状态**：在加载过程中显示加载指示器，提高用户体验。
4. **按需加载**：仅在用户访问相关页面时加载数据，不要预加载可能不需要的数据。
5. **统一交互模式**：保持所有页面的交互模式一致，如点击笔记打开详情，点击按钮执行操作等。

## 总结

`NotesLoader` 组件提高了代码重用性，简化了不同页面笔记加载的实现，同时保留了每个页面的特定功能需求。通过统一的加载接口和自定义渲染，既确保了一致的用户体验，又为不同页面提供了足够的灵活性。 