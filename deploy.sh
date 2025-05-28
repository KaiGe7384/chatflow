#!/bin/bash

# ChatFlow 一键部署脚本
# 自动检测并安装所需环境依赖，支持多系统

set -e

# 禁用所有交互式提示
disable_interactive_prompts() {
    # 强制设置非交互式模式
    export DEBIAN_FRONTEND=noninteractive
    export NEEDRESTART_MODE=a
    export NEEDRESTART_SUSPEND=1
    export UCF_FORCE_CONFFNEW=1
    export UCF_FORCE_CONFFOLD=1
    
    # 创建needrestart配置目录
    mkdir -p /etc/needrestart/conf.d/ 2>/dev/null || true
    
    # 禁用needrestart的所有交互式提示
    cat > /etc/needrestart/conf.d/50local.conf 2>/dev/null << 'EOF' || true
# 禁用所有交互式提示
$nrconf{restart} = 'a';
$nrconf{kernelhints} = 0;
$nrconf{ucodehints} = 0;
EOF
    
    # 设置debconf为非交互式
    echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections 2>/dev/null || true
    echo 'debconf debconf/priority select critical' | debconf-set-selections 2>/dev/null || true
    
    # 禁用库重启提示
    echo 'libc6 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    echo 'libssl1.1:amd64 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    echo 'libssl3:amd64 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    
    # 禁用needrestart包的交互式提示
    echo 'needrestart needrestart/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    
    # 禁用服务重启提示
    echo 'dbus dbus/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    echo 'systemd systemd/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    
    print_status "已禁用所有交互式提示"
}

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
    echo -e "${GREEN}         ChatFlow 一键部署 v2.1.0${NC}"
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

# 清理Node.js冲突包
cleanup_nodejs_conflicts() {
    if [ "$OS" = "debian" ]; then
        print_status "清理可能冲突的Node.js包..."
        
        # 强制设置非交互式模式
        export DEBIAN_FRONTEND=noninteractive
        export NEEDRESTART_MODE=a
        export NEEDRESTART_SUSPEND=1
        export UCF_FORCE_CONFFNEW=1
        
        # 禁用所有交互式提示
        echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections 2>/dev/null || true
        echo 'libc6 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
        echo '$nrconf{restart} = "a";' > /etc/needrestart/conf.d/50local.conf 2>/dev/null || true
        
        # 创建needrestart配置目录
        mkdir -p /etc/needrestart/conf.d/ 2>/dev/null || true
        
        # 停止所有可能运行的Node.js进程
        pkill -f node 2>/dev/null || true
        
        # 清理冲突的包
        apt remove --purge -y -qq nodejs npm libnode-dev libnode72 node-gyp 2>/dev/null || true
        apt autoremove -y -qq 2>/dev/null || true
        apt autoclean 2>/dev/null || true
        
        # 清理残留的配置文件
        rm -rf /etc/apt/sources.list.d/nodesource.list* 2>/dev/null || true
        rm -rf /usr/share/keyrings/nodesource.gpg 2>/dev/null || true
        
        # 更新包列表
        apt update -qq
        
        print_success "冲突包清理完成"
    fi
}

# 检查是否有root权限
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "此脚本需要root权限运行"
        print_status "请使用: sudo $0"
        exit 1
    fi
    print_status "检测到root权限 ✓"
}

# 安装Node.js
install_nodejs() {
    print_status "正在安装 Node.js..."
    
    # 强制设置非交互式模式，避免任何弹窗
    export DEBIAN_FRONTEND=noninteractive
    export NEEDRESTART_MODE=a
    export NEEDRESTART_SUSPEND=1
    export UCF_FORCE_CONFFNEW=1
    export UCF_FORCE_CONFFOLD=1
    
    # 禁用所有交互式提示
    echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections 2>/dev/null || true
    echo 'libc6 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
    echo '$nrconf{restart} = "a";' > /etc/needrestart/conf.d/50local.conf 2>/dev/null || true
    
    # 创建needrestart配置目录（如果不存在）
    mkdir -p /etc/needrestart/conf.d/ 2>/dev/null || true
    
    if [ "$OS" = "debian" ]; then
        # Ubuntu/Debian - 使用更可靠的安装方法
        apt update -qq
        
        # 方法1：尝试从官方仓库安装
        if apt install -y -qq --no-install-recommends nodejs npm; then
            NODE_VERSION=$(node -v 2>/dev/null || echo "v0.0.0")
            NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
            if [ "$NODE_MAJOR" -ge 16 ]; then
                print_success "Node.js 从官方仓库安装成功: $NODE_VERSION"
                return 0
            else
                print_warning "官方仓库版本过低，尝试NodeSource仓库..."
                # 完全清理旧版本
                cleanup_nodejs_conflicts
            fi
        fi
        
        # 方法2：使用NodeSource仓库
        print_status "添加NodeSource仓库..."
        
        # 清理可能冲突的包
        cleanup_nodejs_conflicts
        
        # 重新设置非交互式模式（清理后可能被重置）
        export DEBIAN_FRONTEND=noninteractive
        export NEEDRESTART_MODE=a
        export NEEDRESTART_SUSPEND=1
        echo '$nrconf{restart} = "a";' > /etc/needrestart/conf.d/50local.conf 2>/dev/null || true
        
        # 下载并安装NodeSource仓库
        curl -fsSL https://deb.nodesource.com/setup_18.x -o nodesource_setup.sh
        bash nodesource_setup.sh
        
        # 强制安装，忽略冲突
        print_status "安装Node.js 18..."
        apt install -y -qq --no-install-recommends nodejs || {
            print_warning "标准安装失败，尝试强制安装..."
            dpkg --configure -a
            apt install -y --fix-broken || true
            apt install -y -qq nodejs --force-yes 2>/dev/null || apt install -y nodejs
        }
        
    elif [ "$OS" = "centos" ]; then
        # CentOS/RHEL
        print_status "添加NodeSource仓库..."
        curl -fsSL https://rpm.nodesource.com/setup_18.x -o nodesource_setup.sh
        bash nodesource_setup.sh
        yum install -y nodejs npm
        
    elif [ "$OS" = "alpine" ]; then
        # Alpine Linux
        apk add nodejs npm
        
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
    
    # 验证安装
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        NPM_VERSION=$(npm -v 2>/dev/null || echo "未安装")
        print_success "Node.js 安装完成: $NODE_VERSION"
        print_success "npm 版本: $NPM_VERSION"
    else
        print_error "Node.js 安装失败"
        exit 1
    fi
}

# 安装Git
install_git() {
    print_status "正在安装 Git..."
    
    # 强制设置非交互式模式，避免弹窗
    export DEBIAN_FRONTEND=noninteractive
    export NEEDRESTART_MODE=a
    export NEEDRESTART_SUSPEND=1
    
    # 禁用交互式提示
    echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections 2>/dev/null || true
    echo '$nrconf{restart} = "a";' > /etc/needrestart/conf.d/50local.conf 2>/dev/null || true
    
    if [ "$OS" = "debian" ]; then
        apt install -y -qq --no-install-recommends git
    elif [ "$OS" = "centos" ]; then
        yum install -y git
    elif [ "$OS" = "alpine" ]; then
        apk add git
    else
        print_warning "请手动安装 Git"
        return 1
    fi
    
    print_success "Git 安装完成"
}

# 安装基础工具
install_basic_tools() {
    print_status "正在安装基础工具..."
    
    # 强制设置非交互式模式，避免弹窗
    export DEBIAN_FRONTEND=noninteractive
    export NEEDRESTART_MODE=a
    export NEEDRESTART_SUSPEND=1
    export UCF_FORCE_CONFFNEW=1
    
    # 禁用needrestart服务重启提示
    echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections 2>/dev/null || true
    echo '$nrconf{restart} = "a";' > /etc/needrestart/conf.d/50local.conf 2>/dev/null || true
    
    if [ "$OS" = "debian" ]; then
        # 禁用所有交互式提示
        echo 'libc6 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
        echo 'libssl1.1:amd64 libraries/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
        
        apt update -qq
        apt install -y -qq --no-install-recommends curl wget openssl build-essential
        
        # 禁用needrestart包的交互式提示
        if dpkg -l | grep -q needrestart; then
            echo 'needrestart needrestart/restart-without-asking boolean true' | debconf-set-selections 2>/dev/null || true
        fi
        
    elif [ "$OS" = "centos" ]; then
        yum install -y curl wget openssl gcc gcc-c++ make
    elif [ "$OS" = "alpine" ]; then
        apk add curl wget openssl build-base
    fi
    
    print_success "基础工具安装完成"
}

# 检测系统类型
detect_system() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        print_error "无法检测系统类型"
        exit 1
    fi
    
    case $OS in
        ubuntu|debian)
            DISTRO="debian"
            ;;
        centos|rhel|rocky|almalinux)
            DISTRO="rhel"
            ;;
        alpine)
            DISTRO="alpine"
            ;;
        *)
            print_warning "未明确支持的系统: $OS，尝试使用通用方法"
            DISTRO="debian"
            ;;
    esac
    
    print_status "检测到系统: $OS $VERSION ($DISTRO)"
}

# 检查并安装依赖
check_dependencies() {
    print_status "检查系统依赖..."
    
    # 检测操作系统
    detect_os
    check_root
    
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
            # 强制设置非交互式模式
            export DEBIAN_FRONTEND=noninteractive
            export NEEDRESTART_MODE=a
            export NEEDRESTART_SUSPEND=1
            echo '$nrconf{restart} = "a";' > /etc/needrestart/conf.d/50local.conf 2>/dev/null || true
            
            apt install -y -qq --no-install-recommends npm
        elif [ "$OS" = "centos" ]; then
            yum install -y npm
        fi
    else
        NPM_VERSION=$(npm -v)
        print_success "npm 版本: $NPM_VERSION ✓"
    fi
    
    print_success "所有依赖检查完成"
}

# 克隆或更新项目
setup_project() {
    GITHUB_REPO="https://github.com/KaiGe7384/chatflow.git"
    
    # 检查是否已经在项目目录中
    if [ -f "package.json" ] && [ -d "client" ] && [ -d "server" ]; then
        print_status "检测到已在ChatFlow项目目录中，正在更新..."
        git pull origin main || {
            print_warning "Git更新失败，可能是非Git目录或网络问题，继续部署..."
        }
        print_success "项目设置完成"
        return 0
    fi
    
    # 检查是否存在chatflow子目录
    if [ -d "chatflow" ]; then
        print_warning "项目目录已存在，正在更新..."
        cd chatflow
        git pull origin main || {
            print_warning "Git更新失败，可能是网络问题，继续部署..."
        }
    else
        print_status "克隆项目..."
        git clone $GITHUB_REPO chatflow
        cd chatflow
    fi
    
    print_success "项目设置完成"
}

# 部署应用
deploy_application() {
    print_status "开始部署应用..."
    
    # 预防性清理PM2，避免EPIPE错误
    print_status "清理PM2环境，避免EPIPE错误..."
    pm2 kill 2>/dev/null || true
    rm -rf ~/.pm2/logs/* 2>/dev/null || true
    rm -rf ~/.pm2/pids/* 2>/dev/null || true
    rm -rf /tmp/pm2-* 2>/dev/null || true
    
    # 重新初始化PM2
    print_status "初始化PM2..."
    pm2 ping >/dev/null 2>&1 || true
    
    # 停止现有进程（如果存在）
    print_status "停止现有服务..."
    pm2 stop chatflow 2>/dev/null || true
    pm2 delete chatflow 2>/dev/null || true
    
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
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
}
EOF
    
    # 创建日志目录
    mkdir -p logs
    
    # 创建package.json的start脚本（如果不存在）
    if [ -f package.json ]; then
        print_status "更新 package.json 脚本..."
        # 备份原文件
        cp package.json package.json.bak
        # 使用node添加start脚本
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json'));
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.start = 'pm2 start ecosystem.config.js';
        pkg.scripts.dev = 'cd server && npm run dev';
        pkg.scripts.stop = 'pm2 stop chatflow';
        pkg.scripts.restart = 'pm2 restart chatflow';
        pkg.scripts.logs = 'pm2 logs chatflow';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        " 2>/dev/null || true
    else
        print_status "创建 package.json..."
        cat > package.json << EOF
{
  "name": "chatflow",
  "version": "1.0.0",
  "description": "ChatFlow 即时通讯应用",
  "scripts": {
    "start": "pm2 start ecosystem.config.js",
    "dev": "cd server && npm run dev",
    "stop": "pm2 stop chatflow",
    "restart": "pm2 restart chatflow",
    "logs": "pm2 logs chatflow"
  },
  "keywords": ["chat", "socket.io", "react"],
  "author": "KaiGe",
  "license": "MIT"
}
EOF
    fi
    
    # 确保服务器文件存在
    if [ ! -f "server/index.js" ]; then
        print_error "服务器文件 server/index.js 不存在，请检查项目完整性"
        exit 1
    fi
    
    # 检查端口是否被占用
    print_status "检查端口5000状态..."
    if netstat -tln 2>/dev/null | grep -q ":5000 "; then
        print_warning "端口5000已被占用，尝试释放..."
        # 找到并杀死占用5000端口的进程
        local pid=$(lsof -ti:5000 2>/dev/null || true)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # 确认当前在正确的项目目录中
    if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
        print_error "项目结构不完整，请检查克隆是否成功"
        print_status "当前目录内容："
        ls -la
        exit 1
    fi
    
    PROJECT_DIR=$(pwd)
    print_status "确认项目目录: $PROJECT_DIR"
    
    # 启动应用
    print_status "启动 ChatFlow 应用..."
    pm2 start ecosystem.config.js
    
    # 等待应用启动
    print_status "等待应用启动..."
    sleep 8
    
    # 验证应用是否正确启动
    local retry_count=0
    local max_retries=5
    
    while [ $retry_count -lt $max_retries ]; do
        if pm2 list | grep -q "chatflow.*online"; then
            break
        fi
        
        print_warning "应用未正常启动，重试 $((retry_count + 1))/$max_retries..."
        pm2 restart chatflow 2>/dev/null || pm2 start ecosystem.config.js
        sleep 5
        retry_count=$((retry_count + 1))
    done
    
    # 保存PM2配置
    pm2 save
    
    print_success "应用部署完成"
}

# 显示应用信息
show_application_info() {
    local SERVER_IP=$(get_server_ip)
    
    echo ""
    echo -e "${GREEN}🎉 ChatFlow 部署成功！${NC}"
    echo ""
    
    # 测试应用连通性
    print_status "测试应用连通性..."
    
    # 检查PM2状态
    local pm2_status=$(pm2 list | grep "chatflow" | awk '{print $10}' 2>/dev/null || echo "unknown")
    
    # 检查端口监听
    local port_listening=false
    if netstat -tln 2>/dev/null | grep -q ":5000 "; then
        port_listening=true
    fi
    
    # 测试本地HTTP连接
    local local_http=false
    if curl -s --connect-timeout 5 http://localhost:5000 >/dev/null 2>&1; then
        local_http=true
    fi
    
    echo -e "${GREEN}系统状态:${NC}"
    echo -e "  PM2应用状态: ${YELLOW}$pm2_status${NC}"
    
    if [ "$port_listening" = true ]; then
        echo -e "  端口5000监听: ${GREEN}✓ 正常${NC}"
    else
        echo -e "  端口5000监听: ${RED}✗ 未监听${NC}"
    fi
    
    if [ "$local_http" = true ]; then
        echo -e "  HTTP连接测试: ${GREEN}✓ 正常${NC}"
    else
        echo -e "  HTTP连接测试: ${YELLOW}⚠ 可能需要等待${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}访问信息:${NC}"
    echo -e "  本地访问: ${YELLOW}http://localhost:5000${NC}"
    echo -e "  外网访问: ${YELLOW}http://$SERVER_IP:5000${NC}"
    echo -e "  API接口: ${YELLOW}http://$SERVER_IP:5000/api${NC}"
    echo ""
    
    # 防火墙检查
    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        print_warning "检测到UFW防火墙已启用"
        echo -e "  如需外网访问，请运行: ${YELLOW}sudo ufw allow 5000${NC}"
        echo ""
    fi
    
    if command -v firewall-cmd &> /dev/null && firewall-cmd --state 2>/dev/null | grep -q "running"; then
        print_warning "检测到firewalld防火墙正在运行"
        echo -e "  如需外网访问，请运行: ${YELLOW}sudo firewall-cmd --permanent --add-port=5000/tcp && sudo firewall-cmd --reload${NC}"
        echo ""
    fi
    
    echo -e "${GREEN}管理命令:${NC}"
    echo -e "  查看状态: ${YELLOW}cf status${NC} 或 ${YELLOW}pm2 status chatflow${NC}"
    echo -e "  查看日志: ${YELLOW}cf logs${NC} 或 ${YELLOW}pm2 logs chatflow${NC}"
    echo -e "  重启应用: ${YELLOW}cf restart${NC} 或 ${YELLOW}pm2 restart chatflow${NC}"
    echo -e "  停止应用: ${YELLOW}cf stop${NC} 或 ${YELLOW}pm2 stop chatflow${NC}"
    echo ""
    
    # 如果应用未正常运行，提供故障排除信息
    if [ "$pm2_status" != "online" ] || [ "$port_listening" = false ]; then
        echo -e "${YELLOW}故障排除:${NC}"
        echo -e "  检查应用日志: ${YELLOW}pm2 logs chatflow --lines 50${NC}"
        echo -e "  查看错误日志: ${YELLOW}cat logs/err.log${NC}"
        echo -e "  检查端口占用: ${YELLOW}netstat -tlnp | grep 5000${NC}"
        echo -e "  手动重启: ${YELLOW}pm2 restart chatflow${NC}"
        echo ""
        
        # 显示最新日志
        if [ -f "logs/err.log" ] && [ -s "logs/err.log" ]; then
            print_warning "发现错误日志，最新10行："
            tail -10 logs/err.log 2>/dev/null | sed 's/^/    /' || true
            echo ""
        fi
    fi
    
    echo -e "${GREEN}项目目录:${NC} $(pwd)"
    echo -e "${GREEN}版本信息:${NC} ChatFlow v2.1.0"
    echo ""
    print_success "部署完成！请访问上述地址开始使用ChatFlow"
}

# 获取服务器IP地址
get_server_ip() {
    SERVER_IP=""
    if command -v curl &> /dev/null; then
        SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || curl -s --connect-timeout 5 icanhazip.com 2>/dev/null)
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    echo $SERVER_IP
}

# 卸载函数
uninstall_chatflow() {
    print_header
    echo -e "${RED}ChatFlow 卸载程序${NC}"
    echo ""
    
    # 确认卸载
    read -p "确定要卸载ChatFlow吗？这将删除所有数据和配置 [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "卸载已取消"
        exit 0
    fi
    
    print_status "开始卸载ChatFlow..."
    
    # 停止并删除PM2进程
    print_status "停止ChatFlow服务..."
    pm2 stop chatflow 2>/dev/null || true
    pm2 delete chatflow 2>/dev/null || true
    pm2 save 2>/dev/null || true
    
    # 删除开机自启动
    print_status "移除开机自启动..."
    pm2 unstartup 2>/dev/null || true
    
    # 删除项目目录
    PROJECT_DIRS=("/root/chatflow" "~/chatflow" "./chatflow")
    for dir in "${PROJECT_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_status "删除项目目录: $dir"
            rm -rf "$dir"
        fi
    done
    
    # 删除cf命令
    if [ -f "/usr/local/bin/cf" ]; then
        print_status "删除cf管理命令..."
        rm -f /usr/local/bin/cf
    fi
    
    # 清理PM2相关文件
    print_status "清理PM2文件..."
    rm -rf ~/.pm2/logs/chatflow* 2>/dev/null || true
    rm -rf ~/.pm2/pids/chatflow* 2>/dev/null || true
    
    # 清理防火墙规则（询问用户）
    if command -v ufw &> /dev/null; then
        read -p "是否移除UFW防火墙5000端口规则？ [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ufw delete allow 5000 2>/dev/null || true
        fi
    fi
    
    if command -v firewall-cmd &> /dev/null; then
        read -p "是否移除firewalld防火墙5000端口规则？ [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            firewall-cmd --permanent --remove-port=5000/tcp 2>/dev/null || true
            firewall-cmd --reload 2>/dev/null || true
        fi
    fi
    
    echo ""
    print_success "ChatFlow 卸载完成！"
    echo ""
    print_status "保留的组件（如需要可手动卸载）："
    echo -e "  - Node.js: ${YELLOW}apt remove nodejs npm${NC} (Debian/Ubuntu)"
    echo -e "  - PM2: ${YELLOW}npm uninstall -g pm2${NC}"
    echo -e "  - Git: ${YELLOW}apt remove git${NC} (Debian/Ubuntu)"
}

# 主函数
main() {
    # 检查参数
    if [ "$1" = "uninstall" ] || [ "$1" = "--uninstall" ] || [ "$1" = "-u" ]; then
        uninstall_chatflow
        exit 0
    fi
    
    print_header
    
    # 检查root权限
    if [ "$EUID" -ne 0 ]; then
        print_error "此脚本需要root权限运行"
        print_status "请使用: sudo bash $0"
        print_status "卸载使用: sudo bash $0 uninstall"
        exit 1
    fi
    
    print_status "开始部署 ChatFlow..."
    
    # 禁用交互式提示
    disable_interactive_prompts
    
    # 检测系统类型
    detect_system
    
    # 检查并安装依赖
    check_dependencies
    
    # 克隆或更新项目
    setup_project
    
    # 确认当前在正确的项目目录中
    if [ ! -f "package.json" ] || [ ! -d "client" ] || [ ! -d "server" ]; then
        print_error "项目结构不完整，请检查克隆是否成功"
        print_status "当前目录内容："
        ls -la
        exit 1
    fi
    
    PROJECT_DIR=$(pwd)
    print_status "确认项目目录: $PROJECT_DIR"
    
    # 部署应用
    deploy_application
    
    # 设置PM2开机自启动
    print_status "设置开机自启动..."
    pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup 2>/dev/null || true
    pm2 save
    
    # 创建自定义cf命令管理工具
    print_status "创建自定义cf管理命令..."
    cat > /usr/local/bin/cf << 'EOF'
#!/bin/bash

# ChatFlow 管理命令工具

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_help() {
    echo -e "${BLUE}ChatFlow 管理工具 (cf)${NC}"
    echo ""
    echo -e "${GREEN}可用命令:${NC}"
    echo -e "  ${YELLOW}cf status${NC}     - 查看应用状态"
    echo -e "  ${YELLOW}cf start${NC}      - 启动应用"
    echo -e "  ${YELLOW}cf stop${NC}       - 停止应用"
    echo -e "  ${YELLOW}cf restart${NC}    - 重启应用"
    echo -e "  ${YELLOW}cf logs${NC}       - 查看实时日志"
    echo -e "  ${YELLOW}cf logs -e${NC}    - 查看错误日志"
    echo -e "  ${YELLOW}cf update${NC}     - 更新应用"
    echo -e "  ${YELLOW}cf info${NC}       - 显示应用信息"
    echo -e "  ${YELLOW}cf monitor${NC}    - 监控模式"
    echo -e "  ${YELLOW}cf uninstall${NC}  - 卸载ChatFlow"
    echo -e "  ${YELLOW}cf help${NC}       - 显示此帮助"
    echo ""
}

get_server_ip() {
    SERVER_IP=""
    if command -v curl &> /dev/null; then
        SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || curl -s --connect-timeout 5 icanhazip.com 2>/dev/null)
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
    fi
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    echo $SERVER_IP
}

case "$1" in
    "status"|"st")
        echo -e "${BLUE}ChatFlow 应用状态:${NC}"
        pm2 status chatflow
        ;;
    "start")
        echo -e "${BLUE}启动 ChatFlow...${NC}"
        pm2 start chatflow
        ;;
    "stop")
        echo -e "${BLUE}停止 ChatFlow...${NC}"
        pm2 stop chatflow
        ;;
    "restart"|"rs")
        echo -e "${BLUE}重启 ChatFlow...${NC}"
        pm2 restart chatflow
        ;;
    "logs"|"log")
        if [ "$2" = "-e" ]; then
            echo -e "${BLUE}ChatFlow 错误日志:${NC}"
            pm2 logs chatflow --err --lines 50
        else
            echo -e "${BLUE}ChatFlow 实时日志 (Ctrl+C退出):${NC}"
            pm2 logs chatflow --lines 30
        fi
        ;;
    "update")
        echo -e "${BLUE}更新 ChatFlow...${NC}"
        cd /root/chatflow 2>/dev/null || cd ~/chatflow
        git pull origin main
        npm install
        cd client && npm install && npm run build && cd ..
        pm2 restart chatflow
        echo -e "${GREEN}更新完成！${NC}"
        ;;
    "info")
        SERVER_IP=$(get_server_ip)
        echo -e "${GREEN}ChatFlow 应用信息:${NC}"
        echo -e "  应用地址: ${YELLOW}http://$SERVER_IP:5000${NC}"
        echo -e "  API接口: ${YELLOW}http://$SERVER_IP:5000/api${NC}"
        echo -e "  应用状态: $(pm2 jlist | jq -r '.[] | select(.name=="chatflow") | .pm2_env.status' 2>/dev/null || echo "检查中...")"
        echo -e "  项目目录: ${YELLOW}/root/chatflow${NC}"
        echo ""
        echo -e "${GREEN}默认测试账号:${NC}"
        echo -e "  用户名: ${YELLOW}test1${NC} / 密码: ${YELLOW}123456${NC}"
        echo -e "  用户名: ${YELLOW}test2${NC} / 密码: ${YELLOW}123456${NC}"
        ;;
    "monitor"|"mon")
        echo -e "${BLUE}ChatFlow 监控模式 (Ctrl+C退出):${NC}"
        pm2 monit
        ;;
    "uninstall")
        echo -e "${RED}ChatFlow 卸载程序${NC}"
        echo ""
        read -p "确定要卸载ChatFlow吗？这将删除所有数据和配置 [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}卸载已取消${NC}"
            exit 0
        fi
        
        echo -e "${BLUE}开始卸载ChatFlow...${NC}"
        
        # 停止并删除PM2进程
        echo -e "${BLUE}停止ChatFlow服务...${NC}"
        pm2 stop chatflow 2>/dev/null || true
        pm2 delete chatflow 2>/dev/null || true
        pm2 save 2>/dev/null || true
        
        # 删除开机自启动
        echo -e "${BLUE}移除开机自启动...${NC}"
        pm2 unstartup 2>/dev/null || true
        
        # 删除项目目录
        PROJECT_DIRS=("/root/chatflow" "~/chatflow")
        for dir in "\${PROJECT_DIRS[@]}"; do
            if [ -d "\$dir" ]; then
                echo -e "${BLUE}删除项目目录: \$dir${NC}"
                rm -rf "\$dir"
            fi
        done
        
        # 删除cf命令（自删除，需要在最后执行）
        echo -e "${GREEN}ChatFlow 卸载完成！${NC}"
        echo -e "${YELLOW}正在删除cf命令...${NC}"
        rm -f /usr/local/bin/cf
        ;;
    "help"|"-h"|"--help"|"")
        print_help
        ;;
    *)
        echo -e "${RED}未知命令: $1${NC}"
        echo ""
        print_help
        ;;
esac
EOF
    
    # 设置执行权限
    chmod +x /usr/local/bin/cf
    print_success "自定义cf命令已创建"
    
    # 显示应用信息
    show_application_info
    
    print_success "ChatFlow 部署流程全部完成！"
}

# 运行主函数
main "$@" 