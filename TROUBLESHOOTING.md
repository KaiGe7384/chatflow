# ChatFlow 部署故障排除指南

## 常见问题及解决方案

### 1. Node.js 安装冲突错误

**错误信息：**
```
dpkg: error processing archive /var/cache/apt/archives/nodejs_18.20.8-1nodesource1_amd64.deb (--unpack):
trying to overwrite '/usr/include/node/common.gypi', which is also in package libnode-dev 12.22.9~dfsg-1ubuntu3.6
```

**解决方案：**
```bash
# 方法1：使用修复版脚本（自动处理冲突）
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash

# 方法2：手动清理冲突包
sudo apt remove --purge -y nodejs npm libnode-dev libnode72 node-gyp
sudo apt autoremove -y
sudo apt autoclean
sudo rm -rf /etc/apt/sources.list.d/nodesource.list*
sudo rm -rf /usr/share/keyrings/nodesource.gpg

# 然后重新运行部署
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash
```

### 2. 安装过程中出现弹窗

**问题描述：**
安装过程中出现debconf配置弹窗，需要手动选择和确认。

**解决方案：**
使用修复版脚本，已设置非交互式模式：
```bash
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash
```

### 3. 权限不足错误

**错误信息：**
```
Permission denied
E: Could not open lock file
```

**解决方案：**
```bash
# 确保使用root权限运行
sudo curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash

# 或者下载后以root权限运行
wget https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

### 4. 网络连接问题

**错误信息：**
```
curl: (6) Could not resolve host
curl: (7) Failed to connect to raw.githubusercontent.com
```

**解决方案：**
```bash
# 方法1：检查网络连接
ping raw.githubusercontent.com

# 方法2：使用备用域名
curl -sSL https://github.com/KaiGe7384/chatflow/raw/main/deploy.sh | bash

# 方法3：手动下载
wget --no-check-certificate https://github.com/KaiGe7384/chatflow/raw/main/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

### 5. PM2 启动失败

**错误信息：**
```
[ERROR] 服务启动失败
```

**解决方案：**
```bash
# 检查Node.js版本
node -v  # 应该 >= 16.0.0

# 检查项目文件
ls -la chatflow/

# 手动启动调试
cd chatflow
npm install
cd server
npm install
cd ..
pm2 start ecosystem.config.js --name chatflow

# 查看详细日志
pm2 logs chatflow
```

### 6. 端口被占用

**错误信息：**
```
Error: listen EADDRINUSE :::5000
```

**解决方案：**
```bash
# 查看占用5000端口的进程
lsof -i :5000
netstat -tulpn | grep :5000

# 杀死占用进程
sudo kill -9 <进程ID>

# 或者修改端口
echo "PORT=5001" >> chatflow/server/.env
pm2 restart chatflow
```

### 7. SQLite 数据库权限问题

**错误信息：**
```
SQLITE_CANTOPEN: unable to open database file
```

**解决方案：**
```bash
# 检查数据库目录权限
ls -la chatflow/server/

# 修复权限
sudo chown -R $USER:$USER chatflow/
chmod 755 chatflow/server/
```

### 8. 前端构建失败

**错误信息：**
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
```

**解决方案：**
```bash
# 清理node_modules和重新安装
cd chatflow/client
rm -rf node_modules package-lock.json
npm install
npm run build

# 如果内存不足，增加内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

## 完全重置和重新部署

如果问题无法解决，可以完全重置：

```bash
# 1. 停止所有服务
pm2 stop all
pm2 delete all

# 2. 清理项目目录
rm -rf chatflow/

# 3. 清理Node.js
sudo apt remove --purge -y nodejs npm libnode-dev libnode72 node-gyp
sudo apt autoremove -y
sudo apt autoclean

# 4. 清理PM2
npm uninstall -g pm2

# 5. 重新部署
curl -sSL https://raw.githubusercontent.com/KaiGe7384/chatflow/main/deploy.sh | bash
```

## 获取帮助

如果以上方法都无法解决问题，请：

1. 收集错误日志：
```bash
pm2 logs chatflow --lines 50 > chatflow-error.log
```

2. 提供系统信息：
```bash
lsb_release -a
node -v
npm -v
pm2 -v
```

3. 在GitHub Issues中报告问题，附上错误日志和系统信息。 