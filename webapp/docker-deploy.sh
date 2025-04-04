#!/bin/bash

# 显示颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始部署笔记应用 Docker 环境...${NC}"

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

# 确保初始化管理员账户脚本存在
if [ ! -f "scripts/init-admin.js" ]; then
    echo -e "${YELLOW}创建管理员初始化脚本...${NC}"
    
    cat > scripts/init-admin.js << 'EOF'
/**
 * 初始化管理员账户脚本
 * 此脚本会自动设置管理员账户的密码
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('已连接到MongoDB'))
.catch(err => {
  console.error('MongoDB连接失败:', err.message);
  process.exit(1);
});

// 创建用户模型
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  displayName: String,
  role: String,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', UserSchema);

// 管理员账户信息
const adminData = {
  username: 'admin',
  password: 'password',
  email: 'admin@example.com'
};

async function initAdmin() {
  try {
    console.log('正在初始化管理员账户...');
    
    // 查找管理员用户
    const adminUser = await User.findOne({ username: adminData.username });
    
    if (!adminUser) {
      console.log('未找到管理员账户，创建新账户...');
      
      // 哈希密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      // 创建新管理员
      const newAdmin = new User({
        username: adminData.username,
        email: adminData.email,
        password: hashedPassword,
        displayName: '管理员',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAdmin.save();
      console.log('✅ 管理员账户创建成功!');
    } else {
      console.log('找到现有管理员账户，更新密码...');
      
      // 更新现有管理员密码
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminData.password, salt);
      
      adminUser.password = hashedPassword;
      adminUser.updatedAt = new Date();
      
      await adminUser.save();
      console.log('✅ 管理员密码更新成功!');
    }
    
    console.log(`管理员账户信息:`);
    console.log(`- 用户名: ${adminData.username}`);
    console.log(`- 密码: ${adminData.password}`);
    
    mongoose.disconnect();
    console.log('已断开MongoDB连接');
  } catch (err) {
    console.error('初始化管理员账户失败:', err);
    mongoose.disconnect();
    process.exit(1);
  }
}

// 执行初始化
initAdmin();
EOF
    echo -e "${GREEN}管理员初始化脚本创建成功！${NC}"
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
    
    # 检查健康状态
    echo -e "${YELLOW}检查服务健康状态...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5660/health | grep -q "200"; then
        echo -e "${GREEN}服务健康检查通过！${NC}"
        
        # 初始化管理员账户
        echo -e "${YELLOW}正在初始化管理员账户...${NC}"
        docker exec note_app npm run init-admin
        echo -e "${GREEN}管理员账户初始化完成!${NC}"
        echo -e "${GREEN}请使用以下凭据登录:${NC}"
        echo -e "${BLUE}用户名:${NC} admin"
        echo -e "${BLUE}密码:${NC} password"
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
echo -e "${BLUE}检查容器状态:${NC} docker compose ps" 