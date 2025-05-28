import React, { useState, useEffect, useCallback } from 'react';
import { User, Message, PrivateMessage, Room, TypingUser, PrivateTypingUser, UnreadCount, RoomUnreadCount } from '../types';
import socketService from '../services/socket';
import apiService from '../services/api';
import notificationService from '../services/notification';
import { sendMessageWithConnectionCheck, sendPrivateMessageWithConnectionCheck } from '../utils/socket-utils';
import ChatRoom from './ChatRoom';
import PrivateChatRoom from './PrivateChatRoom';
import Sidebar from './Sidebar';
import CreateGroupChatModal from './CreateGroupChatModal';
import AdminPanel from './AdminPanel';

interface ChatAppProps {
  user: User;
  onLogout: () => void;
}

const ChatApp: React.FC<ChatAppProps> = ({ user, onLogout }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string>('general');
  const [currentPrivateUser, setCurrentPrivateUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [privateMessages, setPrivateMessages] = useState<{ [key: string]: PrivateMessage[] }>({});
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [privateTypingUsers, setPrivateTypingUsers] = useState<PrivateTypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // 未读消息计数
  const [privateUnreadCounts, setPrivateUnreadCounts] = useState<UnreadCount[]>([]);
  const [roomUnreadCounts, setRoomUnreadCounts] = useState<RoomUnreadCount[]>([]);
  
  // 群聊创建模态框
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  
  // 管理面板
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // 初始化通知服务
  useEffect(() => {
    const initNotifications = async () => {
      if (notificationService.isSupported()) {
        await notificationService.requestPermission();
      }
    };
    initNotifications();
  }, []);

  // 刷新用户列表的函数
  const refreshUserList = useCallback(async () => {
    try {
      // 加载用户列表
      const usersData = await apiService.getUsers(user.id);
      
      // 加载好友列表
      const friendsData = await apiService.getFriends();
      
      // 标记用户的好友状态
      const usersWithFriendStatus = usersData.map(u => ({
        ...u,
        isFriend: friendsData.some(f => f.id === u.id)
      }));
      
      // 使用React.startTransition确保状态更新的优先级
      React.startTransition(() => {
        setAllUsers(usersWithFriendStatus);
        
        // 更新在线用户的好友状态，保持在线状态
        setOnlineUsers(prev => prev.map(onlineUser => {
          const updatedUser = usersWithFriendStatus.find(u => u.id === onlineUser.id);
          return updatedUser ? { ...updatedUser, isOnline: true } : onlineUser;
        }));
      });
      
      console.log('用户列表刷新完成，好友数量:', friendsData.length);
    } catch (error) {
      console.error('刷新用户列表失败:', error);
    }
  }, [user.id]);

  // 设置Socket事件监听器
  const setupSocketEventListeners = useCallback(() => {
    console.log('设置Socket事件监听器');
    
    // 监听新消息
    socketService.onNewMessage((message: Message) => {
      console.log('收到新消息:', message);
      setMessages(prev => {
        const updated = { ...prev };
        if (!updated[message.roomId]) {
          updated[message.roomId] = [];
        }
        
        // 智能去重：如果是自己发送的消息，先移除临时消息
        if (message.user_id === user.id) {
          updated[message.roomId] = updated[message.roomId].filter(m => 
            !m.id.startsWith('temp-') || m.content !== message.content
          );
        }
        
        // 避免重复消息
        const exists = updated[message.roomId].some(m => m.id === message.id);
        if (!exists) {
          updated[message.roomId] = [...updated[message.roomId], message];
        }
        
        return updated;
      });
      
      // 更新未读消息计数
      if (message.user.id !== user.id) {
        setRoomUnreadCounts(prev => {
          const existing = prev.find(c => c.roomId === message.roomId);
          if (existing) {
            return prev.map(c => 
              c.roomId === message.roomId 
                ? { ...c, count: c.count + 1 }
                : c
            );
          } else {
            return [...prev, { roomId: message.roomId, count: 1 }];
          }
        });
      }
    });

    // 监听私聊消息
    socketService.onNewPrivateMessage((message: PrivateMessage) => {
      console.log('收到私聊消息:', message);
      setPrivateMessages(prev => {
        const updated = { ...prev };
        
        // 修复：确定对话的另一方用户ID
        // 如果是自己发送的消息，对方是receiver
        // 如果是接收的消息，对方是sender
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        
        if (!updated[otherUserId]) {
          updated[otherUserId] = [];
        }
        
        // 智能去重：如果是自己发送的消息，先移除临时消息
        if (message.sender_id === user.id) {
          updated[otherUserId] = updated[otherUserId].filter(m => 
            !m.id.startsWith('temp-') || m.content !== message.content
          );
        }
        
        // 避免重复消息
        const exists = updated[otherUserId].some(m => m.id === message.id);
        if (!exists) {
          updated[otherUserId] = [...updated[otherUserId], message];
        }
        
        return updated;
      });
      
      // 更新私聊未读消息计数（只对接收到的消息计数）
      if (message.sender_id !== user.id) {
        setPrivateUnreadCounts(prev => {
          const existing = prev.find(c => c.userId === message.sender_id);
          if (existing) {
            return prev.map(c => 
              c.userId === message.sender_id 
                ? { ...c, count: c.count + 1 }
                : c
            );
          } else {
            return [...prev, { userId: message.sender_id, count: 1 }];
          }
        });
      }
    });

    // 监听在线用户
    socketService.onOnlineUsers((users) => {
      console.log('收到在线用户列表:', users);
      
      // 更新在线用户列表，保持好友状态
      setOnlineUsers(prev => {
        return users.map(onlineUser => {
          // 从当前allUsers中找到对应用户，保持好友状态
          const existingUser = prev.find(u => u.id === onlineUser.id);
          return existingUser ? { ...onlineUser, isFriend: existingUser.isFriend } : onlineUser;
        });
      });
      
      // 更新用户的在线状态，保持好友状态
      setAllUsers(prev => prev.map(u => ({
        ...u,
        isOnline: users.some(onlineUser => onlineUser.id === u.id)
      })));
    });

    // 监听输入状态
    socketService.onTyping((data: TypingUser) => {
      setTypingUsers(prev => {
        const exists = prev.some(u => u.user.id === data.user.id && u.roomId === data.roomId);
        return exists ? prev : [...prev, data];
      });
    });

    socketService.onStopTyping((data: TypingUser) => {
      setTypingUsers(prev => prev.filter(u => !(u.user.id === data.user.id && u.roomId === data.roomId)));
    });

    // 监听私聊输入状态
    socketService.onPrivateTyping((data: PrivateTypingUser) => {
      setPrivateTypingUsers(prev => {
        const exists = prev.some(u => u.user.id === data.user.id && u.receiverId === data.receiverId);
        return exists ? prev : [...prev, data];
      });
    });

    socketService.onPrivateStopTyping((data: PrivateTypingUser) => {
      setPrivateTypingUsers(prev => prev.filter(u => !(u.user.id === data.user.id && u.receiverId === data.receiverId)));
    });

    // 监听好友添加事件
    socketService.on('friend_added', (data: { userId: string; friendId: string; userName: string; friendName: string }) => {
      console.log('收到好友添加通知:', data);
      
      // 如果当前用户是其中一方，立即更新本地状态并刷新好友列表
      if (data.userId === user.id || data.friendId === user.id) {
        // 立即更新本地状态
        const otherUserId = data.userId === user.id ? data.friendId : data.userId;
        const otherUserName = data.userId === user.id ? data.friendName : data.userName;
        
        // 更新allUsers中的好友状态
        setAllUsers(prev => prev.map(u => 
          u.id === otherUserId ? { ...u, isFriend: true } : u
        ));
        
        // 更新onlineUsers中的好友状态
        setOnlineUsers(prev => prev.map(u => 
          u.id === otherUserId ? { ...u, isFriend: true } : u
        ));
        
        // 延迟刷新确保数据一致性
        setTimeout(() => {
          refreshUserList();
        }, 100);
        
        console.log(`好友关系已更新: ${otherUserName} 现在是好友`);
      }
    });

    // 监听好友删除事件
    socketService.on('friend_removed', (data: { userId: string; friendId: string; userName: string; friendName: string }) => {
      console.log('收到好友删除通知:', data);
      
      // 如果当前用户是其中一方，立即更新本地状态并刷新好友列表
      if (data.userId === user.id || data.friendId === user.id) {
        // 立即更新本地状态
        const otherUserId = data.userId === user.id ? data.friendId : data.userId;
        const otherUserName = data.userId === user.id ? data.friendName : data.userName;
        
        // 更新allUsers中的好友状态
        setAllUsers(prev => prev.map(u => 
          u.id === otherUserId ? { ...u, isFriend: false } : u
        ));
        
        // 更新onlineUsers中的好友状态
        setOnlineUsers(prev => prev.map(u => 
          u.id === otherUserId ? { ...u, isFriend: false } : u
        ));
        
        // 延迟刷新确保数据一致性
        setTimeout(() => {
          refreshUserList();
        }, 100);
        
        console.log(`好友关系已更新: ${otherUserName} 不再是好友`);
      }
    });
  }, [user.id, user, refreshUserList]);

  // 初始化和Socket连接
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 加载房间列表
        const roomsData = await apiService.getRooms();
        setRooms(roomsData);
        
        // 加载用户列表
        await refreshUserList();
        
        // 加载消息历史 - 为每个房间单独加载
        const messagesByRoom: { [key: string]: Message[] } = {};
        for (const room of roomsData) {
          try {
            const roomMessages = await apiService.getMessages(room.id);
            messagesByRoom[room.id] = roomMessages;
          } catch (error) {
            console.error(`加载房间 ${room.id} 消息失败:`, error);
            messagesByRoom[room.id] = [];
          }
        }
        setMessages(messagesByRoom);
        
        setIsLoading(false);
      } catch (error) {
        console.error('加载数据失败:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, [user.id, refreshUserList]);

  // Socket连接和事件监听
  useEffect(() => {
    // 连接Socket
    socketService.connect();
    
    // 设置连接状态监听
    socketService.onConnectionChange((connected) => {
      if (connected) {
        console.log('Socket连接成功，设置用户和事件监听器');
        socketService.joinUser(user);
        
        // 重新设置事件监听器（关键修复）
        setTimeout(() => {
          setupSocketEventListeners();
          refreshUserList();
        }, 500);
      } else {
        console.log('Socket连接断开');
      }
    });

    // 初始设置事件监听器
    if (socketService.isConnected()) {
      setupSocketEventListeners();
    }

    return () => {
      socketService.disconnect();
    };
  }, [user, setupSocketEventListeners, refreshUserList]);

  const handleRoomChange = (roomId: string) => {
    setCurrentRoom(roomId);
    setCurrentPrivateUser(null);
    
    // 清除该房间的未读计数
    setRoomUnreadCounts(prev => prev.filter(c => c.roomId !== roomId));
  };

  const handlePrivateChat = async (targetUser: User) => {
    setCurrentPrivateUser(targetUser);
    setCurrentRoom('');
    
    // 清除该用户的未读计数
    setPrivateUnreadCounts(prev => prev.filter(c => c.userId !== targetUser.id));
    
    // 如果还没有与该用户的聊天记录，初始化
    if (!privateMessages[targetUser.id]) {
      try {
        const messages = await apiService.getPrivateMessages(targetUser.id, user.id);
        setPrivateMessages(prev => ({
          ...prev,
          [targetUser.id]: messages
        }));
      } catch (error) {
        console.error('加载私聊消息失败:', error);
      }
    }
  };

  const handleSendMessage = async (message: string, image?: File) => {
    if (!currentRoom) return;
    
    // 乐观更新：立即添加消息到本地状态
    const tempMessage: Message = {
      id: `temp-${Date.now()}`, // 临时ID
      user: user,
      user_id: user.id,
      username: user.username,
      avatar: user.avatar,
      content: message,
      message: message,
      roomId: currentRoom,
      timestamp: new Date().toISOString()
    };
    
    // 立即添加到本地状态
    setMessages(prev => {
      const updated = { ...prev };
      if (!updated[currentRoom]) {
        updated[currentRoom] = [];
      }
      updated[currentRoom] = [...updated[currentRoom], tempMessage];
      return updated;
    });
    
    try {
      const result = await sendMessageWithConnectionCheck(user, message, currentRoom, image);
      if (result) {
        console.log('消息发送成功');
        // 服务器响应后，临时消息会被真实消息替换（通过socket监听器）
      } else {
        // 发送失败，移除乐观更新的消息
        setMessages(prev => {
          const updated = { ...prev };
          if (updated[currentRoom]) {
            updated[currentRoom] = updated[currentRoom].filter(m => m.id !== tempMessage.id);
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      // 发送失败，移除乐观更新的消息
      setMessages(prev => {
        const updated = { ...prev };
        if (updated[currentRoom]) {
          updated[currentRoom] = updated[currentRoom].filter(m => m.id !== tempMessage.id);
        }
        return updated;
      });
      alert('发送消息失败，请重试');
    }
  };

  const handleSendPrivateMessage = async (message: string, image?: File) => {
    if (!currentPrivateUser) return;
    
    // 乐观更新：立即添加消息到本地状态
    const tempMessage: PrivateMessage = {
      id: `temp-${Date.now()}`, // 临时ID
      sender: user,
      receiver: currentPrivateUser,
      sender_id: user.id,
      receiver_id: currentPrivateUser.id,
      sender_username: user.username,
      receiver_username: currentPrivateUser.username,
      sender_avatar: user.avatar,
      receiver_avatar: currentPrivateUser.avatar,
      content: message,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    // 立即添加到本地状态
    setPrivateMessages(prev => {
      const updated = { ...prev };
      if (!updated[currentPrivateUser.id]) {
        updated[currentPrivateUser.id] = [];
      }
      updated[currentPrivateUser.id] = [...updated[currentPrivateUser.id], tempMessage];
      return updated;
    });
    
    try {
      const result = await sendPrivateMessageWithConnectionCheck(user, currentPrivateUser, message, image);
      if (result) {
        console.log('私聊消息发送成功');
        // 服务器响应后，临时消息会被真实消息替换（通过socket监听器）
      } else {
        // 发送失败，移除乐观更新的消息
        setPrivateMessages(prev => {
          const updated = { ...prev };
          if (updated[currentPrivateUser.id]) {
            updated[currentPrivateUser.id] = updated[currentPrivateUser.id].filter(m => m.id !== tempMessage.id);
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('发送私聊消息失败:', error);
      // 发送失败，移除乐观更新的消息
      setPrivateMessages(prev => {
        const updated = { ...prev };
        if (updated[currentPrivateUser.id]) {
          updated[currentPrivateUser.id] = updated[currentPrivateUser.id].filter(m => m.id !== tempMessage.id);
        }
        return updated;
      });
      alert('发送私聊消息失败，请重试');
    }
  };

  const handleTyping = () => {
    if (currentRoom) {
      socketService.sendTyping(currentRoom);
    }
  };

  const handleStopTyping = () => {
    if (currentRoom) {
      socketService.sendStopTyping(currentRoom);
    }
  };

  const handlePrivateTyping = () => {
    if (currentPrivateUser) {
      socketService.sendPrivateTyping(currentPrivateUser.id);
    }
  };

  const handlePrivateStopTyping = () => {
    if (currentPrivateUser) {
      socketService.sendPrivateStopTyping(currentPrivateUser.id);
    }
  };

  const handleCreateGroupChat = async (name: string, description: string, inviteUsers: string[]) => {
    try {
      const newRoom = await apiService.createRoom(name, description);
      setRooms(prev => [...prev, newRoom]);
      setShowCreateGroupModal(false);
      setCurrentRoom(newRoom.id);
      setCurrentPrivateUser(null);
    } catch (error) {
      console.error('创建群聊失败:', error);
      alert('创建群聊失败');
    }
  };

  const handleAddFriend = async (targetUser: User) => {
    try {
      await apiService.addFriend(targetUser.id);
      
      // 立即更新本地状态 - 标记用户为好友
      setAllUsers(prev => prev.map(u => 
        u.id === targetUser.id ? { ...u, isFriend: true } : u
      ));
      
      // 同步更新在线用户的好友状态
      setOnlineUsers(prev => prev.map(u => 
        u.id === targetUser.id ? { ...u, isFriend: true } : u
      ));
      
      // 异步刷新完整的用户列表（确保数据一致性）
      setTimeout(() => {
        refreshUserList();
      }, 100);
      
      alert(`已添加 ${targetUser.username} 为好友`);
    } catch (error) {
      console.error('添加好友失败:', error);
      if (error instanceof Error && error.message.includes('已经是好友')) {
        alert('你们已经是好友了');
      } else {
        alert('添加好友失败');
      }
    }
  };

  const handleRemoveFriend = async (targetUser: User) => {
    try {
      await apiService.removeFriend(targetUser.id);
      
      // 立即更新本地状态 - 取消好友标记
      setAllUsers(prev => prev.map(u => 
        u.id === targetUser.id ? { ...u, isFriend: false } : u
      ));
      
      // 同步更新在线用户的好友状态
      setOnlineUsers(prev => prev.map(u => 
        u.id === targetUser.id ? { ...u, isFriend: false } : u
      ));
      
      // 异步刷新完整的用户列表（确保数据一致性）
      setTimeout(() => {
        refreshUserList();
      }, 100);
      
      alert(`已移除 ${targetUser.username} 的好友关系`);
    } catch (error) {
      console.error('移除好友失败:', error);
      alert('移除好友失败');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await apiService.deleteMessage(messageId);
      
      // 从本地状态中移除消息
      setMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(roomId => {
          updated[roomId] = updated[roomId].filter(m => m.id !== messageId);
        });
        return updated;
      });
    } catch (error) {
      console.error('删除消息失败:', error);
      alert('删除消息失败');
    }
  };

  const handleDeletePrivateMessage = async (messageId: string) => {
    try {
      await apiService.deletePrivateMessage(messageId);
      
      // 从本地状态中移除消息
      setPrivateMessages(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          updated[userId] = updated[userId].filter(m => m.id !== messageId);
        });
        return updated;
      });
    } catch (error) {
      console.error('删除私聊消息失败:', error);
      alert('删除私聊消息失败');
    }
  };

  const handleAdminUserDeleted = (userId: string) => {
    // 从用户列表中移除
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    setOnlineUsers(prev => prev.filter(u => u.id !== userId));
    
    // 如果当前正在与该用户私聊，关闭私聊
    if (currentPrivateUser && currentPrivateUser.id === userId) {
      setCurrentPrivateUser(null);
      setCurrentRoom('general');
    }
    
    // 移除相关的私聊消息和未读计数
    setPrivateMessages(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
    setPrivateUnreadCounts(prev => prev.filter(c => c.userId !== userId));
  };

  const handleAdminRoomDeleted = (roomId: string) => {
    // 从房间列表中移除
    setRooms(prev => prev.filter(r => r.id !== roomId));
    
    // 如果当前在该房间，切换到默认房间
    if (currentRoom === roomId) {
      setCurrentRoom('general');
    }
    
    // 移除相关的消息和未读计数
    setMessages(prev => {
      const updated = { ...prev };
      delete updated[roomId];
      return updated;
    });
    setRoomUnreadCounts(prev => prev.filter(c => c.roomId !== roomId));
  };

  const handleLogout = () => {
    socketService.disconnect();
    onLogout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-cream-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const currentRoomData = rooms.find((room: Room) => room.id === currentRoom);
  const currentMessages = messages[currentRoom] || [];
  const currentPrivateMessages = currentPrivateUser ? privateMessages[currentPrivateUser.id] || [] : [];
  const currentTypingUsers = typingUsers.filter((t: TypingUser) => t.roomId === currentRoom);
  const currentPrivateTypingUsers = currentPrivateUser 
    ? privateTypingUsers.filter((t: PrivateTypingUser) => t.receiverId === currentPrivateUser.id)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-cream-100">
      <div className="flex h-screen">
        {/* 侧边栏 */}
        <Sidebar
          user={user}
          rooms={rooms}
          allUsers={allUsers}
          currentRoom={currentRoom}
          currentPrivateUser={currentPrivateUser}
          onlineUsers={onlineUsers}
          privateUnreadCounts={privateUnreadCounts}
          roomUnreadCounts={roomUnreadCounts}
          onRoomChange={handleRoomChange}
          onPrivateChat={handlePrivateChat}
          onAddFriend={handleAddFriend}
          onRemoveFriend={handleRemoveFriend}
          onShowAdmin={() => setShowAdminPanel(true)}
          onLogout={handleLogout}
          onCreateGroupChat={() => setShowCreateGroupModal(true)}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* 主聊天区域 */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {currentPrivateUser ? (
            <PrivateChatRoom
              currentUser={user}
              targetUser={currentPrivateUser}
              messages={currentPrivateMessages}
              typingUsers={currentPrivateTypingUsers}
              onSendMessage={handleSendPrivateMessage}
              onTyping={handlePrivateTyping}
              onStopTyping={handlePrivateStopTyping}
              onDeleteMessage={handleDeletePrivateMessage}
              placeholder={`给 ${currentPrivateUser.username} 发送消息...`}
            />
          ) : (
            <ChatRoom
              room={currentRoomData}
              messages={currentMessages}
              currentUser={user}
              typingUsers={currentTypingUsers}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
              onDeleteMessage={handleDeleteMessage}
              placeholder={currentRoomData ? `在 ${currentRoomData.name} 中发送消息...` : '发送消息...'}
            />
          )}
        </div>
      </div>

      {/* 创建群聊模态框 */}
      <CreateGroupChatModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        allUsers={allUsers.filter(u => u.isFriend)}
        onCreateGroup={handleCreateGroupChat}
      />

      {/* 管理面板 */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">管理面板</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <AdminPanel
              user={user}
              allUsers={allUsers}
              rooms={rooms}
              onlineUsers={onlineUsers}
              onClose={() => setShowAdminPanel(false)}
              onUserDeleted={handleAdminUserDeleted}
              onRoomDeleted={handleAdminRoomDeleted}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp; 