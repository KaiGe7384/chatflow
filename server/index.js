const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,  // 心跳超时时间
  pingInterval: 10000  // 心跳间隔
});

// 中间件
app.use(cors());
app.use(express.json());

// 数据库初始化
const db = new sqlite3.Database('./chat.db');

// 创建数据库表
db.serialize(() => {
  // 用户表
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 消息表
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    room_id TEXT DEFAULT 'general',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(room_id) REFERENCES rooms(id)
  )`);

  // 私聊消息表
  db.run(`CREATE TABLE IF NOT EXISTS private_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    sender_username TEXT NOT NULL,
    receiver_username TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  )`);

  // 聊天室表
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);

  // 房间成员表
  db.run(`CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_read DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(room_id, user_id)
  )`);

  // 好友关系表
  db.run(`CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT DEFAULT 'accepted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(friend_id) REFERENCES users(id),
    UNIQUE(user_id, friend_id)
  )`);

  // 插入默认聊天室
  db.run(`INSERT OR IGNORE INTO rooms (id, name, description, is_public) VALUES 
    ('general', '大厅', '欢迎来到聊天大厅！', TRUE),
    ('random', '随便聊聊', '随意话题交流', TRUE),
    ('tech', '技术讨论', '技术相关话题讨论', TRUE)`);
});

const JWT_SECRET = 'your-secret-key-change-in-production';

// 在线用户映射表
const onlineUsers = new Map();
const typingUsers = new Map();
const privateTypingUsers = new Map();

console.log('Socket.io 服务器已配置，等待连接...');

// API 路由
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  if (username.length < 2 || password.length < 6) {
    return res.status(400).json({ error: '用户名至少2位，密码至少6位' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=fce7f3&color=be185d&size=128`;

    db.run('INSERT INTO users (id, username, password, avatar) VALUES (?, ?, ?, ?)', 
      [userId, username, hashedPassword, avatarUrl], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: '用户名已存在' });
          }
          return res.status(500).json({ error: '注册失败' });
        }

        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ 
          token, 
          user: { 
            id: userId, 
            username, 
            avatar: avatarUrl
          } 
        });
      });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: '服务器错误' });
    }
    
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }

    try {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: '密码错误' });
      }

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          username: user.username, 
          avatar: user.avatar
        } 
      });
    } catch (error) {
      res.status(500).json({ error: '服务器错误' });
    }
  });
});

app.get('/api/rooms', (req, res) => {
  db.all('SELECT * FROM rooms ORDER BY created_at ASC', (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: '获取房间列表失败' });
    }
    res.json(rooms);
  });
});

app.get('/api/messages/:roomId', (req, res) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  db.all(`
    SELECT m.*, u.avatar 
    FROM messages m 
    JOIN users u ON m.user_id = u.id 
    WHERE m.room_id = ?
    ORDER BY m.timestamp DESC 
    LIMIT ?
  `, [roomId, limit], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: '获取消息失败' });
    }
    res.json(messages.reverse());
  });
});

// 获取私聊消息
app.get('/api/private-messages/:userId', (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.query.currentUserId;
  const limit = parseInt(req.query.limit) || 50;
  
  if (!currentUserId) {
    return res.status(400).json({ error: '缺少当前用户ID' });
  }

  db.all(`
    SELECT pm.*, s.avatar as sender_avatar, r.avatar as receiver_avatar
    FROM private_messages pm
    JOIN users s ON pm.sender_id = s.id
    JOIN users r ON pm.receiver_id = r.id
    WHERE (pm.sender_id = ? AND pm.receiver_id = ?) 
       OR (pm.sender_id = ? AND pm.receiver_id = ?)
    ORDER BY pm.timestamp DESC
    LIMIT ?
  `, [currentUserId, userId, userId, currentUserId, limit], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: '获取私聊消息失败' });
    }
    res.json(messages.reverse());
  });
});

// 获取所有用户列表
app.get('/api/users', (req, res) => {
  const currentUserId = req.query.currentUserId;
  
  db.all('SELECT id, username, avatar FROM users WHERE id != ? ORDER BY username', [currentUserId], (err, users) => {
    if (err) {
      return res.status(500).json({ error: '获取用户列表失败' });
    }
    res.json(users);
  });
});

// 好友系统API

// 发送好友请求
app.post('/api/friends/request', (req, res) => {
  const { friendId } = req.body;
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  if (userId === friendId) {
    return res.status(400).json({ error: '不能添加自己为好友' });
  }
  
  // 检查是否已经是好友或已发送请求
  db.get(`
    SELECT * FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `, [userId, friendId, friendId, userId], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: '检查好友关系失败' });
    }
    
    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: '已经是好友了' });
      } else {
        return res.status(400).json({ error: '好友请求已发送' });
      }
    }
    
    // 获取用户信息用于通知
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        return res.status(500).json({ error: '获取用户信息失败' });
      }
      
      db.get('SELECT username FROM users WHERE id = ?', [friendId], (err, friend) => {
        if (err || !friend) {
          return res.status(500).json({ error: '获取好友信息失败' });
        }
        
        // 创建好友请求
        db.run(`
          INSERT INTO friendships (user_id, friend_id, status) 
          VALUES (?, ?, 'accepted')
        `, [userId, friendId], function(err) {
          if (err) {
            return res.status(500).json({ error: '发送好友请求失败' });
          }
          
          // 同时创建反向关系
          db.run(`
            INSERT INTO friendships (user_id, friend_id, status) 
            VALUES (?, ?, 'accepted')
          `, [friendId, userId], function(err) {
            if (err) {
              console.error('创建反向好友关系失败:', err);
            }
            
            // 通过Socket通知所有在线用户更新好友列表
            io.emit('friend_added', {
              userId: userId,
              friendId: friendId,
              userName: user.username,
              friendName: friend.username
            });
            
            console.log(`用户 ${user.username} 添加了好友 ${friend.username}`);
            res.json({ message: '好友添加成功' });
          });
        });
      });
    });
  });
});

// 删除好友
app.delete('/api/friends/:friendId', (req, res) => {
  const { friendId } = req.params;
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  // 获取用户信息用于通知
  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(500).json({ error: '获取用户信息失败' });
    }
    
    db.get('SELECT username FROM users WHERE id = ?', [friendId], (err, friend) => {
      if (err || !friend) {
        return res.status(500).json({ error: '获取好友信息失败' });
      }
      
      // 删除双向好友关系
      db.serialize(() => {
        db.run('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?', [userId, friendId]);
        db.run('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?', [friendId, userId], function(err) {
          if (err) {
            return res.status(500).json({ error: '删除好友失败' });
          }
          
          // 通过Socket通知所有在线用户更新好友列表
          io.emit('friend_removed', {
            userId: userId,
            friendId: friendId,
            userName: user.username,
            friendName: friend.username
          });
          
          console.log(`用户 ${user.username} 删除了好友 ${friend.username}`);
          res.json({ message: '好友删除成功' });
        });
      });
    });
  });
});

// 获取好友列表
app.get('/api/friends', (req, res) => {
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  db.all(`
    SELECT u.id, u.username, u.avatar, f.created_at as friend_since
    FROM friendships f
    JOIN users u ON f.friend_id = u.id
    WHERE f.user_id = ? AND f.status = 'accepted'
    ORDER BY u.username
  `, [userId], (err, friends) => {
    if (err) {
      return res.status(500).json({ error: '获取好友列表失败' });
    }
    res.json(friends);
  });
});

// 检查好友关系
app.get('/api/friends/check/:friendId', (req, res) => {
  const { friendId } = req.params;
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  db.get(`
    SELECT * FROM friendships 
    WHERE user_id = ? AND friend_id = ? AND status = 'accepted'
  `, [userId, friendId], (err, friendship) => {
    if (err) {
      return res.status(500).json({ error: '检查好友关系失败' });
    }
    
    res.json({ isFriend: !!friendship });
  });
});

// 用户API - 创建群聊
app.post('/api/rooms/create', (req, res) => {
  const { name, description, inviteUsers = [] } = req.body;
  const createdBy = req.headers['user-id'];
  
  if (!createdBy) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  if (!name || !description) {
    return res.status(400).json({ error: '房间名称和描述不能为空' });
  }
  
  const roomId = 'room_' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
  
  db.serialize(() => {
    // 创建房间
    db.run(`
      INSERT INTO rooms (id, name, description, created_by, is_public) 
      VALUES (?, ?, ?, ?, FALSE)
    `, [roomId, name, description, createdBy], function(err) {
      if (err) {
        return res.status(500).json({ error: '创建房间失败' });
      }
      
      // 创建者自动加入房间
      db.run(`
        INSERT INTO room_members (room_id, user_id) 
        VALUES (?, ?)
      `, [roomId, createdBy]);
      
      // 邀请其他用户
      if (inviteUsers.length > 0) {
        const placeholders = inviteUsers.map(() => '(?, ?)').join(', ');
        const values = [];
        inviteUsers.forEach(userId => {
          values.push(roomId, userId);
        });
        
        db.run(`
          INSERT OR IGNORE INTO room_members (room_id, user_id) 
          VALUES ${placeholders}
        `, values);
      }
      
      res.json({ 
        id: roomId, 
        name, 
        description,
        created_by: createdBy,
        is_public: false,
        created_at: new Date().toISOString(),
        message: '群聊创建成功' 
      });
    });
  });
});

// 用户API - 邀请用户到群聊
app.post('/api/rooms/:roomId/invite', (req, res) => {
  const { roomId } = req.params;
  const { userIds } = req.body;
  const inviterId = req.headers['user-id'];
  
  if (!inviterId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  if (!userIds || userIds.length === 0) {
    return res.status(400).json({ error: '请选择要邀请的用户' });
  }
  
  // 检查邀请者是否在房间中
  db.get('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, inviterId], (err, member) => {
    if (err || !member) {
      return res.status(403).json({ error: '您不在此群聊中，无法邀请他人' });
    }
    
    // 批量邀请用户
    const placeholders = userIds.map(() => '(?, ?)').join(', ');
    const values = [];
    userIds.forEach(userId => {
      values.push(roomId, userId);
    });
    
    db.run(`
      INSERT OR IGNORE INTO room_members (room_id, user_id) 
      VALUES ${placeholders}
    `, values, function(err) {
      if (err) {
        return res.status(500).json({ error: '邀请用户失败' });
      }
      
      res.json({ message: `成功邀请 ${userIds.length} 个用户` });
    });
  });
});

// 用户API - 退出群聊
app.delete('/api/rooms/:roomId/leave', (req, res) => {
  const { roomId } = req.params;
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  // 不能退出公共房间
  db.get('SELECT is_public FROM rooms WHERE id = ?', [roomId], (err, room) => {
    if (err || !room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    
    if (room.is_public) {
      return res.status(400).json({ error: '不能退出公共房间' });
    }
    
    db.run('DELETE FROM room_members WHERE room_id = ? AND user_id = ?', [roomId, userId], function(err) {
      if (err) {
        return res.status(500).json({ error: '退出群聊失败' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: '您不在此群聊中' });
      }
      
      res.json({ message: '成功退出群聊' });
    });
  });
});

// 用户API - 获取用户的房间列表（包括群聊）
app.get('/api/user-rooms', (req, res) => {
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: '需要用户身份验证' });
  }
  
  db.all(`
    SELECT DISTINCT r.*, 
           CASE WHEN r.is_public = 1 THEN 1 ELSE rm.user_id IS NOT NULL END as is_member
    FROM rooms r
    LEFT JOIN room_members rm ON r.id = rm.room_id AND rm.user_id = ?
    WHERE r.is_public = 1 OR rm.user_id IS NOT NULL
    ORDER BY r.created_at ASC
  `, [userId], (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: '获取房间列表失败' });
    }
    res.json(rooms);
  });
});

// ===================
// 管理员API端点
// ===================

// 删除用户
app.delete('/api/admin/users/:userId', (req, res) => {
  const { userId } = req.params;
  const adminUserId = req.headers['user-id'];
  
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理员权限' });
  }

  // 检查是否尝试删除自己
  if (userId === adminUserId) {
    return res.status(400).json({ error: '不能删除自己的账户' });
  }

  db.serialize(() => {
    // 获取被删除用户的信息
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: '用户不存在' });
      }

      const username = user.username;

      // 删除用户相关数据
      db.run('DELETE FROM private_messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
      db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
      db.run('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?', [userId, userId]);
      db.run('DELETE FROM room_members WHERE user_id = ?', [userId]);
      db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) {
          return res.status(500).json({ error: '删除用户失败' });
        }

        // 通知所有在线用户
        io.emit('user_deleted', {
          deletedUserId: userId,
          deletedUsername: username
        });

        res.json({ message: `用户 ${username} 已被删除` });
      });
    });
  });
});

// 删除聊天室
app.delete('/api/admin/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const adminUserId = req.headers['user-id'];
  
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理员权限' });
  }

  // 不能删除默认房间
  if (['general', 'random', 'tech'].includes(roomId)) {
    return res.status(400).json({ error: '不能删除默认聊天室' });
  }

  db.serialize(() => {
    // 获取房间信息
    db.get('SELECT name FROM rooms WHERE id = ?', [roomId], (err, room) => {
      if (err || !room) {
        return res.status(404).json({ error: '聊天室不存在' });
      }

      const roomName = room.name;

      // 删除聊天室相关数据
      db.run('DELETE FROM messages WHERE room_id = ?', [roomId]);
      db.run('DELETE FROM room_members WHERE room_id = ?', [roomId]);
      db.run('DELETE FROM rooms WHERE id = ?', [roomId], (err) => {
        if (err) {
          return res.status(500).json({ error: '删除聊天室失败' });
        }

        res.json({ message: `聊天室 ${roomName} 已被删除` });
      });
    });
  });
});

// 删除消息
app.delete('/api/admin/messages/:messageId', (req, res) => {
  const { messageId } = req.params;
  const adminUserId = req.headers['user-id'];
  
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理员权限' });
  }

  db.run('DELETE FROM messages WHERE id = ?', [messageId], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除消息失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }

    // 通知所有用户消息已被删除
    io.emit('message_deleted', {
      messageId: messageId
    });

    res.json({ message: '消息已删除' });
  });
});

// 封禁用户
app.post('/api/admin/users/:userId/ban', (req, res) => {
  const { userId } = req.params;
  const { duration } = req.body; // 封禁时长（小时），0表示永久
  const adminUserId = req.headers['user-id'];
  
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理员权限' });
  }

  if (userId === adminUserId) {
    return res.status(400).json({ error: '不能封禁自己' });
  }

  // 这里可以实现封禁逻辑，暂时返回成功消息
  db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const banMessage = duration === 0 ? '永久封禁' : `封禁${duration}小时`;
    res.json({ message: `用户 ${user.username} 已被${banMessage}` });
  });
});

// 获取系统统计信息
app.get('/api/admin/stats', (req, res) => {
  const adminUserId = req.headers['user-id'];
  
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理员权限' });
  }

  db.serialize(() => {
    let stats = {};

    // 获取总用户数
    db.get('SELECT COUNT(*) as totalUsers FROM users', (err, result) => {
      if (err) {
        return res.status(500).json({ error: '获取统计信息失败' });
      }
      stats.totalUsers = result.totalUsers;

      // 获取在线用户数
      stats.onlineUsers = onlineUsers.size;

      // 获取总房间数
      db.get('SELECT COUNT(*) as totalRooms FROM rooms', (err, result) => {
        if (err) {
          return res.status(500).json({ error: '获取统计信息失败' });
        }
        stats.totalRooms = result.totalRooms;

        // 获取总消息数
        db.get('SELECT COUNT(*) as totalMessages FROM messages', (err, result) => {
          if (err) {
            return res.status(500).json({ error: '获取统计信息失败' });
          }
          stats.totalMessages = result.totalMessages;

          res.json(stats);
        });
      });
    });
  });
});

// 获取最近消息
app.get('/api/admin/recent-messages', (req, res) => {
  const adminUserId = req.headers['user-id'];
  const limit = parseInt(req.query.limit) || 20;
  
  if (!adminUserId) {
    return res.status(401).json({ error: '需要管理员权限' });
  }

  db.all(`
    SELECT m.*, r.name as room_name 
    FROM messages m 
    LEFT JOIN rooms r ON m.room_id = r.id 
    ORDER BY m.timestamp DESC 
    LIMIT ?
  `, [limit], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: '获取消息失败' });
    }

    // 添加头像字段
    const messagesWithAvatars = messages.map(message => ({
      ...message,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(message.username)}&background=fce7f3&color=be185d&size=128`
    }));

    res.json(messagesWithAvatars);
  });
});

// 静态文件服务 - 提供前端构建文件
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// 处理所有非API路由，返回React应用（SPA路由支持）
app.get('*', (req, res) => {
  // 确保不是API路由或Socket.io路由
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/socket.io/')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});

// Socket连接处理
io.on('connection', (socket) => {
  console.log(`新的Socket连接: ${socket.id}`);

  // 心跳检测
  let heartbeatInterval;
  const startHeartbeat = () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => {
      // 发送心跳包
      socket.emit('ping');
    }, 30000);
  };
  
  // 开始心跳检测
  startHeartbeat();
    
  // 接收心跳响应
  socket.on('pong', () => {
    console.log(`收到心跳响应: ${socket.id}`);
  });

  // 用户加入
  socket.on('user_join', (user) => {
    console.log(`用户加入: ${user.username} (${user.id})`);
    
    // 存储用户信息
    onlineUsers.set(socket.id, { ...user, socketId: socket.id });

    // 将用户ID与Socket关联
    socket.userId = user.id;
    
    // 广播在线用户列表
    io.emit('online_users', Array.from(onlineUsers.values()));
  });

  // 加入房间
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  // 离开房间
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  // 发送消息
  socket.on('send_message', async (data) => {
    const { user, message, roomId } = data;
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // 保存消息到数据库
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO messages (id, user_id, username, message, room_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
          [messageId, user.id, user.username, message, roomId, timestamp],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      // 广播消息给房间内所有用户
      const messageData = {
        id: messageId,
        content: message,
        message: message,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar
        },
        user_id: user.id,
        username: user.username,
        avatar: user.avatar,
        roomId,
        timestamp
      };

      io.to(roomId).emit('new_message', messageData);

      // 更新未读消息计数
      updateUnreadCount(roomId, user.id);
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  });

  // 发送私聊消息
  socket.on('send_private_message', async (data) => {
    const { sender, receiver, message } = data;
    const messageId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // 保存私聊消息到数据库
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO private_messages (id, sender_id, receiver_id, sender_username, receiver_username, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [messageId, sender.id, receiver.id, sender.username, receiver.username, message, timestamp],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });

      const messageData = {
        id: messageId,
        content: message,
        message: message,
        sender: {
          id: sender.id,
          username: sender.username,
          avatar: sender.avatar
        },
        receiver: {
          id: receiver.id,
          username: receiver.username,
          avatar: receiver.avatar
        },
        sender_id: sender.id,
        receiver_id: receiver.id,
        sender_username: sender.username,
        receiver_username: receiver.username,
        sender_avatar: sender.avatar,
        receiver_avatar: receiver.avatar,
        timestamp
      };

      // 发送给发送者
      socket.emit('new_private_message', messageData);
      
      // 发送给接收者
      const receiverSocket = Array.from(onlineUsers.values()).find(u => u.id === receiver.id)?.socketId;
      if (receiverSocket) {
        io.to(receiverSocket).emit('new_private_message', messageData);
      }

      // 更新未读消息计数
      updatePrivateUnreadCount(sender.id, receiver.id);
    } catch (error) {
      console.error('保存私聊消息失败:', error);
    }
  });

  // 处理打字状态
  socket.on('typing', (data) => {
    const { user, roomId } = data;
    const typingInfo = { user, roomId };
    
    // 添加到打字用户列表
    if (!typingUsers.has(roomId)) {
      typingUsers.set(roomId, []);
    }
    
    const roomTypingUsers = typingUsers.get(roomId);
    const existingUser = roomTypingUsers.find(u => u.user.id === user.id);
    
    if (!existingUser) {
      roomTypingUsers.push(typingInfo);
      
      // 广播给房间内其他用户
      socket.to(roomId).emit('typing', typingInfo);
    }
  });

  // 处理停止打字状态
  socket.on('stop_typing', (data) => {
    const { user, roomId } = data;
    
    if (typingUsers.has(roomId)) {
      const roomTypingUsers = typingUsers.get(roomId);
      const updatedUsers = roomTypingUsers.filter(u => u.user.id !== user.id);
      
      if (updatedUsers.length === 0) {
        typingUsers.delete(roomId);
      } else {
        typingUsers.set(roomId, updatedUsers);
      }
      
      // 广播给房间内其他用户
      socket.to(roomId).emit('stop_typing', { user, roomId });
    }
  });

  // 处理私聊打字状态
  socket.on('private_typing', (data) => {
    const { user, receiverId } = data;
    const typingInfo = { user, receiverId };
    
    // 添加到私聊打字用户列表
    if (!privateTypingUsers.has(receiverId)) {
      privateTypingUsers.set(receiverId, []);
    }
    
    const userTypingUsers = privateTypingUsers.get(receiverId);
    const existingUser = userTypingUsers.find(u => u.user.id === user.id);
    
    if (!existingUser) {
      userTypingUsers.push(typingInfo);
      
      // 发送给目标用户
      const receiverSocket = Array.from(onlineUsers.values()).find(u => u.id === receiverId)?.socketId;
      if (receiverSocket) {
        io.to(receiverSocket).emit('private_typing', typingInfo);
      }
    }
  });

  // 处理私聊停止打字状态
  socket.on('private_stop_typing', (data) => {
    const { user, receiverId } = data;
    
    if (privateTypingUsers.has(receiverId)) {
      const userTypingUsers = privateTypingUsers.get(receiverId);
      const updatedUsers = userTypingUsers.filter(u => u.user.id !== user.id);
      
      if (updatedUsers.length === 0) {
        privateTypingUsers.delete(receiverId);
      } else {
        privateTypingUsers.set(receiverId, updatedUsers);
      }
      
      // 发送给目标用户
      const receiverSocket = Array.from(onlineUsers.values()).find(u => u.id === receiverId)?.socketId;
      if (receiverSocket) {
        io.to(receiverSocket).emit('private_stop_typing', { user, receiverId });
      }
    }
  });

  // 获取未读消息数
  async function sendUnreadMessagesCount(userId) {
    try {
      // 获取房间未读消息数 - 简化查询，暂时不使用last_read功能
      const roomUnreadCounts = await new Promise((resolve, reject) => {
        const query = `
          SELECT m.room_id, COUNT(*) as count 
          FROM messages m
          WHERE m.room_id IN (
            SELECT room_id FROM room_members WHERE user_id = ?
          )
          AND m.user_id != ? 
          AND m.timestamp > datetime('now', '-7 days')
          GROUP BY m.room_id
        `;
        
        db.all(query, [userId, userId], (err, rows) => {
          if (err) {
            console.warn("获取房间未读消息数失败:", err);
            resolve([]); // 失败时返回空数组而不是拒绝Promise
          } else {
            resolve(rows || []);
          }
        });
      });

      // 获取私聊未读消息数
      const privateUnreadCounts = await new Promise((resolve, reject) => {
        db.all(
          `SELECT sender_id as userId, COUNT(*) as count 
           FROM private_messages 
           WHERE receiver_id = ? AND is_read = 0 
           GROUP BY sender_id`,
          [userId],
          (err, rows) => {
            if (err) {
              console.warn("获取私聊未读消息数失败:", err);
              resolve([]); // 失败时返回空数组而不是拒绝Promise
            } else {
              resolve(rows || []);
            }
          }
        );
      });

      // 发送未读消息数给用户
      const socketId = Array.from(onlineUsers.values())
        .find(u => u.id === userId)?.socketId;
    
      if (socketId) {
        io.to(socketId).emit('room_unread_counts', roomUnreadCounts);
        io.to(socketId).emit('private_unread_counts', privateUnreadCounts);
      }
    } catch (error) {
      console.warn('获取未读消息数失败:', error.message);
    }
  }

  // 更新群聊未读消息计数
  async function updateUnreadCount(roomId, senderId) {
    try {
      const members = await new Promise((resolve, reject) => {
        db.all('SELECT user_id FROM room_members WHERE room_id = ? AND user_id != ?', [roomId, senderId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      members.forEach(member => {
        sendUnreadMessagesCount(member.user_id);
      });
    } catch (error) {
      console.error('更新未读消息计数失败:', error);
    }
  }

  // 更新私聊未读消息计数
  async function updatePrivateUnreadCount(senderId, receiverId) {
    try {
      await sendUnreadMessagesCount(receiverId);
    } catch (error) {
      console.error('更新私聊未读消息计数失败:', error);
    }
  }

  // 监听Socket断开连接
  socket.on('disconnect', (reason) => {
    console.log(`Socket断开连接: ${socket.id}, 原因: ${reason}`);
    
    // 清除心跳检测
    clearInterval(heartbeatInterval);
    
    // 移除用户
    if (onlineUsers.has(socket.id)) {
      const user = onlineUsers.get(socket.id);
      console.log(`用户离线: ${user.username} (${user.id})`);
      onlineUsers.delete(socket.id);
      
      // 广播在线用户列表
      io.emit('online_users', Array.from(onlineUsers.values()));
    }
    
    // 清除该用户的输入状态
    const roomsTyping = [];
    typingUsers.forEach((users, roomId) => {
      const updatedUsers = users.filter(u => u.socketId !== socket.id);
      if (updatedUsers.length === 0) {
        roomsTyping.push(roomId);
      } else {
        typingUsers.set(roomId, updatedUsers);
      }
    });
    
    // 删除空房间的输入状态
    roomsTyping.forEach(roomId => {
      typingUsers.delete(roomId);
    });
    
    // 清除该用户的私聊输入状态
    const privateTyping = [];
    privateTypingUsers.forEach((users, userId) => {
      const updatedUsers = users.filter(u => u.socketId !== socket.id);
      if (updatedUsers.length === 0) {
        privateTyping.push(userId);
      } else {
        privateTypingUsers.set(userId, updatedUsers);
      }
    });
    
    // 删除空的私聊输入状态
    privateTyping.forEach(userId => {
      privateTypingUsers.delete(userId);
    });
  });
  
  // 添加重连处理
  socket.on('reconnect_attempt', () => {
    console.log(`Socket重连尝试: ${socket.id}`);
  });
  
  socket.on('reconnect', () => {
    console.log(`Socket重连成功: ${socket.id}`);
    // 重新开始心跳检测
    startHeartbeat();
  });
  
  socket.on('reconnect_error', (error) => {
    console.log(`Socket重连失败: ${socket.id}, 错误: ${error}`);
  });
  
  socket.on('error', (error) => {
    console.log(`Socket错误: ${socket.id}, 错误: ${error}`);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📡 Socket.io 服务器已启动`);
});

// 错误处理
server.on('error', (error) => {
  console.error('服务器错误:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请尝试其他端口`);
  }
});

// 进程错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err);
      } else {
        console.log('数据库连接已关闭');
      }
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err);
      } else {
        console.log('数据库连接已关闭');
      }
      process.exit(0);
    });
  });
}); 