# 笔记应用 - 前后端集成项目

这是一个完整的笔记应用，前端基于HTML/CSS/JavaScript构建，后端基于Node.js和Express构建。

## 项目结构

- `src/`: 后端代码目录
  - `controllers/`: API控制器
  - `models/`: 数据模型
  - `routes/`: API路由
  - `middleware/`: 中间件
  - `uploads/`: 上传文件存储目录
  - `index.js`: 后端API入口文件
- `pages/`: 前端代码目录
  - `css/`: 样式文件
  - `js/`: JavaScript文件
  - `*.html`: 页面文件
- `app.js`: 应用程序入口文件（集成前后端）
- `server.js`: 简单服务器文件
- `Dockerfile`: Docker镜像构建文件
- `docker-compose.yml`: Docker容器编排配置
- `docker-deploy.sh`: Docker部署脚本

## 快速开始

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

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

应用将在 http://localhost:5660 上运行。

### 方式二：Docker部署（推荐）

使用Docker Compose部署应用和数据库。

#### 前提条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- Docker 版本需支持 `docker compose` 命令

#### 步骤1：克隆仓库

```bash
git clone <仓库地址>
cd 笔记应用
```

#### 步骤2：使用部署脚本一键部署

```bash
./docker-deploy.sh
```

或者手动执行以下步骤：

1. 创建 `.env` 文件（可从 `.env.example` 复制）
2. 构建并启动容器：

```bash
docker compose up -d
```

#### 步骤3：访问应用

应用将在 http://localhost:5660 上运行

#### 查看日志

```bash
docker compose logs -f app
```

#### 停止应用

```bash
docker compose down
```

#### 完全删除应用（包括数据库数据）

```bash
docker compose down -v
```

## API接口

# 笔记应用API接口文档

本文档列出了笔记应用所需的所有后端API接口，供后端开发人员参考实现。

## 目录

- [用户认证](#用户认证)
- [笔记管理](#笔记管理)
- [分类管理](#分类管理)
- [标签管理](#标签管理)
- [分享管理](#分享管理)
- [文件管理](#文件管理)
- [设置管理](#设置管理)

## 用户认证

### 1. 用户注册

- **URL**: `/api/auth/register`
- **方法**: `POST`
- **描述**: 创建新用户账户
- **请求体**:
  ```json
  {
    "username": "用户名",
    "email": "用户邮箱",
    "password": "密码",
    "confirmPassword": "确认密码"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "注册成功",
    "user": {
      "id": "用户ID",
      "username": "用户名",
      "email": "用户邮箱",
      "createdAt": "创建时间"
    },
    "token": "JWT令牌"
  }
  ```

### 2. 用户登录

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **描述**: 用户登录认证
- **请求体**:
  ```json
  {
    "username": "用户名或邮箱",
    "password": "密码",
    "remember": true // 是否记住登录状态
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "登录成功",
    "user": {
      "id": "用户ID",
      "username": "用户名",
      "email": "用户邮箱",
      "displayName": "显示名称",
      "avatarUrl": "头像URL"
    },
    "token": "JWT令牌"
  }
  ```

### 3. 用户登出

- **URL**: `/api/auth/logout`
- **方法**: `POST`
- **描述**: 用户登出系统
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "已成功登出"
  }
  ```

### 4. 获取当前用户信息

- **URL**: `/api/auth/me`
- **方法**: `GET`
- **描述**: 获取当前登录用户信息
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "user": {
      "id": "用户ID",
      "username": "用户名",
      "email": "用户邮箱",
      "displayName": "显示名称",
      "avatarUrl": "头像URL",
      "bio": "个人简介",
      "phone": "电话号码",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
  ```

### 5. 忘记密码

- **URL**: `/api/auth/forgot-password`
- **方法**: `POST`
- **描述**: 发送密码重置邮件
- **请求体**:
  ```json
  {
    "email": "用户邮箱"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "密码重置邮件已发送"
  }
  ```

### 6. 重置密码

- **URL**: `/api/auth/reset-password`
- **方法**: `POST`
- **描述**: 重置用户密码
- **请求体**:
  ```json
  {
    "token": "重置密码令牌",
    "password": "新密码",
    "confirmPassword": "确认密码"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "密码重置成功"
  }
  ```

## 笔记管理

### 1. 创建笔记

- **URL**: `/api/notes`
- **方法**: `POST`
- **描述**: 创建新笔记
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "title": "笔记标题",
    "content": "笔记内容",
    "categoryId": "分类ID", // 可选
    "tags": ["标签1", "标签2"] // 可选
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "note": {
      "id": "笔记ID",
      "title": "笔记标题",
      "content": "笔记内容",
      "categoryId": "分类ID",
      "tags": ["标签1", "标签2"],
      "userId": "用户ID",
      "createdAt": "创建时间",
      "updatedAt": "更新时间",
      "starred": false,
      "inTrash": false
    }
  }
  ```

### 2. 获取笔记列表

- **URL**: `/api/notes`
- **方法**: `GET`
- **描述**: 获取用户的笔记列表
- **请求头**: `Authorization: Bearer {token}`
- **查询参数**:
  - `page`: 页码，默认1
  - `limit`: 每页数量，默认20
  - `sort`: 排序字段，默认`updatedAt`
  - `order`: 排序方式，`asc`或`desc`，默认`desc`
  - `category`: 分类ID，可选
  - `tag`: 标签ID，可选
  - `search`: 搜索关键词，可选
  - `starred`: 是否为星标笔记，可选
  - `trash`: 是否为回收站笔记，可选
- **响应**:
  ```json
  {
    "success": true,
    "notes": [
      {
        "id": "笔记ID",
        "title": "笔记标题",
        "content": "笔记内容摘要",
        "categoryId": "分类ID",
        "categoryName": "分类名称",
        "tags": [
          { "id": "标签ID", "name": "标签名称" }
        ],
        "createdAt": "创建时间",
        "updatedAt": "更新时间",
        "starred": false,
        "inTrash": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
  ```

### 3. 获取单个笔记

- **URL**: `/api/notes/:id`
- **方法**: `GET`
- **描述**: 获取单个笔记详情
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "note": {
      "id": "笔记ID",
      "title": "笔记标题",
      "content": "笔记内容",
      "categoryId": "分类ID",
      "categoryName": "分类名称",
      "tags": [
        { "id": "标签ID", "name": "标签名称" }
      ],
      "createdAt": "创建时间",
      "updatedAt": "更新时间",
      "starred": false,
      "inTrash": false
    }
  }
  ```

### 4. 更新笔记

- **URL**: `/api/notes/:id`
- **方法**: `PUT`
- **描述**: 更新现有笔记
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "title": "更新的标题",
    "content": "更新的内容",
    "categoryId": "分类ID", // 可选
    "tags": ["标签1", "标签2"] // 可选
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "note": {
      "id": "笔记ID",
      "title": "更新的标题",
      "content": "更新的内容",
      "categoryId": "分类ID",
      "tags": ["标签1", "标签2"],
      "updatedAt": "更新时间"
    }
  }
  ```

### 5. 星标笔记

- **URL**: `/api/notes/:id/star`
- **方法**: `POST`
- **描述**: 切换笔记的星标状态
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "starred": true // 或 false
  }
  ```

### 6. 移动笔记到回收站

- **URL**: `/api/notes/:id/trash`
- **方法**: `POST`
- **描述**: 将笔记移至回收站
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "笔记已移至回收站"
  }
  ```

### 7. 从回收站恢复笔记

- **URL**: `/api/notes/:id/restore`
- **方法**: `POST`
- **描述**: 从回收站恢复笔记
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "笔记已恢复"
  }
  ```

### 8. 永久删除笔记

- **URL**: `/api/notes/:id`
- **方法**: `DELETE`
- **描述**: 永久删除笔记
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "笔记已永久删除"
  }
  ```

### 9. 清空回收站

- **URL**: `/api/notes/empty-trash`
- **方法**: `DELETE`
- **描述**: 清空回收站中的所有笔记
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "回收站已清空"
  }
  ```

### 10. 保存Markdown文件

- **URL**: `/api/notes/save-markdown`
- **方法**: `POST`
- **描述**: 保存笔记的Markdown文件
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "fileName": "文件名",
    "content": "文件内容"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "filePath": "保存的文件路径"
  }
  ```

## 分类管理

### 1. 创建分类

- **URL**: `/api/categories`
- **方法**: `POST`
- **描述**: 创建新笔记分类
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "name": "分类名称",
    "description": "分类描述", // 可选
    "color": "#1a73e8" // 可选，颜色值
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "category": {
      "id": "分类ID",
      "name": "分类名称",
      "description": "分类描述",
      "color": "#1a73e8",
      "userId": "用户ID",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
  ```

### 2. 获取分类列表

- **URL**: `/api/categories`
- **方法**: `GET`
- **描述**: 获取用户的所有分类
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "categories": [
      {
        "id": "分类ID",
        "name": "分类名称",
        "description": "分类描述",
        "color": "#1a73e8",
        "count": 10, // 该分类下的笔记数量
        "createdAt": "创建时间",
        "updatedAt": "更新时间"
      }
    ]
  }
  ```

### 3. 获取单个分类

- **URL**: `/api/categories/:id`
- **方法**: `GET`
- **描述**: 获取单个分类详情
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "category": {
      "id": "分类ID",
      "name": "分类名称",
      "description": "分类描述",
      "color": "#1a73e8",
      "count": 10, // 该分类下的笔记数量
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
  ```

### 4. 更新分类

- **URL**: `/api/categories/:id`
- **方法**: `PUT`
- **描述**: 更新分类信息
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "name": "更新的名称",
    "description": "更新的描述",
    "color": "#ff5252"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "category": {
      "id": "分类ID",
      "name": "更新的名称",
      "description": "更新的描述",
      "color": "#ff5252",
      "updatedAt": "更新时间"
    }
  }
  ```

### 5. 删除分类

- **URL**: `/api/categories/:id`
- **方法**: `DELETE`
- **描述**: 删除分类
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "分类已删除"
  }
  ```

## 标签管理

### 1. 创建标签

- **URL**: `/api/tags`
- **方法**: `POST`
- **描述**: 创建新标签
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "name": "标签名称",
    "color": "#4a6bff" // 可选，颜色值
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "tag": {
      "id": "标签ID",
      "name": "标签名称",
      "color": "#4a6bff",
      "userId": "用户ID",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
  ```

### 2. 获取标签列表

- **URL**: `/api/tags`
- **方法**: `GET`
- **描述**: 获取用户的所有标签
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "tags": [
      {
        "id": "标签ID",
        "name": "标签名称",
        "color": "#4a6bff",
        "count": 5, // 使用该标签的笔记数量
        "createdAt": "创建时间",
        "updatedAt": "更新时间"
      }
    ]
  }
  ```

### 3. 更新标签

- **URL**: `/api/tags/:id`
- **方法**: `PUT`
- **描述**: 更新标签信息
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "name": "更新的标签名称",
    "color": "#2ecc71"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "tag": {
      "id": "标签ID",
      "name": "更新的标签名称",
      "color": "#2ecc71",
      "updatedAt": "更新时间"
    }
  }
  ```

### 4. 删除标签

- **URL**: `/api/tags/:id`
- **方法**: `DELETE`
- **描述**: 删除标签
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "标签已删除"
  }
  ```

## 分享管理

### 1. 分享笔记

- **URL**: `/api/shares`
- **方法**: `POST`
- **描述**: 创建笔记分享链接
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "noteId": "笔记ID",
    "shareType": "public", // 或 "private"，public为公开，private为私密需要密码访问
    "password": "访问密码", // 当shareType为private时需要
    "expiry": 7 // 可选，过期天数，0表示永不过期
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "share": {
      "id": "分享ID",
      "noteId": "笔记ID",
      "userId": "用户ID",
      "shareType": "public",
      "password": null, // 为private时显示已加密
      "shareLink": "分享链接",
      "expiry": "2023-06-30T00:00:00Z", // 过期时间
      "views": 0,
      "stars": 0,
      "sharedAt": "分享时间"
    }
  }
  ```

### 2. 获取分享列表

- **URL**: `/api/shares`
- **方法**: `GET`
- **描述**: 获取用户分享的所有笔记
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "shares": [
      {
        "id": "分享ID",
        "noteId": "笔记ID",
        "noteTitle": "笔记标题",
        "shareType": "public",
        "shareLink": "分享链接",
        "expiry": "2023-06-30T00:00:00Z",
        "views": 10,
        "stars": 5,
        "sharedAt": "分享时间"
      }
    ]
  }
  ```

### 3. 获取分享详情

- **URL**: `/api/shares/:id`
- **方法**: `GET`
- **描述**: 获取分享详情
- **请求头**: `Authorization: Bearer {token}`（如果是自己的分享）
- **响应**:
  ```json
  {
    "success": true,
    "share": {
      "id": "分享ID",
      "noteId": "笔记ID",
      "noteTitle": "笔记标题",
      "noteContent": "笔记内容",
      "userId": "用户ID",
      "username": "用户名",
      "shareType": "public",
      "shareLink": "分享链接",
      "expiry": "2023-06-30T00:00:00Z",
      "views": 10,
      "stars": 5,
      "sharedAt": "分享时间"
    }
  }
  ```

### 4. 访问分享链接

- **URL**: `/api/shares/access/:shareId`
- **方法**: `POST`
- **描述**: 访问分享链接，若为私密分享则需要提供密码
- **请求体**:
  ```json
  {
    "password": "访问密码" // 当为私密分享时需要
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "note": {
      "id": "笔记ID",
      "title": "笔记标题",
      "content": "笔记内容",
      "userId": "用户ID",
      "username": "用户名",
      "sharedAt": "分享时间"
    }
  }
  ```

### 5. 取消分享

- **URL**: `/api/shares/:id`
- **方法**: `DELETE`
- **描述**: 取消分享
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "分享已取消"
  }
  ```

## 文件管理

### 1. 上传文件

- **URL**: `/api/files/upload`
- **方法**: `POST`
- **描述**: 上传文件（图片、附件等）
- **请求头**: `Authorization: Bearer {token}`
- **请求体**: `multipart/form-data`
  - `file`: 文件数据
  - `type`: 文件类型，例如`image`, `attachment`
  - `noteId`: 关联的笔记ID（可选）
- **响应**:
  ```json
  {
    "success": true,
    "file": {
      "id": "文件ID",
      "fileName": "文件名",
      "fileType": "文件类型",
      "fileSize": 1024, // 文件大小（字节）
      "filePath": "文件路径",
      "url": "文件访问URL",
      "userId": "用户ID",
      "noteId": "笔记ID",
      "uploadedAt": "上传时间"
    }
  }
  ```

### 2. 获取文件列表

- **URL**: `/api/files`
- **方法**: `GET`
- **描述**: 获取用户上传的文件列表
- **请求头**: `Authorization: Bearer {token}`
- **查询参数**:
  - `type`: 文件类型，例如`image`, `attachment`（可选）
  - `noteId`: 关联的笔记ID（可选）
- **响应**:
  ```json
  {
    "success": true,
    "files": [
      {
        "id": "文件ID",
        "fileName": "文件名",
        "fileType": "文件类型",
        "fileSize": 1024,
        "url": "文件访问URL",
        "noteId": "笔记ID",
        "uploadedAt": "上传时间"
      }
    ]
  }
  ```

### 3. 删除文件

- **URL**: `/api/files/:id`
- **方法**: `DELETE`
- **描述**: 删除文件
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "message": "文件已删除"
  }
  ```

## 设置管理

### 1. 获取用户设置

- **URL**: `/api/settings`
- **方法**: `GET`
- **描述**: 获取用户设置
- **请求头**: `Authorization: Bearer {token}`
- **响应**:
  ```json
  {
    "success": true,
    "settings": {
      "theme": "light", // 或 "dark"
      "language": "zh-CN",
      "fontSize": 14,
      "editorFontFamily": "默认字体",
      "autoSave": true,
      "defaultView": "grid", // 或 "list"
      "sidebarCollapsed": false,
      "notificationEnabled": true
    }
  }
  ```

### 2. 更新用户设置

- **URL**: `/api/settings`
- **方法**: `PUT`
- **描述**: 更新用户设置
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "theme": "dark",
    "language": "en-US",
    "fontSize": 16,
    "editorFontFamily": "Courier New",
    "autoSave": true,
    "defaultView": "list",
    "sidebarCollapsed": true,
    "notificationEnabled": false
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "settings": {
      "theme": "dark",
      "language": "en-US",
      "fontSize": 16,
      "editorFontFamily": "Courier New",
      "autoSave": true,
      "defaultView": "list",
      "sidebarCollapsed": true,
      "notificationEnabled": false
    }
  }
  ```

### 3. 更新用户个人资料

- **URL**: `/api/users/profile`
- **方法**: `PUT`
- **描述**: 更新用户个人资料
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "username": "新用户名",
    "email": "新邮箱",
    "displayName": "显示名称",
    "phone": "电话号码",
    "bio": "个人简介"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "user": {
      "id": "用户ID",
      "username": "新用户名",
      "email": "新邮箱",
      "displayName": "显示名称",
      "phone": "电话号码",
      "bio": "个人简介",
      "updatedAt": "更新时间"
    }
  }
  ```

### 4. 更改密码

- **URL**: `/api/users/change-password`
- **方法**: `PUT`
- **描述**: 修改用户密码
- **请求头**: `Authorization: Bearer {token}`
- **请求体**:
  ```json
  {
    "currentPassword": "当前密码",
    "newPassword": "新密码",
    "confirmPassword": "确认新密码"
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "message": "密码已更新"
  }
  ```

### 5. 上传头像

- **URL**: `/api/users/avatar`
- **方法**: `POST`
- **描述**: 上传用户头像
- **请求头**: `Authorization: Bearer {token}`
- **请求体**: `multipart/form-data`
  - `avatar`: 头像图片文件
- **响应**:
  ```json
  {
    "success": true,
    "avatarUrl": "头像URL"
  }
  ```

## 系统设置（管理员）

### 1. 获取系统设置

- **URL**: `/api/admin/settings`
- **方法**: `GET`
- **描述**: 获取系统设置
- **请求头**: `Authorization: Bearer {token}` (管理员权限)
- **响应**:
  ```json
  {
    "success": true,
    "settings": {
      "allowRegistration": true,
      "sessionLifetime": 24, // 小时
      "passwordMinLength": 8,
      "loginAttemptLimit": 5,
      "lockoutDuration": 30, // 分钟
      "storageLimit": 1024, // MB
      "attachmentSizeLimit": 10 // MB
    }
  }
  ```

### 2. 更新系统设置

- **URL**: `/api/admin/settings`
- **方法**: `PUT`
- **描述**: 更新系统设置
- **请求头**: `Authorization: Bearer {token}` (管理员权限)
- **请求体**:
  ```json
  {
    "allowRegistration": false,
    "sessionLifetime": 8,
    "passwordMinLength": 10,
    "loginAttemptLimit": 3,
    "lockoutDuration": 60,
    "storageLimit": 2048,
    "attachmentSizeLimit": 20
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "settings": {
      "allowRegistration": false,
      "sessionLifetime": 8,
      "passwordMinLength": 10,
      "loginAttemptLimit": 3,
      "lockoutDuration": 60,
      "storageLimit": 2048,
      "attachmentSizeLimit": 20
    }
  }
  ```
