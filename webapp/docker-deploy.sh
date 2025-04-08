#!/bin/bash

# 显示颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 参数处理
UPDATE_ONLY=false
CLEANUP_MODE=false

# 检查参数
if [ "$1" = "--update" ] || [ "$1" = "-u" ]; then
    UPDATE_ONLY=true
    echo -e "${YELLOW}仅更新应用代码模式...${NC}"
elif [ "$1" = "--cleanup" ] || [ "$1" = "-c" ]; then
    CLEANUP_MODE=true
    echo -e "${RED}警告: 清除用户数据模式！此操作将删除所有用户数据和持久化卷！${NC}"
    echo -e "${YELLOW}此操作不可逆，请确认是否继续 [y/N]? ${NC}"
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}操作已取消${NC}"
        exit 0
    fi
    echo -e "${RED}确认清除数据，开始执行清理操作...${NC}"
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

# 清理数据函数
cleanup_all_data() {
    echo -e "${RED}开始清理所有用户数据和持久化卷...${NC}"
    
    # 停止并删除所有相关容器
    echo -e "${YELLOW}停止并移除现有容器...${NC}"
    docker compose down
    
    # 删除持久化卷
    echo -e "${YELLOW}删除MongoDB和文件数据的持久化卷...${NC}"
    docker volume rm $(docker volume ls -q | grep note-app) 2>/dev/null || true
    docker volume rm $(docker volume ls -q | grep mongo_data) 2>/dev/null || true
    docker volume rm $(docker volume ls -q | grep files_data) 2>/dev/null || true
    
    # 清除本地缓存文件
    echo -e "${YELLOW}清除本地缓存文件...${NC}"
    rm -rf ./src/uploads/* 2>/dev/null || true
    
    # 创建MongoDB清空用户表的脚本(备用方案)
    echo -e "${YELLOW}准备MongoDB清空脚本以防持久化卷未被正确删除...${NC}"
    mkdir -p scripts
    cat > scripts/clear-all-data.js << 'EOF'
// 连接到数据库并清空所有表
db = db.getSiblingDB('note-app');

// 列出所有集合
const collections = db.getCollectionNames();
console.log("现有集合:", collections);

// 逐个删除集合
collections.forEach(collection => {
    db[collection].drop();
    print(`已删除集合: ${collection}`);
});

print('所有数据已清空');
EOF
    
    echo -e "${GREEN}清理操作完成！${NC}"
}

# 如果是清理模式
if [ "$CLEANUP_MODE" = true ]; then
    # 执行清理
    cleanup_all_data
    
    # 继续执行完整部署流程
    echo -e "${YELLOW}现在将执行完整的部署流程...${NC}"
    
    # 不需要EXIT，继续执行以下代码
elif [ "$UPDATE_ONLY" = true ]; then
    echo -e "${BLUE}正在重新构建和更新应用容器...${NC}"
    
    # 重新构建并重启应用容器
    if docker compose build app && docker compose up -d --no-deps app; then
        echo -e "${GREEN}应用代码更新成功!${NC}"
        echo -e "${GREEN}应用将在 http://localhost:5660 上运行${NC}"
        
        # 处理HTML文件
        echo -e "${YELLOW}处理HTML文件以支持无扩展名URL...${NC}"
        docker exec note_app npm run process-html
        
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
    JWT_SECRET="note_app_secret_key_$(date +%s)_$(openssl rand -hex 12)"
    
    cat > .env << EOF
PORT=5660
MONGODB_URI=mongodb://mongo:27017/note-app
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

# 检查是否需要构建新镜像
echo -e "${YELLOW}检查是否有现有容器...${NC}"
if docker compose ps -q | grep -q .; then
    echo -e "${BLUE}发现现有容器，停止并移除...${NC}"
    docker compose down
    
    # 如果是清理模式，执行MongoDB清空脚本
    if [ "$CLEANUP_MODE" = true ] && [ -f "scripts/clear-all-data.js" ]; then
        echo -e "${YELLOW}尝试在MongoDB启动后执行清空脚本...${NC}"
        # 创建一个标记文件，表示需要在容器启动后清空数据
        touch .clear_data_on_startup
    else 
        echo -e "${GREEN}已停止现有容器，准备重新部署...${NC}"
    fi
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
    docker exec note_app npm run process-html
    
    # 如果是清理模式且存在标记文件，执行清空数据操作
    if [ "$CLEANUP_MODE" = true ] && [ -f ".clear_data_on_startup" ]; then
        echo -e "${YELLOW}执行数据清空操作...${NC}"
        
        # 初始化重试次数
        RETRY_COUNT=0
        MAX_RETRIES=5
        SUCCESS=false
        
        while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$SUCCESS" = "false" ]; do
            echo -e "${YELLOW}尝试清空数据 (尝试 $((RETRY_COUNT+1))/$MAX_RETRIES)...${NC}"
            
            # 尝试执行清空数据脚本
            docker exec note_app_mongo mongosh note-app --file /docker-entrypoint-initdb.d/clear-all-data.js
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}数据清空成功!${NC}"
                SUCCESS=true
                rm -f .clear_data_on_startup
                # 复制清空脚本到MongoDB容器
                docker cp scripts/clear-all-data.js note_app_mongo:/docker-entrypoint-initdb.d/
                echo -e "${GREEN}清空脚本已复制到MongoDB容器${NC}"
                break
            else
                echo -e "${YELLOW}尝试失败，等待MongoDB完全启动...${NC}"
                RETRY_COUNT=$((RETRY_COUNT+1))
                sleep 5
            fi
        done
        
        if [ "$SUCCESS" = "false" ]; then
            echo -e "${RED}清空数据失败，可能MongoDB未启动成功。${NC}"
            echo -e "${YELLOW}您可以手动执行以下命令清空:${NC}"
            echo -e "${BLUE}docker exec note_app_mongo mongosh note-app --file /docker-entrypoint-initdb.d/clear-all-data.js${NC}"
        fi
    fi
    
    # 检查健康状态
    echo -e "${YELLOW}检查服务健康状态...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5660/health | grep -q "200"; then
        echo -e "${GREEN}服务健康检查通过！${NC}"
        if [ "$CLEANUP_MODE" = true ]; then
            echo -e "${YELLOW}所有数据已清空，系统处于初始状态。${NC}"
        else
            echo -e "${YELLOW}现有用户数据已保留。${NC}"
        fi
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
echo -e "${BLUE}清空所有数据:${NC} $0 --cleanup"
echo -e "${BLUE}检查容器状态:${NC} docker compose ps"

# 提示用户管理
echo -e "\n${GREEN}===== 用户管理 =====${NC}"
if [ "$CLEANUP_MODE" = true ]; then
    echo -e "${YELLOW}注意:${NC} 系统已清空所有数据，第一个注册的用户将自动成为系统管理员"
else
    echo -e "${YELLOW}注意:${NC} 如果系统中没有用户，第一个注册的用户将自动成为系统管理员"
fi
echo -e "${YELLOW}请访问:${NC} http://localhost:5660/register 进行注册"

# 提示URL访问说明
echo -e "\n${GREEN}===== URL访问说明 =====${NC}"
echo -e "${YELLOW}系统支持无扩展名URL访问，例如:${NC}"
echo -e "${BLUE}http://localhost:5660/login${NC}"
echo -e "${BLUE}http://localhost:5660/register${NC}"
echo -e "${BLUE}http://localhost:5660/dashboard${NC}"
echo -e "${YELLOW}注意:${NC} 带.html后缀的URL会自动重定向到无扩展名URL" 