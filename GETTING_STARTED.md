# 快速开始指南 🚀

## 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

## 一键安装和启动

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd chatflow

# 2. 安装所有依赖
npm run install-all

# 3. 启动应用
npm start
```

## 访问应用

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:5000

## 开发模式

```bash
# 同时启动前后端开发服务器
npm run dev

# 或分别启动
npm run server  # 后端
npm run client  # 前端
```

## 生产构建

```bash
# 构建前端
npm run build
```

## 清理项目

```bash
# 删除所有 node_modules 和 build 文件
npm run clean
```

## 故障排除

1. **端口冲突**: 确保3000和5000端口未被占用
2. **依赖问题**: 删除node_modules后重新安装
3. **数据库问题**: 检查server/chat.db文件权限

## 默认用户

应用首次启动时会自动创建测试用户：
- 用户名: `test1` / 密码: `123456`
- 用户名: `test2` / 密码: `123456`

立即开始体验 ChatFlow！ 💬 