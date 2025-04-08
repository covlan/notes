#!/bin/bash

# 显示颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始安装依赖...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}依赖安装失败，请检查错误信息。${NC}"
    exit 1
fi

echo -e "${GREEN}依赖安装成功!${NC}"

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}创建.env文件...${NC}"
    cat > .env << EOF
PORT=5660
MONGODB_URI=mongodb://localhost:27017/note-app
JWT_SECRET=note_app_secret_key_$(date +%s)
JWT_EXPIRE=30d
EOF
    echo -e "${GREEN}.env文件创建成功!${NC}"
else
    echo -e "${GREEN}.env文件已存在${NC}"
fi

echo -e "${YELLOW}正在启动应用...${NC}"
echo -e "${GREEN}应用将在 http://localhost:5660 上运行${NC}"
npm run dev 