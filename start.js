const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

console.log('🚀 启动 ChatFlow 即时通讯系统...');

// 检查操作系统
const isWindows = os.platform() === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 启动服务器
console.log('📡 启动后端服务器...');
const server = spawn(npmCmd, ['start'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

// 等待2秒后启动客户端
setTimeout(() => {
  console.log('🎨 启动前端应用...');
  const client = spawn(npmCmd, ['start'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true
  });

  client.on('error', (err) => {
    console.error('前端启动失败:', err);
  });
}, 2000);

server.on('error', (err) => {
  console.error('服务器启动失败:', err);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭应用...');
  process.exit(0);
});

console.log('✅ 应用启动中...');
console.log('📍 前端地址: http://localhost:3000');
console.log('📍 后端API: http://localhost:5000');
console.log('�� 按 Ctrl+C 退出应用'); 