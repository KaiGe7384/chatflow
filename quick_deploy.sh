#!/bin/bash

echo "快速修复ChatFlow部署..."

# 检查并停止旧进程
echo "停止旧进程..."
pkill -f "node.*server" || true
pkill -f "npm.*start" || true

# 进入项目目录
cd /root/chatflow || exit 1

# 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 安装服务器依赖
echo "安装服务器依赖..."
cd server
npm install --production

# 启动服务器
echo "启动服务器..."
nohup node index.js > ../server.log 2>&1 &

# 等待启动
sleep 3

# 检查进程
if pgrep -f "node.*index.js" > /dev/null; then
    echo "✅ 服务器启动成功!"
    echo "📡 服务运行在端口 5001"
    echo "📄 日志文件: /root/chatflow/server.log"
else
    echo "❌ 服务器启动失败!"
    echo "查看日志:"
    tail -20 ../server.log
fi

# 简单的前端服务
echo "设置简单前端服务..."
cd /root/chatflow

# 创建简单的静态文件服务
python3 -m http.server 5000 --directory client/public > frontend.log 2>&1 &

echo "🌐 前端服务运行在端口 5000"
echo "🔗 访问地址: http://154.84.59.76:5000" 