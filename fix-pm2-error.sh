#!/bin/bash

# ChatFlow PM2 错误修复脚本
# 解决 EPIPE 错误和应用无法访问的问题

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

print_header() {
    echo -e "${GREEN}"
    echo "=================================="
    echo "   ChatFlow PM2 错误修复工具"
    echo "=================================="
    echo -e "${NC}"
}

# 获取服务器IP
get_server_ip() {
    SERVER_IP=""
    if command -v curl &> /dev/null; then
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    echo $SERVER_IP
}

# 修复PM2错误
fix_pm2_error() {
    print_status "正在修复PM2 EPIPE错误..."
    
    # 停止所有PM2进程
    print_status "停止所有PM2进程..."
    pm2 kill 2>/dev/null || true
    
    # 清理PM2相关文件
    print_status "清理PM2缓存和日志..."
    rm -rf ~/.pm2/logs/* 2>/dev/null || true
    rm -rf ~/.pm2/pids/* 2>/dev/null || true
    rm -rf /tmp/pm2-* 2>/dev/null || true
    
    # 重新初始化PM2
    print_status "重新初始化PM2..."
    pm2 ping
    
    print_success "PM2错误修复完成"
}

# 检查应用状态
check_application() {
    print_status "检查ChatFlow应用状态..."
    
    # 进入项目目录
    if [ -d "/root/chatflow" ]; then
        cd /root/chatflow
    elif [ -d "~/chatflow" ]; then
        cd ~/chatflow
    else
        print_error "找不到ChatFlow项目目录"
        return 1
    fi
    
    # 检查必要文件
    if [ ! -f "ecosystem.config.js" ]; then
        print_warning "ecosystem.config.js 不存在，正在创建..."
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
    fi
    
    # 创建日志目录
    mkdir -p logs
    
    # 检查服务器文件
    if [ ! -f "server/index.js" ]; then
        print_error "服务器文件 server/index.js 不存在"
        return 1
    fi
    
    print_success "应用文件检查完成"
}

# 重新启动应用
restart_application() {
    print_status "重新启动ChatFlow应用..."
    
    # 停止现有应用（如果存在）
    pm2 stop chatflow 2>/dev/null || true
    pm2 delete chatflow 2>/dev/null || true
    
    # 启动应用
    print_status "启动应用..."
    pm2 start ecosystem.config.js
    
    # 保存PM2配置
    pm2 save
    
    # 等待服务启动
    sleep 5
    
    print_success "应用启动完成"
}

# 测试应用连通性
test_connectivity() {
    print_status "测试应用连通性..."
    
    local SERVER_IP=$(get_server_ip)
    
    # 测试本地连接
    if curl -s http://localhost:5000 >/dev/null; then
        print_success "本地连接测试成功"
    else
        print_warning "本地连接测试失败"
    fi
    
    # 检查端口监听
    if netstat -tln | grep -q ":5000 "; then
        print_success "端口5000正在监听"
    else
        print_warning "端口5000未监听"
    fi
    
    # 检查防火墙（如果存在）
    if command -v ufw &> /dev/null; then
        print_status "检查UFW防火墙状态..."
        ufw status
    fi
    
    if command -v firewall-cmd &> /dev/null; then
        print_status "检查firewalld防火墙状态..."
        firewall-cmd --list-ports 2>/dev/null || true
    fi
}

# 显示应用信息
show_application_info() {
    local SERVER_IP=$(get_server_ip)
    
    echo ""
    echo -e "${GREEN}🎉 ChatFlow 修复完成！${NC}"
    echo ""
    echo -e "${GREEN}访问信息:${NC}"
    echo -e "  应用地址: ${YELLOW}http://$SERVER_IP:5000${NC}"
    echo -e "  API接口: ${YELLOW}http://$SERVER_IP:5000/api${NC}"
    echo ""
    echo -e "${GREEN}应用状态:${NC}"
    pm2 status chatflow 2>/dev/null || echo "  状态检查失败"
    echo ""
    echo -e "${GREEN}管理命令:${NC}"
    echo -e "  查看状态: ${YELLOW}cf status${NC}"
    echo -e "  查看日志: ${YELLOW}cf logs${NC}"
    echo -e "  重启应用: ${YELLOW}cf restart${NC}"
    echo ""
    echo -e "${GREEN}故障排除:${NC}"
    echo -e "  查看错误日志: ${YELLOW}cf logs -e${NC}"
    echo -e "  查看PM2日志: ${YELLOW}pm2 logs chatflow${NC}"
    echo -e "  检查端口: ${YELLOW}netstat -tln | grep 5000${NC}"
    echo ""
}

# 主函数
main() {
    print_header
    
    # 检查root权限
    if [ "$EUID" -ne 0 ]; then
        print_error "此脚本需要root权限运行"
        print_status "请使用: sudo $0"
        exit 1
    fi
    
    print_status "开始修复ChatFlow应用..."
    
    # 修复PM2错误
    fix_pm2_error
    
    # 检查应用
    check_application
    
    # 重新启动应用
    restart_application
    
    # 测试连通性
    test_connectivity
    
    # 显示应用信息
    show_application_info
    
    print_success "修复流程完成！"
}

# 运行主函数
main "$@" 