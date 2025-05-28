// 测试Socket连接脚本
const socketService = require('../services/socket').default;
const { v4: uuidv4 } = require('uuid');

// 定义一个测试用户
const testUser = {
  id: uuidv4(),
  username: 'TestUser',
  avatar: 'https://ui-avatars.com/api/?name=Test&background=fce7f3&color=be185d&size=128'
};

// 连接测试函数
async function testConnection() {
  console.log('开始测试Socket连接...');
  
  // 连接Socket
  socketService.connect();
  
  // 等待连接建立
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 检查连接状态
  const isConnected = socketService.isConnected();
  console.log(`Socket连接状态: ${isConnected ? '已连接' : '未连接'}`);
  
  if (isConnected) {
    // 尝试加入用户
    console.log('尝试加入用户...');
    socketService.joinUser(testUser);
    
    // 等待用户加入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 尝试加入房间
    console.log('尝试加入房间...');
    socketService.joinRoom('general');
    
    // 等待房间加入
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 监听在线用户
    socketService.onOnlineUsers(users => {
      console.log('在线用户列表:', users);
    });
    
    // 保持连接一段时间
    console.log('等待接收事件...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 断开连接
    console.log('测试完成，断开连接');
    socketService.disconnect();
  } else {
    console.error('Socket连接失败，请检查服务器是否运行');
  }
}

// 运行测试
testConnection().catch(err => {
  console.error('测试过程中发生错误:', err);
});

// 如何使用:
// 1. 确保服务器正在运行 (node server/index.js)
// 2. 在新的终端中运行: node client/src/utils/test_connection.js 