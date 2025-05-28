// 测试Socket连接脚本 (ESM版本)
// 注意：这个文件需要用 npm 运行，而不是直接用 node 运行

// 模拟一个简单的连接测试
console.log('开始测试Socket连接...');

// 使用fetch直接测试服务器连接
async function testServerConnection() {
  try {
    console.log('正在测试服务器连接...');
    const response = await fetch('http://localhost:5001/api/rooms');
    
    if (response.ok) {
      console.log('✅ 服务器连接成功!');
      const data = await response.json();
      console.log(`获取到 ${data.length} 个房间信息`);
      return true;
    } else {
      console.error('❌ 服务器返回错误:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ 服务器连接失败:', error.message);
    return false;
  }
}

// 测试WebSocket连接
function testWebSocketConnection() {
  return new Promise((resolve) => {
    console.log('正在测试WebSocket连接...');
    
    const socket = new WebSocket('ws://localhost:5001/socket.io/?EIO=4&transport=websocket');
    
    socket.onopen = () => {
      console.log('✅ WebSocket连接成功!');
      socket.close();
      resolve(true);
    };
    
    socket.onerror = (error) => {
      console.error('❌ WebSocket连接失败:', error);
      resolve(false);
    };
    
    // 设置超时
    setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket连接超时');
        socket.close();
        resolve(false);
      }
    }, 5000);
  });
}

// 运行测试
async function runTests() {
  const serverConnected = await testServerConnection();
  
  if (serverConnected) {
    const wsConnected = await testWebSocketConnection();
    
    if (wsConnected) {
      console.log('🎉 所有连接测试通过!');
    } else {
      console.log('⚠️ HTTP连接正常，但WebSocket连接失败');
      console.log('建议检查:');
      console.log('1. 服务器是否正确配置了Socket.io');
      console.log('2. 防火墙是否允许WebSocket连接');
    }
  } else {
    console.log('⚠️ 服务器连接失败');
    console.log('建议检查:');
    console.log('1. 服务器是否正在运行 (node server/index.js)');
    console.log('2. 端口5001是否被占用或被阻止');
  }
}

runTests();

// 使用方法:
// 1. 保存此文件为 test_connection_esm.js
// 2. 在浏览器控制台中粘贴此代码运行 