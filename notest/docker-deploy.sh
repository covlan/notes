#!/bin/bash

# 显示颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 时间戳，用于备份文件命名
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 参数处理
UPDATE_ONLY=false

# 检查参数
if [ "$1" = "--update" ] || [ "$1" = "-u" ]; then
    UPDATE_ONLY=true
    echo -e "${YELLOW}仅更新应用代码模式...${NC}"
else
    echo -e "${YELLOW}开始部署笔记应用 Docker 环境...${NC}"
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装。请先安装 Docker。${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! docker compose version &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装或不是新版。请确保Docker版本支持compose子命令。${NC}"
    exit 1
fi

# 创建备份目录
mkdir -p ./backups

# 备份数据函数
backup_data() {
    echo -e "${YELLOW}正在备份数据库...${NC}"

    # 检查MongoDB容器是否在运行
    if docker ps | grep -q "notedb"; then
        # 创建备份目录
        mkdir -p ./backups/mongodb_${TIMESTAMP}

        # 执行MongoDB数据导出
        docker exec notedb mongodump --db=notedb --out=/tmp/mongodb_backup

        # 从容器复制备份文件到宿主机
        docker cp notedb:/tmp/mongodb_backup ./backups/mongodb_${TIMESTAMP}

        # 清理容器中的临时备份
        docker exec notedb rm -rf /tmp/mongodb_backup

        echo -e "${GREEN}数据库备份已保存到 ./backups/mongodb_${TIMESTAMP} 目录${NC}"

        # 备份上传的文件
        if [ -d "./src/uploads" ]; then
            echo -e "${YELLOW}正在备份上传文件...${NC}"
            mkdir -p ./backups/uploads_${TIMESTAMP}
            cp -r ./src/uploads/* ./backups/uploads_${TIMESTAMP}/ 2>/dev/null || true
            echo -e "${GREEN}文件备份已保存到 ./backups/uploads_${TIMESTAMP} 目录${NC}"
        fi

        echo -e "${GREEN}备份完成!${NC}"
        return 0
    else
        echo -e "${YELLOW}MongoDB容器未运行，跳过数据库备份${NC}"
        return 1
    fi
}

# 如果是更新模式
if [ "$UPDATE_ONLY" = true ]; then
    echo -e "${BLUE}正在重新构建和更新应用容器...${NC}"

    # 在更新前检查是否需要备份
    echo -e "${YELLOW}是否在更新前备份当前数据? [Y/n] ${NC}"
    read -r backup_confirm
    if [[ ! "$backup_confirm" =~ ^[Nn]$ ]]; then
        backup_data
    fi

    # 重新构建并重启应用容器
    if docker compose build app && docker compose up -d --no-deps app; then
        echo -e "${GREEN}应用代码更新成功!${NC}"
        echo -e "${GREEN}应用将在 http://localhost:5660 上运行${NC}"

        # 处理HTML文件
        echo -e "${YELLOW}处理HTML文件以支持无扩展名URL...${NC}"
        docker exec notest npm run process-html

        # 检查健康状态
        echo -e "${YELLOW}等待服务启动...${NC}"
        sleep 5

        if curl -s -o /dev/null -w "%{http_code}" http://localhost:5660/health | grep -q "200"; then
            echo -e "${GREEN}服务健康检查通过！${NC}"
        else
            echo -e "${YELLOW}服务尚未就绪，可能需要多等一会儿...${NC}"
            echo -e "${YELLOW}您可以通过以下命令查看日志：${NC}"
            echo -e "${BLUE}docker compose logs -f app${NC}"
        fi
    else
        echo -e "${RED}应用更新失败，请检查错误信息。${NC}"
        exit 1
    fi

    # 显示提示并退出
    echo -e "\n${GREEN}===== 常用命令 =====${NC}"
    echo -e "${BLUE}查看应用日志:${NC} docker compose logs -f app"
    echo -e "${BLUE}重启应用:${NC} docker compose restart app"

    exit 0
fi

# 确保脚本目录存在
mkdir -p scripts

# 检查检查依赖脚本是否存在
if [ ! -f "scripts/check-dependencies.js" ]; then
    echo -e "${YELLOW}创建依赖检查脚本...${NC}"

    mkdir -p scripts

    cat > scripts/check-dependencies.js << 'EOF'
/**
 * 依赖检查脚本
 * 用于验证所有必要的依赖是否可以正确加载
 */

console.log('开始检查依赖...');

// 要检查的依赖项列表
const dependencies = [
  'express',
  'mongoose',
  'bcryptjs',
  'jsonwebtoken',
  'cors',
  'dotenv',
  'multer'
];

// 逐个检查依赖
let allDepsOK = true;
let failedDeps = [];

dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep} - 加载成功`);
  } catch (error) {
    allDepsOK = false;
    failedDeps.push({ name: dep, error: error.message });
    console.error(`❌ ${dep} - 加载失败: ${error.message}`);
  }
});

// 总结
if (allDepsOK) {
  console.log('\n✅ 所有依赖检查通过！');
  process.exit(0);
} else {
  console.error('\n❌ 依赖检查失败！以下模块无法加载:');
  failedDeps.forEach(dep => {
    console.error(`   - ${dep.name}: ${dep.error}`);
  });
  console.log('\n请尝试重新安装依赖: npm install');
  process.exit(1);
}
EOF
    echo -e "${GREEN}依赖检查脚本创建成功！${NC}"
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}创建.env文件...${NC}"

    # 生成随机JWT密钥
    JWT_SECRET="notest_secret_key_$(date +%s)_$(openssl rand -hex 12)"

    cat > .env << EOF
PORT=5660
APP_HOSTS=10.30.0.2
DB_HOSTS=10.30.0.3
MONGODB_URI=mongodb://\${DB_HOSTS}:27017/notedb
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5660
EOF
    echo -e "${GREEN}.env文件创建成功!${NC}"
else
    echo -e "${GREEN}.env文件已存在${NC}"
fi

# 创建上传目录
mkdir -p src/uploads
echo -e "${GREEN}创建上传目录: src/uploads${NC}"

# 创建并设置MongoDB数据和配置目录
echo -e "${YELLOW}创建MongoDB数据和配置目录...${NC}"
mkdir -p mongo_data mongo_config files_data logs
chmod 777 mongo_data mongo_config files_data logs
echo -e "${GREEN}MongoDB数据和配置目录创建成功并设置权限!${NC}"

# 确保 logs 目录存在并设置权限
if [ ! -d "./logs" ]; then
  mkdir -p ./logs
  echo "Created logs directory."
fi
chmod 777 ./logs

# 检查是否需要构建新镜像
echo -e "${YELLOW}检查是否有现有容器...${NC}"
if docker compose ps -q | grep -q .; then
    echo -e "${BLUE}发现现有容器，询问是否备份数据...${NC}"

    # 询问是否在停止容器前备份数据
    echo -e "${YELLOW}是否在停止容器前备份数据? [Y/n] ${NC}"
    read -r backup_confirm
    if [[ ! "$backup_confirm" =~ ^[Nn]$ ]]; then
        backup_data
    fi

    echo -e "${BLUE}停止并移除现有容器...${NC}"
    docker compose down
    echo -e "${GREEN}已停止现有容器，准备重新部署...${NC}"
fi

# 构建并启动容器
echo -e "${YELLOW}构建并启动Docker容器...${NC}"
docker compose up -d --build

# 检查容器是否启动成功
if [ $? -eq 0 ]; then
    echo -e "${GREEN}部署成功!${NC}"
    echo -e "${GREEN}应用将在 http://localhost:5660 上运行${NC}"

    # 等待容器完全启动
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10

    # 处理HTML文件
    echo -e "${YELLOW}处理HTML文件以支持无扩展名URL...${NC}"
    docker exec notest npm run process-html

    # 检查健康状态
    echo -e "${YELLOW}检查服务健康状态...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5660/health | grep -q "200"; then
        echo -e "${GREEN}服务健康检查通过！${NC}"
        echo -e "${YELLOW}现有用户数据已保留。${NC}"
    else
        echo -e "${YELLOW}服务尚未就绪，可能需要多等一会儿...${NC}"
        echo -e "${YELLOW}您可以通过以下命令查看日志：${NC}"
        echo -e "${BLUE}docker compose logs -f app${NC}"
    fi

    echo -e "${YELLOW}容器状态:${NC}"
    docker compose ps
else
    echo -e "${RED}部署失败，请检查错误信息。${NC}"
    echo -e "${YELLOW}尝试查看容器日志以获取更多信息:${NC}"
    echo -e "${BLUE}docker compose logs app${NC}"
    exit 1
fi

# 提示可用命令
echo -e "\n${GREEN}===== 常用命令 =====${NC}"
echo -e "${BLUE}查看应用日志:${NC} docker compose logs -f app"
echo -e "${BLUE}停止应用:${NC} docker compose down"
echo -e "${BLUE}重启应用:${NC} docker compose restart app"
echo -e "${BLUE}更新应用代码:${NC} $0 --update"
echo -e "${BLUE}检查容器状态:${NC} docker compose ps"
echo -e "${BLUE}备份数据库:${NC} docker exec notedb mongodump --db=notedb --out=/tmp/backup && docker cp notedb:/tmp/backup ./backups/mongodb_\$(date +%Y%m%d_%H%M%S)"

# 提示用户管理
echo -e "\n${GREEN}===== 用户管理 =====${NC}"
echo -e "${YELLOW}注意:${NC} 如果系统中没有用户，第一个注册的用户将自动成为系统管理员"
echo -e "${YELLOW}请访问:${NC} http://localhost:5660/register 进行注册"

# 提示URL访问说明
echo -e "\n${GREEN}===== URL访问说明 =====${NC}"
echo -e "${YELLOW}系统支持无扩展名URL访问，例如:${NC}"
echo -e "${BLUE}http://localhost:5660/login${NC}"
echo -e "${BLUE}http://localhost:5660/register${NC}"
echo -e "${BLUE}http://localhost:5660/dashboard${NC}"
echo -e "${YELLOW}注意:${NC} 带.html后缀的URL会自动重定向到无扩展名URL"