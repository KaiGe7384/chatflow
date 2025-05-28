import React from 'react';
import { User, Room, UnreadCount, RoomUnreadCount } from '../types';

interface SidebarProps {
  user: User;
  rooms: Room[];
  allUsers: User[];
  currentRoom: string;
  currentPrivateUser: User | null;
  onlineUsers: User[];
  privateUnreadCounts: UnreadCount[];
  roomUnreadCounts: RoomUnreadCount[];
  onRoomChange: (roomId: string) => void;
  onPrivateChat: (user: User) => void;
  onAddFriend?: (user: User) => void;
  onShowAdmin?: () => void;
  onLogout: () => void;
  onCreateGroupChat?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onRemoveFriend?: (user: User) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  rooms,
  allUsers,
  currentRoom,
  currentPrivateUser,
  onlineUsers,
  privateUnreadCounts,
  roomUnreadCounts,
  onRoomChange,
  onPrivateChat,
  onAddFriend,
  onShowAdmin,
  onLogout,
  onCreateGroupChat,
  isOpen,
  onToggle,
  onRemoveFriend
}) => {
  const isUserOnline = (userId: string) => {
    return onlineUsers.some(onlineUser => onlineUser.id === userId);
  };

  const getPrivateUnreadCount = (userId: string) => {
    const unread = privateUnreadCounts.find(c => c.userId === userId);
    return unread ? unread.count : 0;
  };

  const getRoomUnreadCount = (roomId: string) => {
    const unread = roomUnreadCounts.find(c => c.roomId === roomId);
    return unread ? unread.count : 0;
  };

  return (
    <>
      {/* 遮罩层 - 移动端 */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div className={`
        fixed lg:relative z-50 lg:z-0
        w-80 h-full bg-white/90 backdrop-blur-sm border-r border-pink-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* 头部 - 用户信息 */}
          <div className="p-6 border-b border-pink-200">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-12 h-12 rounded-full border-2 border-pink-300"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{user.username}</h3>
                <p className="text-sm text-pink-500">在线</p>
              </div>
              <div className="flex space-x-1">
                {onShowAdmin && (
                  <button
                    onClick={onShowAdmin}
                    className="p-2 rounded-lg hover:bg-pink-100 text-pink-500 hover:text-pink-600 transition-colors"
                    title="管理面板"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg hover:bg-pink-100 text-pink-500 hover:text-pink-600 transition-colors"
                  title="退出登录"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* 在线状态 */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>{onlineUsers.length} 人在线</span>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* 聊天室列表 */}
            <div className="p-4 border-b border-pink-100">
              <div className="flex items-center justify-between mb-3 px-2">
                <h4 className="text-sm font-semibold text-gray-600">聊天室</h4>
                {onCreateGroupChat && (
                  <button
                    onClick={onCreateGroupChat}
                    className="p-1 rounded-lg bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
                    title="创建群聊"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {rooms.map((room) => {
                  const unreadCount = getRoomUnreadCount(room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => onRoomChange(room.id)}
                      className={`
                        w-full text-left p-3 rounded-xl transition-all duration-200 relative
                        ${currentRoom === room.id && !currentPrivateUser
                          ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg' 
                          : 'hover:bg-pink-50 text-gray-700'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-3 h-3 rounded-full
                          ${currentRoom === room.id && !currentPrivateUser ? 'bg-white' : 'bg-pink-300'}
                        `} />
                        <div className="flex-1">
                          <div className="font-medium">{room.name}</div>
                          <div className={`
                            text-sm truncate
                            ${currentRoom === room.id && !currentPrivateUser ? 'text-pink-100' : 'text-gray-500'}
                          `}>
                            {room.description}
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 好友列表 */}
            <div className="p-4 border-b border-pink-100">
              <h4 className="text-sm font-semibold text-gray-600 mb-3 px-2">好友列表</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {allUsers.filter(user => user.isFriend).length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    <div className="text-sm">暂无好友</div>
                    <div className="text-xs mt-1">在下面的在线用户中添加好友吧！</div>
                  </div>
                ) : (
                  allUsers.filter(user => user.isFriend).map((chatUser) => {
                  const unreadCount = getPrivateUnreadCount(chatUser.id);
                    const isOnline = isUserOnline(chatUser.id);
                  return (
                      <button
                      key={chatUser.id}
                        onClick={() => onPrivateChat(chatUser)}
                      className={`
                        w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center space-x-3 relative
                        ${currentPrivateUser?.id === chatUser.id
                          ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg' 
                          : 'hover:bg-pink-50 text-gray-700'
                        }
                      `}
                    >
                      <div className="relative">
                        <img
                          src={chatUser.avatar}
                          alt={chatUser.username}
                            className="w-10 h-10 rounded-full border-2 border-pink-200"
                        />
                          {isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${currentPrivateUser?.id === chatUser.id ? 'text-white' : 'text-gray-800'}`}>
                          {chatUser.username}
                        </div>
                        <div className={`text-xs ${currentPrivateUser?.id === chatUser.id ? 'text-pink-100' : 'text-gray-500'}`}>
                            {isOnline ? '🟢 在线' : '⚫ 离线'} • 好友
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {unreadCount > 0 && (
                            <div className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`确定要删除好友 ${chatUser.username} 吗？`)) {
                                  onRemoveFriend && onRemoveFriend(chatUser);
                                }
                              }}
                            className={`text-xs p-1 rounded ${currentPrivateUser?.id === chatUser.id ? 'text-pink-200 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
                              title="删除好友"
                            >
                              🗑️
                            </button>
                          </div>
                          </button>
                    );
                  })
                        )}
              </div>
            </div>

            {/* 在线用户列表 */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-600 mb-3 px-2">在线用户 · 添加好友</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {onlineUsers.map((onlineUser) => {
                  const userFromAllUsers = allUsers.find(u => u.id === onlineUser.id);
                  const isFriend = userFromAllUsers?.isFriend || false;
                  
                  return (
                    <div
                      key={onlineUser.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <div className="relative">
                        <img
                          src={onlineUser.avatar}
                          alt={onlineUser.username}
                          className="w-6 h-6 rounded-full border border-pink-200"
                        />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 border border-white rounded-full"></div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-800">
                          {onlineUser.username}
                          {onlineUser.id === user.id && (
                            <span className="text-pink-500 ml-1">(我)</span>
                          )}
                          {isFriend && (
                            <span className="text-green-500 ml-1">• 好友</span>
                          )}
                        </div>
                      </div>
                      {onlineUser.id !== user.id && (
                        <div className="flex space-x-1">
                          {!isFriend && onAddFriend && (
                            <button
                              onClick={() => onAddFriend(onlineUser)}
                              className="p-1 rounded text-xs bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
                              title="添加好友"
                            >
                              ➕
                            </button>
                          )}
                          <button
                            onClick={() => onPrivateChat(onlineUser)}
                            className="p-1 rounded text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                            title={isFriend ? "发送私信" : "需要先添加好友"}
                          >
                            💬
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 底部信息 */}
          <div className="p-4 border-t border-pink-200">
            <div className="text-center text-xs text-gray-400">
              <p>ChatFlow v1.0</p>
              <p className="mt-1">💬 美丽的粉白主题</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;