const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./chat.db');

console.log('检查数据库表结构...');

// 检查所有表
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('错误:', err);
    return;
  }
  
  console.log('数据库中的表:', tables.map(t => t.name));
  
  // 检查friendships表结构
  db.all("PRAGMA table_info(friendships)", (err, columns) => {
    if (err) {
      console.error('friendships表错误:', err);
    } else {
      console.log('friendships表结构:', columns);
    }
    
    // 检查friendships表中的数据
    db.all("SELECT COUNT(*) as count FROM friendships", (err, result) => {
      if (err) {
        console.error('查询friendships数据错误:', err);
      } else {
        console.log('friendships表中的记录数:', result[0].count);
      }
      
      // 检查用户表
      db.all("SELECT COUNT(*) as count FROM users", (err, result) => {
        if (err) {
          console.error('查询users数据错误:', err);
        } else {
          console.log('users表中的记录数:', result[0].count);
        }
        
        db.close();
      });
    });
  });
}); 