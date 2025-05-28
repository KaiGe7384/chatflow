#!/bin/bash

# ChatFlow 部署状态检查脚本
# 用于检查部署后的服务状态

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[检查]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[正常]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

echo -e "${GREEN}ChatFlow 部署状态检查${NC}"
echo "=================================="

# 检查Node.js
print_status "检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js 已安装: $NODE_VERSION"
else
    print_error "Node.js 未安装"
fi

# 检查PM2
print_status "检查 PM2..."
if command -v pm2 &> /dev/null; then
    print_success "PM2 已安装"
    echo "PM2 服务状态:"
    pm2 list
else
    print_error "PM2 未安装"
fi

# 检查Nginx
print_status "检查 Nginx..."
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        print_success "Nginx 正在运行"
    else
        print_warning "Nginx 已安装但未运行"
    fi
else
    print_error "Nginx 未安装"
fi

# 检查端口
print_status "检查端口占用..."
if netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
    print_success "API端口 5000 正在监听"
else
    print_error "API端口 5000 未监听"
fi

if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    print_success "Web端口 80 正在监听"
else
    print_error "Web端口 80 未监听"
fi

# 检查项目文件
print_status "检查项目文件..."
if [ -d "/opt/chatflow" ]; then
    print_success "项目目录存在: /opt/chatflow"
    
    if [ -f "/opt/chatflow/server/index.js" ]; then
        print_success "服务端文件存在"
    else
        print_error "服务端文件不存在"
    fi
    
    if [ -d "/opt/chatflow/client/build" ]; then
        print_success "前端构建文件存在"
    else
        print_error "前端构建文件不存在"
    fi
else
    print_error "项目目录不存在: /opt/chatflow"
fi

# 获取服务器IP
SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null)
if [ -z "$SERVER_IP" ]; then
    SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
fi
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
fi

echo ""
echo "=================================="
echo -e "${GREEN}访问地址:${NC}"
echo -e "  Web应用: http://$SERVER_IP"
echo -e "  API接口: http://$SERVER_IP:5000/api"
echo ""
echo -e "${GREEN}常用命令:${NC}"
echo -e "  pm2 status      - 查看服务状态"
echo -e "  pm2 logs        - 查看日志"
echo -e "  pm2 restart all - 重启所有服务"
echo -e "  systemctl status nginx - 查看Nginx状态" 