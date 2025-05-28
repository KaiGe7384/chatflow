#!/bin/bash

#==============================================================================
# ChatFlow 一键部署脚本
# 项目: ChatFlow 即时通讯应用
# 作者: KaiGe
# 版本: v2.4.0
# 更新时间: 2024-12-19
#
# 功能说明:
# 1. 自动检测系统类型并安装依赖
# 2. 智能项目目录管理和代码更新
# 3. 动态端口分配，避免端口冲突
# 4. 修复API连接问题，解决"Failed to fetch"错误
# 5. 前端动态API地址配置
# 6. 前端静态文件服务和SPA路由支持
# 7. PM2进程管理和自动重启
# 8. 完整的卸载功能
# 9. cf命令行工具管理
#
# 更新内容 v2.4.0:
# - 🆕 修复前端API连接问题，动态检测服务器地址
# - 🔧 完善Socket.io连接配置，支持动态端口
# - 💡 增强CORS配置，确保跨域请求正常工作
# - 🛡️ 优化错误处理和调试信息输出
# - 📊 cf命令支持更详细的连接状态检测
# - 🎯 改进静态文件服务和API代理配置
#
# 支持系统: Ubuntu/Debian, CentOS/RHEL, Alpine Linux
# 依赖: Node.js 18+, npm, git, pm2
#==============================================================================

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
    echo -e "${GREEN}         ChatFlow 一键部署 v2.4.0${NC}"
    echo -e "${GREEN}         智能环境检测与安装${NC}"
    echo ""
}

# 获取可用端口
get_available_port() {
    local start_port=${1:-5000}
    local max_port=${2:-6000}
    
    for port in $(seq $start_port $max_port); do
        if ! netstat -tln 2>/dev/null | grep -q ":$port "; then
            if ! lsof -ti:$port >/dev/null 2>&1; then
                echo $port
                return 0
            fi
        fi
    done
    
    # 如果都被占用，使用随机端口
    local random_port=$(shuf -i 8000-9999 -n 1)
    while netstat -tln 2>/dev/null | grep -q ":$random_port " || lsof -ti:$random_port >/dev/null 2>&1; do
        random_port=$(shuf -i 8000-9999 -n 1)
    done
    
    echo $random_port
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
    
    # 获取可用端口
    CHATFLOW_PORT=$(get_available_port 5000 6000)
    print_status "分配端口: $CHATFLOW_PORT"
    
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
    
    # 验证项目结构
    print_status "验证项目结构..."
    if [ ! -d "client" ] || [ ! -d "server" ]; then
        print_error "项目结构不完整，缺少client或server目录"
        exit 1
    fi
    
    # 安装根目录依赖（如果存在）
    if [ -f "package.json" ]; then
        print_status "安装根目录依赖..."
        npm install
    fi
    
    # 安装服务端依赖
    print_status "安装服务端依赖..."
    cd server && npm install && cd ..
    
    # 安装客户端依赖
    print_status "安装客户端依赖..."
    cd client && npm install && cd ..
    
    # 配置前端API代理，解决Failed to fetch问题
    print_status "配置前端API代理..."
    
    # 检查前端是否有代理配置
    if [ -f "client/package.json" ]; then
        # 添加代理配置到package.json
        cd client
        cp package.json package.json.backup
        
        # 使用node脚本添加代理配置
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json'));
        pkg.proxy = 'http://localhost:$CHATFLOW_PORT';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('✓ 已添加API代理配置');
        " 2>/dev/null || {
            print_warning "无法自动配置代理，创建setupProxy.js"
            
            # 创建setupProxy.js文件
            mkdir -p src
            cat > src/setupProxy.js << EOF
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:$CHATFLOW_PORT',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );
  
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://localhost:$CHATFLOW_PORT',
      changeOrigin: true,
      ws: true,
      secure: false
    })
  );
};
EOF
            print_success "创建了setupProxy.js代理配置"
        }
        cd ..
    fi
    
    # 构建前端应用
    print_status "构建前端应用..."
    cd client
    
    # 设置环境变量
    export REACT_APP_API_URL="http://localhost:$CHATFLOW_PORT"
    export GENERATE_SOURCEMAP=false
    
    # 检查是否有构建脚本
    if ! npm run build 2>/dev/null; then
        print_warning "构建命令失败，尝试其他构建方式..."
        if [ -f "package.json" ]; then
            # 检查package.json中的脚本
            if grep -q '"build"' package.json; then
                npm run build
            else
                print_warning "没有找到build脚本，检查是否为开发环境..."
                # 对于某些项目，可能需要其他构建命令
                npm run prod 2>/dev/null || npm run production 2>/dev/null || {
                    print_error "无法找到合适的构建命令"
                    cd ..
                    exit 1
                }
            fi
        fi
    fi
    
    cd ..
    
    # 验证前端构建结果
    print_status "验证前端构建..."
    if [ -d "client/build" ]; then
        print_success "前端构建成功，发现build目录"
        BUILD_DIR="client/build"
    elif [ -d "client/dist" ]; then
        print_success "前端构建成功，发现dist目录"
        BUILD_DIR="client/dist"
    else
        print_warning "未找到标准构建目录，检查client目录内容..."
        ls -la client/
        # 尝试在server中查找静态文件配置
        if [ -d "client/public" ]; then
            print_warning "使用public目录作为静态文件"
            BUILD_DIR="client/public"
        else
            print_error "无法找到前端构建文件"
            exit 1
        fi
    fi
    
    # 确保服务器能正确服务静态文件
    print_status "配置静态文件服务..."
    
    # 检查服务器是否配置了静态文件服务
    if [ -f "server/index.js" ]; then
        # 创建或更新服务器配置以支持静态文件
        print_status "检查服务器静态文件配置..."
        
        # 备份原服务器文件
        cp server/index.js server/index.js.backup
        
        # 检查是否已经配置了静态文件服务
        if ! grep -q "express.static" server/index.js; then
            print_status "添加静态文件服务配置..."
            
            # 创建静态文件服务补丁
            cat > server/static-patch.js << EOF
// 静态文件服务补丁 - 在原服务器基础上添加前端支持
const express = require('express');
const path = require('path');
const fs = require('fs');

// 导出配置函数
module.exports = function(app) {
    // 添加CORS支持，解决API调用问题
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });
    
    // 服务静态文件 - 支持多种构建目录
    const staticDirs = [
        path.join(__dirname, '../client/build'),
        path.join(__dirname, '../client/dist'), 
        path.join(__dirname, '../client/public')
    ];
    
    // 为每个可能的静态目录设置中间件
    staticDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            console.log(\`✓ 配置静态文件目录: \${dir}\`);
            app.use(express.static(dir));
        }
    });
    
    // 处理SPA路由 - 确保React Router正常工作
    app.get('*', (req, res, next) => {
        // 跳过API和Socket.IO请求
        if (req.path.startsWith('/api/') || 
            req.path.startsWith('/socket.io/') ||
            req.path.includes('.')) {
            return next();
        }
        
        // 查找index.html文件
        const indexPaths = staticDirs.map(dir => path.join(dir, 'index.html'));
        
        for (const indexPath of indexPaths) {
            if (fs.existsSync(indexPath)) {
                console.log(\`✓ 服务前端页面: \${indexPath}\`);
                return res.sendFile(indexPath);
            }
        }
        
        // 如果找不到前端文件，返回友好错误
        res.status(404).json({
            error: 'Frontend not found',
            message: 'Please ensure the frontend is built correctly',
            availableRoutes: ['/api']
        });
    });
};
EOF
            
            # 修改原服务器文件以包含静态文件补丁
            print_status "应用静态文件补丁..."
            
            # 在server/index.js末尾添加补丁调用
            if ! grep -q "static-patch" server/index.js; then
                # 备份并修改
                cat >> server/index.js << EOF

// 应用静态文件服务补丁
try {
    const staticPatch = require('./static-patch');
    staticPatch(app);
    console.log('✓ 静态文件服务已配置');
} catch (error) {
    console.warn('⚠ 静态文件补丁应用失败:', error.message);
}
EOF
                print_success "静态文件补丁已应用"
            else
                print_warning "静态文件补丁已存在，跳过"
            fi
        else
            print_success "检测到已有express.static配置"
        fi
    else
        print_error "服务器文件 server/index.js 不存在"
        exit 1
    fi
    
    # 创建环境配置
    print_status "创建环境配置..."
    cat > server/.env << EOF
PORT=$CHATFLOW_PORT
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "chatflow-$(date +%s)-secret")
NODE_ENV=production
CORS_ORIGIN=*
EOF
    print_success "环境配置文件已创建，端口: $CHATFLOW_PORT"
    
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
      PORT: $CHATFLOW_PORT,
      CORS_ORIGIN: '*'
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
    print_status "检查端口$CHATFLOW_PORT状态..."
    if netstat -tln 2>/dev/null | grep -q ":$CHATFLOW_PORT "; then
        print_warning "端口$CHATFLOW_PORT已被占用，尝试释放..."
        # 找到并杀死占用端口的进程
        local pid=$(lsof -ti:$CHATFLOW_PORT 2>/dev/null || true)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # 最终验证项目结构
    print_status "最终验证项目结构..."
    if [ ! -f "package.json" ] && [ ! -f "server/package.json" ]; then
        print_error "项目配置不完整，缺少package.json"
        exit 1
    fi
    
    if [ ! -d "client" ] || [ ! -d "server" ]; then
        print_error "项目结构不完整，请检查克隆是否成功"
        print_status "当前目录内容："
        ls -la
        exit 1
    fi
    
    PROJECT_DIR=$(pwd)
    print_status "确认项目目录: $PROJECT_DIR"
    print_status "前端构建目录: $BUILD_DIR"
    print_status "应用端口: $CHATFLOW_PORT"
    
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
    
    # 验证前端是否可访问
    print_status "验证前端服务..."
    sleep 3
    if curl -s --connect-timeout 10 http://localhost:$CHATFLOW_PORT | grep -q "html\|<!DOCTYPE\|<html"; then
        print_success "前端服务验证成功！"
    else
        print_warning "前端服务可能有问题，请检查日志"
        print_status "显示最新错误日志："
        pm2 logs chatflow --err --lines 10 2>/dev/null || true
    fi
    
    # API连接测试和修复
    print_status "测试API连接..."
    sleep 2
    
    # 测试API是否响应
    api_test_result=$(curl -s --connect-timeout 10 --max-time 15 \
        -w "HTTP_CODE:%{http_code}" \
        http://localhost:$CHATFLOW_PORT/api/rooms 2>/dev/null || echo "FAILED")
    
    if echo "$api_test_result" | grep -q "HTTP_CODE:200"; then
        print_success "API连接测试成功！"
    else
        print_warning "API连接测试失败，尝试修复..."
        
        # 检查API路由是否正确配置
        if [ -f "server/index.js" ]; then
            print_status "检查API路由配置..."
            
            # 确保CORS配置正确
            if ! grep -q "Access-Control-Allow-Origin" server/index.js; then
                print_status "添加CORS配置..."
                
                # 备份原文件
                cp server/index.js server/index.js.cors-backup
                
                # 在app定义后添加CORS中间件
                sed -i '/const app = express();/a\\n// CORS配置 - 解决Failed to fetch问题\napp.use((req, res, next) => {\n  res.header('\''Access-Control-Allow-Origin'\'', '\''*'\'');\n  res.header('\''Access-Control-Allow-Methods'\'', '\''GET, POST, PUT, DELETE, OPTIONS'\'');\n  res.header('\''Access-Control-Allow-Headers'\'', '\''Origin, X-Requested-With, Content-Type, Accept, Authorization, user-id'\'');\n  if (req.method === '\''OPTIONS'\'') {\n    return res.sendStatus(200);\n  }\n  next();\n});' server/index.js
                
                print_success "CORS配置已添加"
            fi
            
            # 重启应用以应用更改
            print_status "重启应用以应用API修复..."
            pm2 restart chatflow
            sleep 5
            
            # 再次测试API
            print_status "重新测试API连接..."
            api_test_result=$(curl -s --connect-timeout 10 --max-time 15 \
                -w "HTTP_CODE:%{http_code}" \
                http://localhost:$CHATFLOW_PORT/api/rooms 2>/dev/null || echo "FAILED")
            
            if echo "$api_test_result" | grep -q "HTTP_CODE:200"; then
                print_success "API修复成功！"
            else
                print_error "API修复失败，请查看详细日志"
                print_status "API测试结果: $api_test_result"
                pm2 logs chatflow --lines 20 2>/dev/null || true
            fi
        fi
    fi
    
    # 测试Socket.io连接
    print_status "测试Socket.io连接..."
    socket_test_result=$(curl -s --connect-timeout 5 \
        http://localhost:$CHATFLOW_PORT/socket.io/ 2>/dev/null || echo "FAILED")
    
    if echo "$socket_test_result" | grep -q "3"; then
        print_success "Socket.io连接正常！"
    else
        print_warning "Socket.io连接可能有问题"
    fi
    
    print_success "应用部署完成"
}

# 显示应用信息
show_application_info() {
    print_status "ChatFlow 应用信息"
    
    # 获取动态端口
    local port="5000"
    if [ -f "server/.env" ]; then
        port=$(grep "^PORT=" server/.env 2>/dev/null | cut -d'=' -f2 | head -1)
    fi
    
    # 获取服务器IP地址
    local server_ip=$(get_server_ip)
    
    echo ""
    echo "============================================"
    echo "          📱 ChatFlow 即时通讯           "
    echo "============================================"
    echo ""
    echo "🌐 访问地址："
    echo "   本地访问:   http://localhost:$port"
    echo "   公网访问:   http://$server_ip:$port"
    echo ""
    echo "🚀 服务状态："
    if pm2 list | grep -q "chatflow.*online"; then
        echo "   ✅ 应用状态: 运行中"
    else
        echo "   ❌ 应用状态: 已停止"
    fi
    echo "   🔌 端口号: $port"
    echo "   🏠 项目目录: $(pwd)"
    echo ""
    echo "📋 管理命令："
    echo "   cf status      - 查看运行状态"
    echo "   cf start       - 启动应用"
    echo "   cf stop        - 停止应用"
    echo "   cf restart     - 重启应用"
    echo "   cf logs        - 查看日志"
    echo "   cf logs -e     - 查看错误日志"
    echo "   cf info        - 显示应用信息"
    echo "   cf update      - 更新应用"
    echo "   cf monitor     - 监控模式"
    echo "   cf uninstall   - 卸载应用"
    echo "   cf help        - 显示帮助"
    echo ""
    echo "🔧 故障排除："
    echo "   • 如果无法访问，请检查防火墙设置"
    echo "   • 确保端口 $port 未被其他服务占用"
    echo "   • 查看日志: cf logs"
    echo "   • API连接失败: 检查代理配置和CORS设置"
    echo ""
    echo "🗑️  卸载应用："
    echo "   方法1: cf uninstall"
    echo "   方法2: curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash -s uninstall"
    echo ""
    echo "============================================"
    echo ""
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

# ChatFlow 管理脚本
# 用法: cf [command]

# 颜色设置
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 找到ChatFlow安装目录
find_chatflow_dir() {
    # 常见安装路径
    local possible_dirs=(
        "/opt/chatflow"
        "/var/www/chatflow"
        "/home/$(whoami)/chatflow"
        "$(pwd)"
    )
    
    for dir in "${possible_dirs[@]}"; do
        if [ -d "$dir" ] && [ -f "$dir/ecosystem.config.js" ]; then
            echo "$dir"
            return 0
        fi
    done
    
    # 如果都找不到，搜索整个系统
    local found_dir=$(find /opt /var/www /home -name "ecosystem.config.js" -path "*/chatflow/*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
    if [ -n "$found_dir" ] && [ -f "$found_dir/ecosystem.config.js" ]; then
        echo "$found_dir"
        return 0
    fi
    
    return 1
}

# 获取项目端口
get_project_port() {
    local chatflow_dir="$1"
    local port="5000"
    
    if [ -f "$chatflow_dir/server/.env" ]; then
        port=$(grep "^PORT=" "$chatflow_dir/server/.env" 2>/dev/null | cut -d'=' -f2 | head -1)
    fi
    
    echo "$port"
}

# 获取服务器IP
get_server_ip() {
    local ip=""
    
    # 尝试多种方法获取外网IP
    ip=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null) || \
    ip=$(curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null) || \
    ip=$(curl -s --connect-timeout 5 icanhazip.com 2>/dev/null) || \
    ip=$(wget -qO- --timeout=5 ifconfig.me 2>/dev/null) || \
    ip="127.0.0.1"
    
    echo "$ip"
}

# 打印状态信息
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 显示应用信息
show_info() {
    local chatflow_dir="$1"
    local port=$(get_project_port "$chatflow_dir")
    local server_ip=$(get_server_ip)
    
    echo ""
    echo "============================================"
    echo "          📱 ChatFlow 即时通讯           "
    echo "============================================"
    echo ""
    echo "🌐 访问地址："
    echo "   本地访问:   http://localhost:$port"
    echo "   公网访问:   http://$server_ip:$port"
    echo ""
    echo "🚀 服务状态："
    if pm2 list | grep -q "chatflow.*online"; then
        echo "   ✅ 应用状态: 运行中"
    else
        echo "   ❌ 应用状态: 已停止"
    fi
    echo "   🔌 端口号: $port"
    echo "   🏠 项目目录: $chatflow_dir"
    echo ""
    echo "============================================"
    echo ""
}

# 检查ChatFlow目录
CHATFLOW_DIR=$(find_chatflow_dir)
if [ -z "$CHATFLOW_DIR" ]; then
    print_error "找不到ChatFlow安装目录"
    print_warning "请确保ChatFlow已正确安装"
    exit 1
fi

cd "$CHATFLOW_DIR" || {
    print_error "无法进入ChatFlow目录: $CHATFLOW_DIR"
    exit 1
}

# 命令处理
case "$1" in
    "status")
        echo ""
        print_status "ChatFlow 应用状态"
        echo ""
        pm2 list | grep -E "(chatflow|pm2)"
        ;;
    "start")
        print_status "启动 ChatFlow..."
        pm2 start ecosystem.config.js
        ;;
    "stop")
        print_status "停止 ChatFlow..."
        pm2 stop chatflow
        ;;
    "restart")
        print_status "重启 ChatFlow..."
        pm2 restart chatflow
        ;;
    "logs")
        if [ "$2" = "-e" ]; then
            print_status "显示错误日志..."
            pm2 logs chatflow --err
        else
            print_status "显示应用日志..."
            pm2 logs chatflow
        fi
        ;;
    "info")
        show_info "$CHATFLOW_DIR"
        ;;
    "monitor")
        print_status "进入监控模式..."
        pm2 monit
        ;;
    "update")
        print_status "更新 ChatFlow..."
        echo ""
        
        # 备份当前版本
        print_status "备份当前配置..."
        cp -r server/.env server/.env.backup 2>/dev/null || true
        
        # 停止应用
        print_status "停止应用..."
        pm2 stop chatflow 2>/dev/null || true
        
        # 拉取最新代码
        print_status "拉取最新代码..."
        git pull origin main || {
            print_error "Git更新失败"
            exit 1
        }
        
        # 安装依赖
        print_status "更新依赖..."
        cd server && npm install && cd ..
        cd client && npm install && npm run build && cd ..
        
        # 恢复配置
        if [ -f "server/.env.backup" ]; then
            cp server/.env.backup server/.env
        fi
        
        # 重启应用
        print_status "重启应用..."
        pm2 restart chatflow
        
        print_success "更新完成！"
        show_info "$CHATFLOW_DIR"
        ;;
    "uninstall")
        echo ""
        print_warning "即将卸载 ChatFlow 应用"
        print_warning "这将删除所有相关文件和配置"
        echo ""
        read -p "确定要继续吗？[y/N]: " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "开始卸载..."
            
            # 停止并删除PM2进程
            pm2 stop chatflow 2>/dev/null || true
            pm2 delete chatflow 2>/dev/null || true
            pm2 save 2>/dev/null || true
            
            # 删除开机自启动
            pm2 unstartup 2>/dev/null || true
            
            # 删除项目目录
            print_status "删除项目文件..."
            rm -rf "$CHATFLOW_DIR"
            
            # 删除cf命令
            rm -f /usr/local/bin/cf
            
            # 清理PM2
            print_status "清理PM2配置..."
            rm -rf ~/.pm2/logs/chatflow* 2>/dev/null || true
            rm -rf ~/.pm2/pids/chatflow* 2>/dev/null || true
            
            print_success "ChatFlow 已完全卸载"
            
            # 询问是否删除防火墙规则
            echo ""
            read -p "是否删除防火墙规则？[y/N]: " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                # UFW
                if command -v ufw &> /dev/null; then
                    sudo ufw delete allow 5000 2>/dev/null || true
                    sudo ufw delete allow 5001 2>/dev/null || true
                    sudo ufw delete allow 8000:9999/tcp 2>/dev/null || true
                fi
                
                # Firewalld
                if command -v firewall-cmd &> /dev/null; then
                    sudo firewall-cmd --permanent --remove-port=5000/tcp 2>/dev/null || true
                    sudo firewall-cmd --permanent --remove-port=5001/tcp 2>/dev/null || true
                    sudo firewall-cmd --permanent --remove-port=8000-9999/tcp 2>/dev/null || true
                    sudo firewall-cmd --reload 2>/dev/null || true
                fi
                
                print_success "防火墙规则已清理"
            fi
            
            echo ""
            print_success "卸载完成！感谢使用 ChatFlow"
            
            # 自删除脚本
            rm -f "$0" 2>/dev/null || true
        else
            print_status "已取消卸载"
        fi
        ;;
    "help"|"")
        echo ""
        echo "ChatFlow 管理命令"
        echo ""
        echo "用法: cf [command]"
        echo ""
        echo "可用命令:"
        echo "  status      查看应用运行状态"
        echo "  start       启动应用"
        echo "  stop        停止应用"
        echo "  restart     重启应用"
        echo "  logs        查看应用日志"
        echo "  logs -e     查看错误日志"
        echo "  info        显示应用信息和访问地址"
        echo "  monitor     进入PM2监控模式"
        echo "  update      更新应用到最新版本"
        echo "  uninstall   卸载ChatFlow应用"
        echo "  help        显示此帮助信息"
        echo ""
        echo "示例:"
        echo "  cf status   # 查看状态"
        echo "  cf info     # 查看访问地址"
        echo "  cf logs     # 查看日志"
        echo ""
        ;;
    *)
        print_error "未知命令: $1"
        echo ""
        echo "运行 'cf help' 查看可用命令"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/cf
    print_success "cf 命令已创建"
}

# 运行主函数
main "$@" 