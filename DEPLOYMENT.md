# ChatFlow 部署指南 🚀

本文档提供了ChatFlow在不同环境下的详细部署指南。

## 📋 部署前准备

### 系统要求
- **操作系统**: Ubuntu 18.04+, CentOS 7+, 或其他支持Node.js的Linux发行版
- **Node.js**: 16.0+ 版本
- **内存**: 最少1GB RAM (推荐2GB+)
- **存储**: 最少2GB可用空间
- **网络**: 开放80, 5000, 8080端口

### 依赖软件
- Git
- Node.js & npm
- PM2 (进程管理器)
- Nginx (可选，用于反向代理)

## 🎯 一键部署 (推荐)

### Linux服务器一键部署

```bash
# 下载并运行部署脚本
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash

# 或者分步执行
wget https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

部署完成后访问：
- **Web应用**: http://your-server-ip
- **控制面板**: http://your-server-ip:8080

### 本地开发环境快速部署

```bash
# 克隆项目
git clone https://github.com/KaiGe7384/chatflow.git
cd chatflow

# 运行快速部署脚本
chmod +x quick-deploy.sh
./quick-deploy.sh
```

## 🔧 手动部署

### 1. 克隆项目

```bash
git clone https://github.com/KaiGe7384/chatflow.git
cd chatflow
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装服务端依赖
cd server && npm install && cd ..

# 安装客户端依赖并构建
cd client && npm install && npm run build && cd ..
```

### 3. 配置环境

```bash
# 创建服务端环境配置
cat > server/.env << EOF
PORT=5000
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
EOF
```

### 4. 安装PM2并启动服务

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
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
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 配置Nginx (可选)

```bash
# 安装Nginx
sudo apt update && sudo apt install nginx -y  # Ubuntu/Debian
# 或
sudo yum install nginx -y  # CentOS/RHEL

# 创建Nginx配置
sudo tee /etc/nginx/sites-available/chatflow << EOF
server {
    listen 80;
    server_name _;
    
    # 前端静态文件
    location / {
        root $(pwd)/client/build;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# 启用站点
sudo ln -s /etc/nginx/sites-available/chatflow /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 🎛️ 控制面板

ChatFlow 提供了一个Web控制面板，用于管理应用：

### 功能特性
- ✅ 实时服务状态监控
- ✅ 一键启动/停止/重启服务
- ✅ 实时日志查看
- ✅ 端口配置管理
- ✅ 访问链接快速跳转
- ✅ 系统资源监控
- ✅ 应用重新安装
- ✅ 应用卸载

### 安装控制面板

控制面板在一键部署时会自动安装，手动部署时可以这样安装：

```bash
# 安装控制面板依赖
npm install express cors

# 启动控制面板后端
pm2 start control-panel-server.js --name chatflow-panel

# 访问控制面板
# http://your-server-ip:8080
```

## 📊 监控和管理

### PM2 管理命令

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs chatflow

# 重启服务
pm2 restart chatflow

# 停止服务
pm2 stop chatflow

# 删除服务
pm2 delete chatflow

# 保存当前配置
pm2 save

# 重新加载配置
pm2 reload ecosystem.config.js
```

### 日志管理

```bash
# 查看应用日志
pm2 logs chatflow --lines 100

# 清空日志
pm2 flush

# 日志轮转
pm2 logrotate -u user
```

### 系统服务管理

```bash
# 查看Nginx状态
sudo systemctl status nginx

# 重启Nginx
sudo systemctl restart nginx

# 查看系统资源
htop
df -h
free -h
```

## 🔒 安全配置

### 防火墙设置

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5000
sudo ufw allow 8080
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

### SSL证书配置 (推荐)

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 Docker部署 (可选)

### Dockerfile

```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

RUN npm ci --only=production

COPY client ./client
COPY server ./server

RUN cd client && npm ci && npm run build

FROM node:18-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000

CMD ["node", "server/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  chatflow:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your-secret-key
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - chatflow
    restart: unless-stopped
```

## ❓ 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查看端口占用
sudo lsof -i :5000
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>
```

2. **服务无法启动**
```bash
# 检查日志
pm2 logs chatflow
journalctl -u nginx

# 检查配置
nginx -t
node server/index.js
```

3. **数据库问题**
```bash
# 检查SQLite数据库
ls -la server/chat.db
sqlite3 server/chat.db ".tables"
```

4. **权限问题**
```bash
# 修复权限
sudo chown -R $(whoami):$(whoami) .
chmod +x deploy.sh
```

### 性能优化

1. **启用Nginx压缩**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

2. **PM2集群模式**
```javascript
module.exports = {
  apps: [{
    name: 'chatflow',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster'
  }]
}
```

## 📞 技术支持

- 📧 Email: support@chatflow.com
- 💬 GitHub Issues: https://github.com/KaiGe7384/chatflow/issues
- 📖 文档: https://chatflow.docs.com

---

<div align="center">
  <strong>祝您部署愉快！🎉</strong>
</div> 