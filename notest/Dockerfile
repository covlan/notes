FROM node:18-alpine

WORKDIR /app

# 安装编译所需的依赖
RUN apk add --no-cache --virtual .gyp python3 make g++

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 清理编译依赖
RUN apk del .gyp

# 复制应用代码
COPY . .

# 创建必要的文件夹并设置权限
RUN mkdir -p /app/files /app/logs /app/src/uploads && \
    chmod 755 /app/files /app/logs /app/src/uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=5660

# 暴露端口
EXPOSE 5660

# 启动命令
CMD ["npm", "run", "start"] 