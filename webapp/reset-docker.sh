#!/bin/bash
# 完全重置Docker容器和数据的脚本

echo "===== 停止并删除所有容器和卷 ====="
docker compose down -v

echo "===== 删除所有相关的容器（以防有残留） ====="
docker rm -f note_app note_app_mongo 2>/dev/null || true

echo "===== 删除所有相关的卷 ====="
docker volume rm webapp_mongo_data webapp_files_data 2>/dev/null || true

echo "===== 清理Docker系统 ====="
docker system prune -f

echo "===== 检查数据卷是否已删除 ====="
docker volume ls

echo "===== 重新构建并启动容器 ====="
docker compose build --no-cache
docker compose up -d

echo "===== 等待容器启动 ====="
sleep 10

echo "===== 检查容器状态 ====="
docker compose ps

echo "===== 查看MongoDB日志 ====="
docker logs note_app_mongo

echo "===== 应用程序已重置 ====="
echo "现在可以使用以下凭据登录:"
echo "用户名: admin"
echo "密码: admin123" 