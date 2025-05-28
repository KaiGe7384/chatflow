#!/bin/bash

# ChatFlow 一键部署脚本
# Author: ChatFlow Team
# Version: 2.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="chatflow"
INSTALL_DIR="/opt/$APP_NAME"
USER="chatflow"
SERVICE_NAME="chatflow"
WEB_PORT=3000
API_PORT=5000
GITHUB_REPO="https://github.com/KaiGe7384/chatflow.git"

# 打印带颜色的消息
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
    echo -e "${PURPLE}"
    echo "  ______ _           _  ______ _               "
    echo " |  ____| |         | ||  ____| |              "
    echo " | |__  | |__   ____| || |__  | | _____      __"
    echo " |  __| | '_ \ / _\` || |  __| | |/ _ \ \ /\ / /"
    echo " | |____| | | | (_| || | |    | | (_) \ V  V / "
    echo " |______|_| |_|\__,_||_|_|    |_|\___/ \_/\_/  "
    echo -e "${NC}"
    echo -e "${CYAN}         ChatFlow 一键部署脚本 v2.0.0${NC}"
    echo -e "${CYAN}         现代化即时通讯应用${NC}"
    echo ""
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "请使用root权限运行此脚本"
        print_status "使用方法: sudo $0"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    if [ -f /etc/redhat-release ]; then
        OS="centos"
        PM="yum"
        INSTALL_CMD="yum install -y"
    elif [ -f /etc/debian_version ]; then
        OS="debian"
        PM="apt"
        INSTALL_CMD="apt install -y"
    elif [ -f /etc/alpine-release ]; then
        OS="alpine"
        PM="apk"
        INSTALL_CMD="apk add"
    else
        print_error "不支持的操作系统，仅支持 CentOS/RHEL、Debian/Ubuntu 和 Alpine Linux"
        exit 1
    fi
    print_status "检测到操作系统: $OS"
}

# 安装依赖
install_dependencies() {
    print_status "正在安装系统依赖..."
    
    if [ "$OS" = "centos" ]; then
        $PM update -y
        $INSTALL_CMD curl wget git nginx sqlite python3 python3-pip gcc gcc-c++ make
        # 安装Node.js 18
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        $INSTALL_CMD nodejs
    elif [ "$OS" = "debian" ]; then
        $PM update -y
        $INSTALL_CMD curl wget git nginx sqlite3 python3 python3-pip build-essential
        # 安装Node.js 18
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        $INSTALL_CMD nodejs
    elif [ "$OS" = "alpine" ]; then
        $PM update
        $INSTALL_CMD curl wget git nginx sqlite python3 py3-pip nodejs npm build-base
    fi
    
    # 验证Node.js安装
    if ! command -v node &> /dev/null; then
        print_error "Node.js 安装失败"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    print_success "Node.js 版本: $NODE_VERSION"
    print_success "npm 版本: $NPM_VERSION"
    
    # 安装PM2
    npm install -g pm2
    
    print_success "系统依赖安装完成"
}

# 创建用户
create_user() {
    if id "$USER" &>/dev/null; then
        print_warning "用户 $USER 已存在"
    else
        print_status "创建用户 $USER..."
        useradd -r -s /bin/bash -d $INSTALL_DIR $USER
        print_success "用户 $USER 创建完成"
    fi
}

# 下载源码
download_source() {
    print_status "正在下载 ChatFlow 源码..."
    
    if [ -d "$INSTALL_DIR" ]; then
        print_warning "目录 $INSTALL_DIR 已存在，正在备份..."
        mv $INSTALL_DIR ${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    mkdir -p $INSTALL_DIR
    cd $INSTALL_DIR
    
    # 检查GitHub仓库地址是否已更新
    if [[ "$GITHUB_REPO" == *"KaiGe7384"* ]]; then
        print_success "GitHub仓库地址已正确配置"
    else
        print_error "请在脚本中更新GITHUB_REPO变量为您的实际GitHub仓库地址"
        exit 1
    fi
    
    print_status "从GitHub克隆项目..."
    git clone $GITHUB_REPO .
    
    chown -R $USER:$USER $INSTALL_DIR
    print_success "源码下载完成"
}

# 安装应用依赖
install_app_dependencies() {
    print_status "正在安装应用依赖..."
    
    cd $INSTALL_DIR
    
    # 安装根目录依赖
    sudo -u $USER npm install
    
    # 安装服务端依赖
    cd $INSTALL_DIR/server
    sudo -u $USER npm install
    
    # 安装客户端依赖并构建
    cd $INSTALL_DIR/client
    sudo -u $USER npm install
    sudo -u $USER npm run build
    
    print_success "应用依赖安装完成"
}

# 配置环境
configure_environment() {
    print_status "正在配置应用环境..."
    
    # 创建服务端环境配置
    cat > $INSTALL_DIR/server/.env << EOF
PORT=$API_PORT
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
EOF
    
    # 设置权限
    chown $USER:$USER $INSTALL_DIR/server/.env
    chmod 600 $INSTALL_DIR/server/.env
    
    print_success "环境配置完成"
}

# 配置PM2
configure_pm2() {
    print_status "正在配置PM2..."
    
    cat > $INSTALL_DIR/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'server/index.js',
    cwd: '$INSTALL_DIR',
    user: '$USER',
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
    mkdir -p $INSTALL_DIR/logs
    chown -R $USER:$USER $INSTALL_DIR/logs
    chown $USER:$USER $INSTALL_DIR/ecosystem.config.js
    print_success "PM2配置完成"
}

# 配置Nginx
configure_nginx() {
    print_status "正在配置Nginx..."
    
    # 创建Nginx配置目录
    if [ "$OS" = "debian" ]; then
        NGINX_SITES_DIR="/etc/nginx/sites-available"
        NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
        mkdir -p $NGINX_SITES_DIR $NGINX_ENABLED_DIR
    else
        NGINX_SITES_DIR="/etc/nginx/conf.d"
        mkdir -p $NGINX_SITES_DIR
    fi
    
    cat > $NGINX_SITES_DIR/$APP_NAME.conf << EOF
server {
    listen 80;
    server_name _;
    
    # 前端静态文件
    location / {
        root $INSTALL_DIR/client/build;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 文件上传限制
    client_max_body_size 10M;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
EOF

    # 启用站点
    if [ "$OS" = "debian" ]; then
        ln -sf $NGINX_SITES_DIR/$APP_NAME.conf $NGINX_ENABLED_DIR/
        rm -f $NGINX_ENABLED_DIR/default
    fi
    
    # 测试Nginx配置
    nginx -t
    if [ $? -eq 0 ]; then
        print_success "Nginx配置完成"
    else
        print_error "Nginx配置错误"
        exit 1
    fi
}

# 启动服务
start_services() {
    print_status "正在启动服务..."
    
    # 启动ChatFlow应用
    cd $INSTALL_DIR
    sudo -u $USER pm2 start ecosystem.config.js
    sudo -u $USER pm2 save
    
    # 设置PM2开机自启
    env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $INSTALL_DIR
    
    # 启动Nginx
    systemctl enable nginx
    systemctl start nginx
    
    print_success "服务启动完成"
}

# 显示安装结果
show_result() {
    clear
    print_header
    
    # 获取服务器IP
    SERVER_IP=$(curl -s https://api.ipify.org 2>/dev/null)
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(hostname -I | awk '{print $1}' 2>/dev/null)
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    
    print_success "ChatFlow 部署完成！"
    echo ""
    echo -e "${CYAN}访问信息:${NC}"
    echo -e "  Web应用: ${GREEN}http://$SERVER_IP${NC}"
    echo -e "  API接口: ${GREEN}http://$SERVER_IP:$API_PORT/api${NC}"
    echo ""
    echo -e "${CYAN}管理命令:${NC}"
    echo -e "  查看状态: ${YELLOW}pm2 status${NC}"
    echo -e "  查看日志: ${YELLOW}pm2 logs $SERVICE_NAME${NC}"
    echo -e "  重启服务: ${YELLOW}pm2 restart $SERVICE_NAME${NC}"
    echo -e "  停止服务: ${YELLOW}pm2 stop $SERVICE_NAME${NC}"
    echo -e "  删除服务: ${YELLOW}pm2 delete $SERVICE_NAME${NC}"
    echo ""
    echo -e "${CYAN}服务管理:${NC}"
    echo -e "  Nginx状态: ${YELLOW}systemctl status nginx${NC}"
    echo -e "  重启Nginx: ${YELLOW}systemctl restart nginx${NC}"
    echo ""
    echo -e "${CYAN}配置文件:${NC}"
    echo -e "  应用目录: ${YELLOW}$INSTALL_DIR${NC}"
    echo -e "  环境配置: ${YELLOW}$INSTALL_DIR/server/.env${NC}"
    echo -e "  Nginx配置: ${YELLOW}$NGINX_SITES_DIR/$APP_NAME.conf${NC}"
    echo -e "  日志目录: ${YELLOW}$INSTALL_DIR/logs${NC}"
    echo ""
    echo -e "${GREEN}默认测试账号:${NC}"
    echo -e "  用户名: ${YELLOW}test1${NC} / 密码: ${YELLOW}123456${NC}"
    echo -e "  用户名: ${YELLOW}test2${NC} / 密码: ${YELLOW}123456${NC}"
    echo ""
    echo -e "${GREEN}🎉 部署成功！请访问 http://$SERVER_IP 开始使用 ChatFlow！${NC}"
}

# 主函数
main() {
    print_header
    
    print_status "开始部署 ChatFlow..."
    
    check_root
    detect_os
    install_dependencies
    create_user
    download_source
    install_app_dependencies
    configure_environment
    configure_pm2
    configure_nginx
    start_services
    
    show_result
}

# 运行主函数
main "$@"