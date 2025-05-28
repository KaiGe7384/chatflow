#!/bin/bash

# ChatFlow GitHub上传脚本
# 自动初始化Git仓库并上传到GitHub

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

echo -e "${GREEN}ChatFlow GitHub 上传脚本${NC}"
echo "=================================="

# 检查Git是否安装
if ! command -v git &> /dev/null; then
    print_error "Git 未安装，请先安装 Git"
    exit 1
fi

print_success "Git 已安装"

# 获取用户输入
echo ""
read -p "请输入您的GitHub用户名: " GITHUB_USERNAME
read -p "请输入仓库名称 (默认: chatflow): " REPO_NAME
REPO_NAME=${REPO_NAME:-chatflow}

echo ""
print_status "准备上传到: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
read -p "确认继续? (y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    print_warning "操作已取消"
    exit 0
fi

# 初始化Git仓库
print_status "初始化Git仓库..."
if [ ! -d ".git" ]; then
    git init
    print_success "Git仓库初始化完成"
else
    print_warning "Git仓库已存在"
fi

# 添加所有文件（除了 .gitignore 中的文件）
print_status "添加文件到Git..."
git add .
git status

# 创建初始提交
print_status "创建初始提交..."
if git diff --staged --quiet; then
    print_warning "没有文件需要提交"
else
    git commit -m "🎉 Initial commit: ChatFlow IM Application

✨ Features:
- Modern React + TypeScript frontend
- Real-time chat with Socket.io
- Beautiful pink-white theme UI
- User authentication system
- Friend system and private messaging
- Multi-room chat support
- Responsive design
- One-click deployment scripts

🚀 Ready for production deployment!"

    print_success "初始提交完成"
fi

# 添加远程仓库
print_status "配置远程仓库..."
REMOTE_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

if git remote get-url origin &>/dev/null; then
    print_warning "远程仓库已存在，更新URL..."
    git remote set-url origin "$REMOTE_URL"
else
    git remote add origin "$REMOTE_URL"
fi

print_success "远程仓库配置完成: $REMOTE_URL"

# 推送到GitHub
print_status "推送到GitHub..."
echo ""
print_warning "现在需要推送到GitHub，可能需要您的认证信息"
print_warning "如果这是您第一次推送，请确保："
echo "  1. 已在GitHub创建了名为 '$REPO_NAME' 的仓库"
echo "  2. 已配置Git认证（SSH密钥或个人访问令牌）"
echo ""
read -p "按Enter继续推送..."

# 设置默认分支为main
git branch -M main

# 推送到远程仓库
if git push -u origin main; then
    print_success "成功推送到GitHub！"
    echo ""
    echo -e "${GREEN}🎉 ChatFlow 已成功上传到GitHub！${NC}"
    echo ""
    echo -e "${GREEN}访问您的仓库:${NC}"
    echo -e "  🔗 GitHub仓库: ${YELLOW}https://github.com/$GITHUB_USERNAME/$REPO_NAME${NC}"
    echo ""
    echo -e "${GREEN}接下来的步骤:${NC}"
    echo "  1. 更新 README.md 中的仓库地址"
    echo "  2. 更新部署脚本中的 GitHub URL"
    echo "  3. 在GitHub仓库设置中启用 Pages（如需要）"
    echo "  4. 添加仓库描述和标签"
    echo ""
    echo -e "${GREEN}部署命令示例:${NC}"
    echo -e "  ${YELLOW}curl -sSL https://raw.githubusercontent.com/$GITHUB_USERNAME/$REPO_NAME/main/quick-deploy.sh | bash${NC}"
else
    print_error "推送失败！"
    echo ""
    echo -e "${YELLOW}可能的解决方案:${NC}"
    echo "  1. 确保在GitHub上创建了仓库: https://github.com/new"
    echo "  2. 检查Git认证配置"
    echo "  3. 如果仓库已存在且有内容，请使用: git push --force-with-lease"
    echo ""
    echo -e "${YELLOW}手动推送命令:${NC}"
    echo -e "  ${BLUE}git push -u origin main${NC}"
    exit 1
fi 