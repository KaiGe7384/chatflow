@echo off
chcp 65001 >nul
echo.
echo ====================================
echo ChatFlow GitHub 上传脚本
echo ====================================
echo.

REM 检查Git是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Git 未安装，请先安装 Git
    echo 下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [成功] Git 已安装

REM 获取用户输入
echo.
set /p GITHUB_USERNAME="请输入您的GitHub用户名: "
set /p REPO_NAME="请输入仓库名称 (默认: chatflow): "
if "%REPO_NAME%"=="" set REPO_NAME=chatflow

echo.
echo [信息] 准备上传到: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
set /p CONFIRM="确认继续? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo [警告] 操作已取消
    pause
    exit /b 0
)

REM 初始化Git仓库
echo.
echo [信息] 初始化Git仓库...
if not exist ".git" (
    git init
    echo [成功] Git仓库初始化完成
) else (
    echo [警告] Git仓库已存在
)

REM 添加所有文件
echo.
echo [信息] 添加文件到Git...
git add .
git status

REM 创建初始提交
echo.
echo [信息] 创建初始提交...
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

if errorlevel 1 (
    echo [警告] 没有文件需要提交或提交失败
) else (
    echo [成功] 初始提交完成
)

REM 配置远程仓库
echo.
echo [信息] 配置远程仓库...
set REMOTE_URL=https://github.com/%GITHUB_USERNAME%/%REPO_NAME%.git

git remote get-url origin >nul 2>&1
if errorlevel 1 (
    git remote add origin "%REMOTE_URL%"
) else (
    echo [警告] 远程仓库已存在，更新URL...
    git remote set-url origin "%REMOTE_URL%"
)

echo [成功] 远程仓库配置完成: %REMOTE_URL%

REM 推送到GitHub
echo.
echo [信息] 推送到GitHub...
echo.
echo [警告] 现在需要推送到GitHub，可能需要您的认证信息
echo [警告] 如果这是您第一次推送，请确保：
echo   1. 已在GitHub创建了名为 '%REPO_NAME%' 的仓库
echo   2. 已配置Git认证（SSH密钥或个人访问令牌）
echo.
pause

REM 设置默认分支为main
git branch -M main

REM 推送到远程仓库
git push -u origin main
if errorlevel 1 (
    echo.
    echo [错误] 推送失败！
    echo.
    echo 可能的解决方案:
    echo   1. 确保在GitHub上创建了仓库: https://github.com/new
    echo   2. 检查Git认证配置
    echo   3. 如果仓库已存在且有内容，请使用: git push --force-with-lease
    echo.
    echo 手动推送命令:
    echo   git push -u origin main
    pause
    exit /b 1
) else (
    echo.
    echo [成功] 成功推送到GitHub！
    echo.
    echo 🎉 ChatFlow 已成功上传到GitHub！
    echo.
    echo 访问您的仓库:
    echo   🔗 GitHub仓库: https://github.com/%GITHUB_USERNAME%/%REPO_NAME%
    echo.
    echo 接下来的步骤:
    echo   1. 更新 README.md 中的仓库地址
    echo   2. 更新部署脚本中的 GitHub URL
    echo   3. 在GitHub仓库设置中启用 Pages（如需要）
    echo   4. 添加仓库描述和标签
    echo.
    echo 部署命令示例:
    echo   curl -sSL https://raw.githubusercontent.com/%GITHUB_USERNAME%/%REPO_NAME%/main/quick-deploy.sh ^| bash
    echo.
    pause
) 