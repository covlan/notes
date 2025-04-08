# 笔记应用 (Note App)

一个全功能的笔记管理系统，支持创建、编辑和管理笔记，包括分类、标签、收藏夹和回收站等功能，以及用户管理和笔记分享功能。

## 功能特点

- 用户注册和身份验证
- 创建、编辑和删除笔记
- 笔记分类和标签管理
- 收藏笔记功能
- 回收站功能
- 笔记分享功能
- 文件上传和管理
- 用户设置和个人资料管理
- 暗色模式支持
- 响应式设计，适配桌面和移动设备

## 技术栈

- **前端**：HTML, CSS, JavaScript
- **后端**：Node.js, Express
- **数据库**：MongoDB 
- **身份验证**：JWT (JSON Web Tokens)
- **文件上传**：Multer
- **容器化**：Docker, Docker Compose

## 项目结构
/
├── pages/ # 前端页面
├── src/ # 源代码
│ ├── middleware/ # Express中间件
│ ├── models/ # Mongoose数据模型
│ ├── routes/ # API路由
│ ├── controllers/ # 控制器
│ └── uploads/ # 文件上传目录
├── scripts/ # 工具脚本
├── app.js # 主应用入口 (Node.js/Express)
├── app.py # Flask应用入口 (可选)
├── docker-compose.yml # Docker Compose配置
├── Dockerfile # Docker构建文件
└── .env # 环境变量配置


## 开发指南

### 本地开发环境

#### 前提条件

- Node.js (v14+)
- MongoDB (v4.4+)
- npm 或 yarn

#### 步骤1：克隆仓库

```bash
git clone <仓库地址>
cd note-app
```

#### 步骤2：安装依赖

```bash
npm install
# 或
yarn install
```

#### 步骤3：配置环境变量

创建或编辑 `.env` 文件：

```bash
PORT=5660
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/note-app
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
FRONTEND_URL=http://localhost:5660
```


#### 步骤4：启动应用

```bash
# 处理HTML文件并启动应用
npm start
# 或
yarn start

# 开发模式（自动重启）
npm run dev
# 或
yarn dev
```

应用将在 http://localhost:5660 上运行。

## 部署指南

### 方式一：手动部署

#### 前提条件

- Node.js (v14+)
- MongoDB (v4.4+)
- PM2 (推荐用于生产环境进程管理)

#### 步骤1：准备环境

```bash
# 安装PM2
npm install -g pm2

# 克隆代码
git clone https://github.com/covlan/notes.git
cd webapp

# 安装依赖
npm install --production
```

#### 步骤2：配置环境变量

创建 `.env` 文件，添加生产环境配置：

```bash
PORT=5660
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/note-app
JWT_SECRET=<强密钥>
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
FRONTEND_URL=https://你的域名
```


#### 步骤3：启动应用

```bash
# 处理HTML文件
npm run process-html

# 使用PM2启动应用
pm2 start app.js --name "note-app"

# 设置开机自启
pm2 startup
pm2 save
```

### 方式二：Docker部署（推荐）

#### 前提条件

- [Docker](https://docs.docker.com/get-docker/) (v20+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2+)

#### 步骤1：准备环境

```bash
# 克隆代码
git clone <仓库地址>
cd note-app
```

#### 步骤2：配置环境变量

检查并根据需要修改 `.env` 文件：

```bash
PORT=5660
NODE_ENV=production
MONGODB_URI=mongodb://mongo:27017/note-app
JWT_SECRET=<强密钥>
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30
FRONTEND_URL=https://你的域名
```


#### 步骤3：使用Docker Compose部署

```bash
# 构建并启动容器
docker compose up -d

# 查看日志
docker compose logs -f
```

应用将在 http://localhost:5660 上运行（或根据你的配置在其他端口）。

#### Docker 部署说明

应用使用以下Docker容器：

1. **app** - Node.js应用容器
   - 基于Node.js 18 Alpine镜像
   - 暴露5660端口
   - 包含应用代码和依赖

2. **mongo** - MongoDB数据库容器
   - 使用官方MongoDB 6镜像
   - 数据持久化通过命名卷
   - 包含初始化脚本

#### 资源限制

默认配置中应用了以下资源限制：

- app服务: 0.5 CPU, 500MB 内存
- mongo服务: 0.3 CPU, 300MB 内存

可以根据实际需求在 `docker-compose.yml` 中调整这些限制。

#### 常用Docker命令

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

#### 一键部署脚本

项目提供了一键部署脚本 `docker-deploy.sh`，可以自动完成部署过程：

```bash
# 添加执行权限
chmod +x docker-deploy.sh

# 执行部署
./docker-deploy.sh
```

#### 自定义Docker配置

可以通过修改以下文件自定义Docker配置：

1. `Dockerfile` - 更改应用容器的构建方式
2. `docker-compose.yml` - 修改服务配置、添加新服务或调整资源限制
3. `.env` - 调整环境变量

## 系统维护

### 数据备份

#### MongoDB备份

```bash
# 使用Docker Compose进行备份
docker compose exec mongo sh -c 'mongodump --archive' > backup_$(date +%Y%m%d_%H%M%S).archive

# 恢复备份
docker compose exec -i mongo sh -c 'mongorestore --archive' < your_backup_file.archive
```

### 日志管理

应用日志可通过Docker Compose查看：

```bash
docker compose logs -f app
```

### 系统监控

建议使用以下工具监控Docker容器：

- Prometheus + Grafana
- Portainer
- Docker stats

## 故障排除

### 常见问题

1. **应用无法启动**
   - 检查MongoDB连接是否正常
   - 检查环境变量配置是否正确
   - 查看应用日志了解详细错误信息

2. **无法连接到数据库**
   - 确保MongoDB服务正在运行
   - 检查数据库连接URL是否正确
   - 确认MongoDB端口是否开放

3. **上传文件失败**
   - 检查uploads目录权限
   - 确认文件大小是否超过限制

## 许可证
   - MIT
