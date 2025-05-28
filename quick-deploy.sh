#!/bin/bash

# ChatFlow 快速部署脚本 (本地开发版)
# 适用于Linux开发环境快速部署

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${GREEN}"
echo "  ______ _           _  ______ _               "
echo " |  ____| |         | ||  ____| |              "
echo " | |__  | |__   ____| || |__  | | _____      __"
echo " |  __| | '_ \ / _\` || |  __| | |/ _ \ \ /\ / /"
echo " | |____| | | | (_| || | |    | | (_) \ V  V / "
echo " |______|_| |_|\__,_||_|_|    |_|\___/ \_/\_/  "
echo -e "${NC}"
echo -e "${GREEN}         ChatFlow 快速部署 v1.1.0${NC}"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js 未安装，请先安装 Node.js 16+ 版本"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    print_error "npm 未安装，请先安装 npm"
    exit 1
fi

print_status "检查依赖..."
NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
print_success "Node.js 版本: $NODE_VERSION"
print_success "npm 版本: $NPM_VERSION"

# 检查Node.js版本
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_MAJOR" -lt 16 ]; then
    print_error "需要 Node.js 16+ 版本，当前版本: $NODE_VERSION"
    exit 1
fi

# 停止现有进程（如果存在）
if command -v pm2 &> /dev/null; then
    print_status "停止现有服务..."
    pm2 stop chatflow 2>/dev/null || true
    pm2 delete chatflow 2>/dev/null || true
fi

# 安装项目依赖
print_status "安装根目录依赖..."
npm install

# 安装服务端依赖
print_status "安装服务端依赖..."
cd server && npm install && cd ..

# 安装客户端依赖
print_status "安装客户端依赖..."
cd client && npm install && cd ..

# 构建前端
print_status "构建前端应用..."
cd client && npm run build && cd ..

# 创建环境配置
print_status "创建环境配置..."
if [ ! -f server/.env ]; then
    cat > server/.env << EOF
PORT=5000
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "chatflow-$(date +%s)-secret")
NODE_ENV=production
EOF
    print_success "环境配置文件已创建"
else
    print_warning "环境配置文件已存在，跳过创建"
fi

# 安装PM2
if ! command -v pm2 &> /dev/null; then
    print_status "安装 PM2..."
    npm install -g pm2
    print_success "PM2 安装完成"
fi

# 创建PM2配置
print_status "创建 PM2 配置..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'chatflow',
    script: 'server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# 创建日志目录
mkdir -p logs

# 启动应用
print_status "启动 ChatFlow 应用..."
pm2 start ecosystem.config.js
pm2 save

# 等待服务启动
sleep 3

# 检查服务状态
if pm2 list | grep -q "chatflow.*online"; then
    print_success "ChatFlow 部署完成！"
    echo ""
    echo -e "${GREEN}访问信息:${NC}"
    echo -e "  前端地址: ${YELLOW}http://localhost:3000${NC} (开发模式)"
    echo -e "  应用地址: ${YELLOW}http://localhost:5000${NC} (生产模式)"
    echo -e "  API接口: ${YELLOW}http://localhost:5000/api${NC}"
    echo ""
    echo -e "${GREEN}管理命令:${NC}"
    echo -e "  查看状态: ${YELLOW}pm2 status${NC}"
    echo -e "  查看日志: ${YELLOW}pm2 logs chatflow${NC}"
    echo -e "  重启应用: ${YELLOW}pm2 restart chatflow${NC}"
    echo -e "  停止应用: ${YELLOW}pm2 stop chatflow${NC}"
    echo -e "  删除应用: ${YELLOW}pm2 delete chatflow${NC}"
    echo ""
    echo -e "${GREEN}快速启动 (下次使用):${NC}"
    echo -e "  一键启动: ${YELLOW}npm start${NC}"
    echo -e "  开发模式: ${YELLOW}npm run dev${NC}"
    echo ""
    echo -e "${GREEN}🎉 部署成功！访问 http://localhost:5000 开始使用 ChatFlow！${NC}"
else
    print_error "服务启动失败，请检查日志:"
    pm2 logs chatflow --lines 20
    exit 1
fi 