# ChatFlow 💬

<div align="center">
  <h3>现代化的即时通讯应用</h3>
  <p>基于 React + Socket.io 构建的美丽粉白主题聊天应用</p>
  
  ![Version](https://img.shields.io/badge/version-1.0.0-pink)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)
</div>

## ✨ 特性

- 🎨 **美丽的粉白主题界面** - 现代化UI设计
- 💬 **实时聊天** - 基于Socket.io的即时通讯
- 👥 **好友系统** - 添加好友，私聊功能
- 🏠 **多房间聊天** - 支持公共聊天室和群聊
- 📱 **响应式设计** - 支持桌面和移动设备
- 🔔 **消息通知** - 浏览器原生通知支持
- ⚡ **打字指示器** - 实时显示用户输入状态
- 🔐 **用户认证** - 安全的登录注册系统

## 🏗️ 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Socket.io Client** - 实时通讯客户端

### 后端
- **Node.js** - 服务器运行时
- **Express** - Web 框架
- **Socket.io** - 实时通讯服务器
- **SQLite** - 轻量级数据库
- **JWT** - 身份验证

## 🚀 快速开始

### 本地开发

1. **克隆项目**

```bash
git clone https://github.com/KaiGe7384/chatflow.git
cd chatflow
```

2. **安装依赖**
```bash
npm run install-all
```

3. **启动应用**
```bash
npm start  # 一键启动前后端
# 或者
npm run dev  # 开发模式（热重载）
```

4. **访问应用**
- 前端：http://localhost:3000
- 后端API：http://localhost:5000

### Linux 生产环境部署

#### 方式一：快速部署（推荐）

适用于开发环境或小型生产环境：

```bash
# 下载并运行快速部署脚本
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/quick-deploy.sh | bash

# 或者下载后运行
wget https://raw.githubusercontent.com/KaiGe7384/chatflow/main/quick-deploy.sh
chmod +x quick-deploy.sh
./quick-deploy.sh
```

#### 方式二：完整生产部署

适用于生产环境，包含Nginx反向代理：

```bash
# 需要root权限
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | sudo bash

# 或者下载后运行
wget https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

#### 部署后检查

```bash
# 下载状态检查脚本
wget https://raw.githubusercontent.com/KaiGe7384/chatflow/main/check-deployment.sh
chmod +x check-deployment.sh
./check-deployment.sh
```

## 🎯 使用方法

1. **注册账号** - 创建新用户账号
2. **登录系统** - 使用账号密码登录
3. **加入聊天室** - 选择公共聊天室开始聊天
4. **添加好友** - 在用户列表中添加好友
5. **私聊** - 与好友进行一对一聊天
6. **创建群聊** - 邀请多个好友创建群聊房间

### 默认测试账号

- 用户名: `test1` / 密码: `123456`
- 用户名: `test2` / 密码: `123456`

## 📁 项目结构

```
chatflow/
├── client/                 # 前端React应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── services/       # API和Socket服务
│   │   ├── types/          # TypeScript类型定义
│   │   └── ...
│   └── package.json
├── server/                 # 后端Node.js应用
│   ├── index.js           # 主服务器文件
│   ├── chat.db            # SQLite数据库
│   └── package.json
├── deploy.sh              # 完整生产部署脚本
├── quick-deploy.sh        # 快速部署脚本
├── check-deployment.sh    # 部署状态检查脚本
├── start.js               # 本地一键启动脚本
├── package.json           # 根项目配置
└── README.md
```

## 🔧 配置

### 环境变量

创建 `server/.env` 文件：

```env
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=production
```

### 端口配置

- **开发环境:**
  - 前端开发服务器：3000
  - 后端API服务器：5000

- **生产环境:**
  - Web应用（Nginx）：80
  - 后端API服务器：5000

## 📝 API文档

### 认证接口
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 聊天接口
- `GET /api/rooms` - 获取聊天室列表
- `GET /api/messages/:roomId` - 获取房间消息
- `GET /api/private-messages/:userId` - 获取私聊消息

### 好友接口
- `POST /api/friends/request` - 添加好友
- `DELETE /api/friends/:friendId` - 删除好友
- `GET /api/friends` - 获取好友列表

## 🔨 管理命令

### PM2 管理（生产环境）
```bash
pm2 status           # 查看服务状态
pm2 logs chatflow    # 查看应用日志
pm2 restart chatflow # 重启应用
pm2 stop chatflow    # 停止应用
pm2 delete chatflow  # 删除应用
```

### Nginx 管理（生产环境）
```bash
systemctl status nginx  # 查看Nginx状态
systemctl restart nginx # 重启Nginx
nginx -t                # 测试配置文件
```

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- React 团队提供优秀的前端框架
- Socket.io 团队提供实时通讯解决方案
- Tailwind CSS 提供美丽的样式框架

---

<div align="center">
  Made with ❤️ by ChatFlow Team
</div> 