const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./chat.db');

console.log('测试好友添加API...');

// 获取所有用户
db.all("SELECT id, username FROM users LIMIT 5", (err, users) => {
  if (err) {
    console.error('获取用户失败:', err);
    return;
  }
  
  console.log('可用用户:', users);
  
  if (users.length < 2) {
    console.log('需要至少2个用户来测试好友功能');
    db.close();
    return;
  }
  
  const user1 = users[0];
  const user2 = users[1];
  
  console.log(`测试用户 ${user1.username} (${user1.id}) 添加好友 ${user2.username} (${user2.id})`);
  
  // 检查是否已经是好友
  db.get(`
    SELECT * FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `, [user1.id, user2.id, user2.id, user1.id], (err, existing) => {
    if (err) {
      console.error('检查好友关系失败:', err);
      db.close();
      return;
    }
    
    if (existing) {
      console.log('已经是好友关系:', existing);
      
      // 查看所有好友关系
      db.all("SELECT * FROM friendships WHERE user_id = ? OR friend_id = ?", [user1.id, user1.id], (err, friendships) => {
        if (err) {
          console.error('查询好友关系失败:', err);
        } else {
          console.log(`用户 ${user1.username} 的所有好友关系:`, friendships);
        }
        db.close();
      });
    } else {
      console.log('不是好友，可以添加');
      
      // 模拟添加好友
      db.run(`
        INSERT INTO friendships (user_id, friend_id, status) 
        VALUES (?, ?, 'accepted')
      `, [user1.id, user2.id], function(err) {
        if (err) {
          console.error('添加好友失败:', err);
          db.close();
          return;
        }
        
        console.log('好友关系添加成功，ID:', this.lastID);
        
        // 添加反向关系
        db.run(`
          INSERT INTO friendships (user_id, friend_id, status) 
          VALUES (?, ?, 'accepted')
        `, [user2.id, user1.id], function(err) {
          if (err) {
            console.error('添加反向好友关系失败:', err);
          } else {
            console.log('反向好友关系添加成功，ID:', this.lastID);
          }
          
          // 验证添加结果
          db.all(`
            SELECT u.username, f.status, f.created_at
            FROM friendships f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = ?
          `, [user1.id], (err, friends) => {
            if (err) {
              console.error('查询好友列表失败:', err);
            } else {
              console.log(`用户 ${user1.username} 的好友列表:`, friends);
            }
            db.close();
          });
        });
      });
    }
  });
}); 