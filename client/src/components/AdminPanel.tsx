import React, { useState, useEffect } from 'react';
import { User, Room, Message } from '../types';
import apiService from '../services/api';

interface AdminPanelProps {
  user: User;
  allUsers: User[];
  rooms: Room[];
  onlineUsers: User[];
  onClose: () => void;
  onUserDeleted?: (userId: string) => void;
  onRoomDeleted?: (roomId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  allUsers,
  rooms,
  onlineUsers,
  onClose,
  onUserDeleted,
  onRoomDeleted
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms' | 'messages' | 'system'>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalRooms: 0,
    totalMessages: 0
  });
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStats({
      totalUsers: allUsers.length,
      onlineUsers: onlineUsers.length,
      totalRooms: rooms.length,
      totalMessages: 0 // 这里可以从API获取总消息数
    });
    
    // 加载最近消息
    loadRecentMessages();
  }, [allUsers, onlineUsers, rooms]);

  const loadRecentMessages = async () => {
    try {
      // 这里可以实现加载最近消息的API
      // const messages = await apiService.getRecentMessages();
      // setRecentMessages(messages);
    } catch (error) {
      console.error('加载最近消息失败:', error);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`确定要删除用户 ${username} 吗？此操作无法撤销！`)) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteUser(userId);
      alert(`用户 ${username} 已被删除`);
      onUserDeleted?.(userId);
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!window.confirm(`确定要删除聊天室 ${roomName} 吗？此操作将删除该聊天室的所有消息！`)) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteRoom(roomId);
      alert(`聊天室 ${roomName} 已被删除`);
      onRoomDeleted?.(roomId);
    } catch (error) {
      console.error('删除聊天室失败:', error);
      alert('删除聊天室失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    const duration = prompt('请输入封禁时长（小时），输入0表示永久封禁：', '24');
    if (duration === null) return;

    try {
      setLoading(true);
      await apiService.banUser(userId, parseInt(duration));
      alert(`用户 ${username} 已被封禁 ${duration === '0' ? '永久' : duration + '小时'}`);
    } catch (error) {
      console.error('封禁用户失败:', error);
      alert('封禁用户失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-blue-500">总用户数</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.onlineUsers}</div>
                <div className="text-sm text-green-500">在线用户</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.totalRooms}</div>
                <div className="text-sm text-purple-500">聊天室数</div>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">{stats.totalMessages}</div>
                <div className="text-sm text-pink-500">总消息数</div>
              </div>
            </div>

            {/* 在线用户 */}
            <div>
              <h3 className="text-lg font-semibold mb-4">当前在线用户</h3>
              <div className="max-h-40 overflow-y-auto border rounded-lg bg-white">
                {onlineUsers.map((onlineUser) => (
                  <div key={onlineUser.id} className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50">
                    <img
                      src={onlineUser.avatar}
                      alt={onlineUser.username}
                      className="w-8 h-8 rounded-full mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{onlineUser.username}</div>
                      <div className="text-sm text-gray-500">{onlineUser.id}</div>
                    </div>
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">用户管理</h3>
            <div className="max-h-96 overflow-y-auto border rounded-lg bg-white">
              {allUsers.map((userItem) => (
                <div key={userItem.id} className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50">
                  <img
                    src={userItem.avatar}
                    alt={userItem.username}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{userItem.username}</div>
                    <div className="text-sm text-gray-500">{userItem.id}</div>
                    <div className="text-xs text-gray-400">
                      {onlineUsers.some(u => u.id === userItem.id) ? (
                        <span className="text-green-500">● 在线</span>
                      ) : (
                        <span className="text-gray-400">○ 离线</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleBanUser(userItem.id, userItem.username)}
                      disabled={loading || userItem.id === user.id}
                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
                    >
                      封禁
                    </button>
                    <button
                      onClick={() => handleDeleteUser(userItem.id, userItem.username)}
                      disabled={loading || userItem.id === user.id}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'rooms':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">聊天室管理</h3>
            <div className="max-h-96 overflow-y-auto border rounded-lg bg-white">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50">
                  <div className="w-3 h-3 bg-pink-400 rounded-full mr-3"></div>
                  <div className="flex-1">
                    <div className="font-medium">{room.name}</div>
                    <div className="text-sm text-gray-500">{room.description}</div>
                    <div className="text-xs text-gray-400">ID: {room.id}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteRoom(room.id, room.name)}
                      disabled={loading || room.id === 'general'}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'messages':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">消息管理</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                💡 消息管理功能正在开发中，敬请期待...
              </p>
            </div>
          </div>
        );

      case 'system':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">系统信息</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-700">应用名称</div>
                    <div className="text-gray-600">ChatFlow IM</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">版本</div>
                    <div className="text-gray-600">v1.0.0</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">当前管理员</div>
                    <div className="text-gray-600">{user.username}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">系统时间</div>
                    <div className="text-gray-600">{new Date().toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">系统操作</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  🔄 刷新系统
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('确定要清理系统缓存吗？')) {
                      localStorage.clear();
                      alert('缓存已清理');
                    }
                  }}
                  className="w-full md:w-auto px-4 py-2 ml-0 md:ml-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  🧹 清理缓存
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">管理面板</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 选项卡 */}
        <div className="flex border-b bg-gray-50">
          {[
            { id: 'overview', name: '概览', icon: '📊' },
            { id: 'users', name: '用户管理', icon: '👥' },
            { id: 'rooms', name: '聊天室', icon: '💬' },
            { id: 'messages', name: '消息', icon: '📝' },
            { id: 'system', name: '系统', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-pink-500 text-pink-600 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderTabContent()}
        </div>

        {/* 底部 */}
        {loading && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-500"></div>
              <span className="text-sm text-gray-600">处理中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 