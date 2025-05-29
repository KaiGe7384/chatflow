const http = require('http');

console.log('测试API连接...');

// 测试服务器是否在运行
const options = {
  hostname: '154.84.59.76',
  port: 5001,
  path: '/api/users',
  method: 'GET',
  headers: {
    'user-id': 'defcaa0b-5203-4abe-bd4f-daa649be2474'
  }
};

const req = http.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('响应数据:', data);
    
    // 测试好友API
    testFriendAPI();
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
});

req.end();

function testFriendAPI() {
  console.log('\n测试好友API...');
  
  const friendOptions = {
    hostname: '154.84.59.76',
    port: 5001,
    path: '/api/friends',
    method: 'GET',
    headers: {
      'user-id': 'defcaa0b-5203-4abe-bd4f-daa649be2474'
    }
  };

  const friendReq = http.request(friendOptions, (res) => {
    console.log(`好友API状态码: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('好友列表数据:', data);
      
      // 测试添加好友API
      testAddFriendAPI();
    });
  });

  friendReq.on('error', (e) => {
    console.error(`好友API请求遇到问题: ${e.message}`);
  });

  friendReq.end();
}

function testAddFriendAPI() {
  console.log('\n测试添加好友API...');
  
  const addFriendData = JSON.stringify({
    friendId: 'bc739338-44b6-4dac-9942-9623bb093c13' // 李四的ID
  });
  
  const addFriendOptions = {
    hostname: '154.84.59.76',
    port: 5001,
    path: '/api/friends/request',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(addFriendData),
      'user-id': 'defcaa0b-5203-4abe-bd4f-daa649be2474'
    }
  };

  const addFriendReq = http.request(addFriendOptions, (res) => {
    console.log(`添加好友API状态码: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('添加好友响应:', data);
    });
  });

  addFriendReq.on('error', (e) => {
    console.error(`添加好友API请求遇到问题: ${e.message}`);
  });

  addFriendReq.write(addFriendData);
  addFriendReq.end();
} 