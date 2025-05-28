import { AuthResponse, Room, Message, PrivateMessage, User } from '../types';

const API_BASE_URL = 'http://localhost:5001/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // 从localStorage获取用户信息
    const userData = localStorage.getItem('user');
    let userId = '';
    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (e) {
        console.error('解析用户数据失败:', e);
      }
    }
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      return data;
    } catch (error) {
      console.error('API请求错误:', error);
      throw error;
    }
  }

  async register(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '注册失败');
    }
    return data;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '登录失败');
    }
    return data;
  }

  async getRooms(): Promise<Room[]> {
    return this.request<Room[]>('/rooms');
  }

  async getMessages(roomId: string, limit: number = 50): Promise<Message[]> {
    return this.request<Message[]>(`/messages/${roomId}?limit=${limit}`);
  }

  async getPrivateMessages(userId: string, currentUserId: string, limit: number = 50): Promise<PrivateMessage[]> {
    return this.request<PrivateMessage[]>(`/private-messages/${userId}?currentUserId=${currentUserId}&limit=${limit}`);
  }

  async getUsers(currentUserId: string): Promise<User[]> {
    return this.request<User[]>(`/users?currentUserId=${currentUserId}`);
  }

  // 好友系统API方法
  async addFriend(friendId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  }

  async removeFriend(friendId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/friends/${friendId}`, {
      method: 'DELETE',
    });
  }

  async getFriends(): Promise<User[]> {
    return this.request<User[]>('/friends');
  }

  async checkFriendship(friendId: string): Promise<{ isFriend: boolean }> {
    return this.request<{ isFriend: boolean }>(`/friends/check/${friendId}`);
  }

  // 群聊相关API
  async createGroupChat(name: string, description: string, inviteUsers: string[] = []): Promise<Room> {
    return this.request<Room>('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ name, description, inviteUsers }),
    });
  }

  async inviteToRoom(roomId: string, userIds: string[]): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/rooms/${roomId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  }

  async leaveRoom(roomId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/rooms/${roomId}/leave`, {
      method: 'DELETE',
    });
  }

  async getUserRooms(): Promise<Room[]> {
    return this.request<Room[]>('/user-rooms');
  }

  async deleteMessage(messageId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // 管理员功能
  async deleteUser(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async deleteRoom(roomId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/rooms/${roomId}`, {
      method: 'DELETE',
    });
  }

  async banUser(userId: string, duration: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ duration }),
    });
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    onlineUsers: number;
    totalRooms: number;
    totalMessages: number;
  }> {
    return this.request<{
      totalUsers: number;
      onlineUsers: number;
      totalRooms: number;
      totalMessages: number;
    }>('/admin/stats');
  }

  async getRecentMessages(limit: number = 20): Promise<Message[]> {
    return this.request<Message[]>(`/admin/recent-messages?limit=${limit}`);
  }

  async deletePrivateMessage(messageId: string): Promise<void> {
    await this.request<void>(`/messages/private/${messageId}`, {
      method: 'DELETE',
    });
  }

  async createRoom(name: string, description: string): Promise<Room> {
    return this.request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }
}

const apiService = new ApiService();
export default apiService; 