#!/bin/bash

# ChatFlow 快速部署脚本 (智能安装版)
# 自动检测并安装所需环境依赖

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
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
    echo -e "${PURPLE}"
    echo "  ______ _           _  ______ _               "
    echo " |  ____| |         | ||  ____| |              "
    echo " | |__  | |__   ____| || |__  | | _____      __"
    echo " |  __| | '_ \ / _\` || |  __| | |/ _ \ \ /\ / /"
    echo " | |____| | | | (_| || | |    | | (_) \ V  V / "
    echo " |______|_| |_|\__,_||_|_|    |_|\___/ \_/\_/  "
    echo -e "${NC}"
    echo -e "${GREEN}         ChatFlow 快速部署 v2.0.0${NC}"
    echo -e "${GREEN}         智能环境检测与安装${NC}"
    echo ""
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
        print_warning "未识别的操作系统，尝试使用通用安装方式"
        OS="unknown"
    fi
    print_status "检测到操作系统: $OS"
}

# 检查是否有sudo权限
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        SUDO=""
        print_status "检测到root权限"
    elif sudo -n true 2>/dev/null; then
        SUDO="sudo"
        print_status "检测到sudo权限"
    else
        print_warning "没有sudo权限，某些安装可能失败"
        SUDO=""
    fi
}

# 安装Node.js
install_nodejs() {
    print_status "正在安装 Node.js..."
    
    if [ "$OS" = "debian" ]; then
        # Ubuntu/Debian
        $SUDO apt update
        curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
        $SUDO $INSTALL_CMD nodejs
    elif [ "$OS" = "centos" ]; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_18.x | $SUDO bash -
        $SUDO $INSTALL_CMD nodejs npm
    elif [ "$OS" = "alpine" ]; then
        # Alpine Linux
        $SUDO $INSTALL_CMD nodejs npm
    else
        # 通用方式 - 使用Node Version Manager (nvm)
        print_status "使用 nvm 安装 Node.js..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 18
        nvm use 18
        nvm alias default 18
    fi
    
    print_success "Node.js 安装完成"
}

# 安装Git
install_git() {
    print_status "正在安装 Git..."
    
    if [ "$OS" = "debian" ]; then
        $SUDO $INSTALL_CMD git
    elif [ "$OS" = "centos" ]; then
        $SUDO $INSTALL_CMD git
    elif [ "$OS" = "alpine" ]; then
        $SUDO $INSTALL_CMD git
    else
        print_warning "请手动安装 Git"
        return 1
    fi
    
    print_success "Git 安装完成"
}

# 安装基础工具
install_basic_tools() {
    print_status "正在安装基础工具..."
    
    if [ "$OS" = "debian" ]; then
        $SUDO apt update
        $SUDO $INSTALL_CMD curl wget openssl build-essential
    elif [ "$OS" = "centos" ]; then
        $SUDO $INSTALL_CMD curl wget openssl gcc gcc-c++ make
    elif [ "$OS" = "alpine" ]; then
        $SUDO $INSTALL_CMD curl wget openssl build-base
    fi
    
    print_success "基础工具安装完成"
}

# 检查并安装依赖
check_and_install_dependencies() {
    print_status "检查系统依赖..."
    
    # 检测操作系统
    detect_os
    check_sudo
    
    # 检查基础工具
    if ! command -v curl &> /dev/null; then
        print_warning "curl 未安装，正在安装..."
        install_basic_tools
    fi
    
    if ! command -v git &> /dev/null; then
        print_warning "Git 未安装，正在安装..."
        install_git
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_warning "Node.js 未安装，正在安装..."
        install_nodejs
    else
        NODE_VERSION=$(node -v)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 16 ]; then
            print_warning "Node.js 版本过低 ($NODE_VERSION)，正在升级..."
            install_nodejs
        else
            print_success "Node.js 版本: $NODE_VERSION ✓"
        fi
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_warning "npm 未安装，正在安装..."
        if [ "$OS" = "debian" ]; then
            $SUDO $INSTALL_CMD npm
        elif [ "$OS" = "centos" ]; then
            $SUDO $INSTALL_CMD npm
        fi
    else
        NPM_VERSION=$(npm -v)
        print_success "npm 版本: $NPM_VERSION ✓"
    fi
    
    print_success "所有依赖检查完成"
}

# 克隆或更新项目
setup_project() {
    PROJECT_DIR="chatflow"
    GITHUB_REPO="https://github.com/KaiGe7384/chatflow.git"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "项目目录已存在，正在更新..."
        cd $PROJECT_DIR
        git pull origin main
    else
        print_status "克隆项目..."
        git clone $GITHUB_REPO $PROJECT_DIR
        cd $PROJECT_DIR
    fi
    
    print_success "项目设置完成"
}

# 部署应用
deploy_application() {
    print_status "开始部署应用..."
    
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
    
    print_success "应用部署完成"
}

# 显示结果
show_result() {
    # 检查服务状态
    if pm2 list | grep -q "chatflow.*online"; then
        print_success "ChatFlow 部署成功！"
        echo ""
        echo -e "${GREEN}访问信息:${NC}"
        echo -e "  应用地址: ${YELLOW}http://localhost:5000${NC}"
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
        echo -e "${GREEN}默认测试账号:${NC}"
        echo -e "  用户名: ${YELLOW}test1${NC} / 密码: ${YELLOW}123456${NC}"
        echo -e "  用户名: ${YELLOW}test2${NC} / 密码: ${YELLOW}123456${NC}"
        echo ""
        echo -e "${GREEN}🎉 部署成功！访问 http://localhost:5000 开始使用 ChatFlow！${NC}"
    else
        print_error "服务启动失败，请检查日志:"
        pm2 logs chatflow --lines 20
        exit 1
    fi
}

# 主函数
main() {
    print_header
    
    print_status "开始智能部署 ChatFlow..."
    
    # 检查并安装依赖
    check_and_install_dependencies
    
    # 设置项目
    setup_project
    
    # 部署应用
    deploy_application
    
    # 显示结果
    show_result
}

# 运行主函数
main "$@" 