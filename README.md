# 笔记应用

支持Docker部署
这是一个基于Node.js、Express和MongoDB构建的笔记应用，提供完整的笔记管理功能，包括用户认证、笔记编辑、分类管理、标签管理、笔记分享等功能。

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
git clone https://github.com/rootscomplite/notes.git
cd webapp
```

#### 步骤2：Docker部署

使用提供的部署脚本一键部署：

```bash
chmod +x ./docker-deploy.sh && ./docker-deploy.sh
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
- `JWT_EXPIRE`: JWT过期时间 # notes
