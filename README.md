# ChatFlow - 实时即时通讯应用

一个基于 React + Socket.io + SQLite 构建的现代化实时即时通讯应用，支持私聊、群聊、文件传输等功能。

## ✨ 特性

- 🚀 **实时通讯**: 基于 Socket.io 的实时消息传输
- 💬 **多种聊天**: 支持私聊和群聊功能  
- 📁 **文件传输**: 支持各种文件类型的发送
- 🔐 **用户认证**: 安全的用户注册和登录系统
- 📱 **响应式设计**: 适配各种设备和屏幕尺寸
- 🎨 **现代UI**: 简洁美观的用户界面

## 🛠️ 技术栈

### 前端
- React 18
- Socket.io-client
- Styled Components
- React Router

### 后端  
- Node.js
- Express
- Socket.io
- SQLite
- JWT 认证

## 🚀 一键部署

### 系统要求
- Ubuntu 18.04+ / Debian 10+ / CentOS 7+ / Alpine Linux
- 2GB+ RAM
- 10GB+ 可用磁盘空间
- root 权限

### 快速部署
```bash
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash
```

### 快速卸载
```bash
# 方法1：使用部署脚本卸载
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash -s uninstall

# 方法2：使用cf命令卸载（部署完成后）
cf uninstall
```

### 部署特性
- ✅ **智能系统检测**: 自动识别 Ubuntu/Debian、CentOS/RHEL、Alpine Linux
- ✅ **依赖自动安装**: Node.js 18+、npm、Git、PM2 等全自动安装
- ✅ **零交互部署**: 完全非交互式安装，无需手动确认
- ✅ **冲突自动处理**: 智能处理 Node.js 包冲突和系统依赖问题
- ✅ **防火墙检测**: 自动检测防火墙状态并给出配置建议
- ✅ **进程保护**: PM2 进程管理，支持自动重启和开机自启
- ✅ **实时诊断**: 部署完成后自动进行连通性测试
- ✅ **错误预防**: 内置 PM2 EPIPE 错误预防机制
- ✅ **端口管理**: 自动检测并处理端口占用问题

## 🎮 管理命令

部署完成后，可使用内置的 `cf` 命令进行应用管理：

```bash
# 查看应用状态
cf status

# 启动/停止/重启应用
cf start
cf stop  
cf restart

# 查看日志
cf logs              # 实时日志
cf logs -e           # 错误日志

# 应用信息
cf info              # 显示访问地址和账号信息

# 更新应用
cf update            # 从GitHub拉取最新代码并重启

# 监控模式
cf monitor           # 进入PM2监控界面

# 卸载应用
cf uninstall         # 完全卸载ChatFlow

# 帮助信息
cf help
```

## 📱 使用方法

### 1. 访问应用
部署成功后，通过以下地址访问：
- 本地访问: `http://localhost:5000`
- 外网访问: `http://服务器IP:5000`

### 2. 测试账号
```
用户名: test1  密码: 123456
用户名: test2  密码: 123456
```

### 3. 功能说明
- **注册/登录**: 创建账号或使用测试账号登录
- **私聊**: 点击用户列表中的用户开始私聊
- **群聊**: 创建或加入群组进行群聊
- **文件发送**: 拖拽文件或点击上传按钮发送文件
- **实时通知**: 接收新消息的实时提醒

## 🔧 手动部署

如需手动部署，请参考以下步骤：

### 1. 克隆项目
```bash
git clone https://github.com/KaiGe7384/chatflow.git
cd chatflow
```

### 2. 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装后端依赖
cd server && npm install && cd ..

# 安装前端依赖  
cd client && npm install && cd ..
```

### 3. 构建前端
```bash
cd client
npm run build
cd ..
```

### 4. 配置环境
```bash
# 创建环境配置文件
cat > server/.env << EOF
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=production
EOF
```

### 5. 启动应用
```bash
# 使用PM2启动
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

## 🐛 故障排除

### 应用无法访问
```bash
# 检查应用状态
cf status
pm2 status chatflow

# 查看错误日志
cf logs -e
pm2 logs chatflow --err

# 检查端口
netstat -tlnp | grep 5000

# 重启应用
cf restart
```

### 防火墙配置
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 5000
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload

# 查看防火墙状态
sudo ufw status           # Ubuntu/Debian
sudo firewall-cmd --list-ports  # CentOS/RHEL
```

### 重新部署
```bash
# 如遇到问题，可重新运行部署脚本
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash

# 或者先卸载再重新安装
cf uninstall
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash
```

## 📁 项目结构

```
chatflow/
├── client/          # React 前端应用
│   ├── src/
│   ├── public/
│   └── package.json
├── server/          # Node.js 后端应用
│   ├── index.js     # 服务器入口文件
│   ├── routes/      # API 路由
│   ├── middleware/  # 中间件
│   └── package.json
├── deploy.sh        # 一键部署脚本
├── ecosystem.config.js  # PM2 配置文件
└── README.md
```

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests 来帮助改进项目。

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🎯 版本信息

**当前版本**: v2.1.0

### 更新日志
- **v2.1.0**: 增强部署脚本，添加错误预防机制和完整诊断功能
- **v2.0.0**: 重大更新，新增自动IP检测、开机自启动、cf管理命令
- **v1.0.0**: 初始版本，基础即时通讯功能

---

**⭐ 如果这个项目对你有帮助，请给个 Star！** 