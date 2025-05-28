import { io, Socket } from 'socket.io-client';
import { User } from '../types';

/**
 * Socket连接服务类
 * 处理与服务器的Socket.io连接管理、重连和事件处理
 */
class SocketService {
  private socket: Socket | null = null;
  private serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5001';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private initialReconnectInterval: number = 2000;
  private reconnectInterval: number = 2000;
  private maxReconnectInterval: number = 30000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeatTime: number = 0;
  private currentUser: User | null = null;
  private lastReconnectTime: number = 0;
  private isReconnecting: boolean = false;
  private connectionId: string = '';

  // 单例模式
  private static instance: SocketService;
  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * 连接到Socket服务器
   */
  connect(): void {
    // 如果已连接或正在重连，不进行操作
    if ((this.socket && this.socket.connected) || this.isReconnecting) {
      console.log('Socket已经连接或正在重连，无需重新连接');
      return;
    }

    // 标记为正在重连
    this.isReconnecting = true;

    // 清理之前的重连尝试
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 创建唯一的连接ID，用于区分不同的连接尝试
    this.connectionId = Date.now().toString();
    const currentConnectionId = this.connectionId;

    console.log(`[${currentConnectionId}] 尝试连接到Socket服务器...`);
    
    try {
      // 清理之前的连接
      this.cleanup();

      // 创建新连接
    this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true, // 启用内置重连
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
        forceNew: false, // 不强制新连接
        autoConnect: true,
        query: {
          connectionId: currentConnectionId
        }
      });

      // 设置事件监听器
      this.setupEventListeners(currentConnectionId);
    } catch (error) {
      console.error(`[${currentConnectionId}] 创建Socket连接出错:`, error);
      this.notifyConnectionChange(false);
      this.isReconnecting = false;
      this.attemptReconnect();
    }
  }

  /**
   * 清理当前连接
   */
  private cleanup(): void {
    if (this.socket) {
      try {
        // 移除所有监听器
        this.socket.removeAllListeners();
        // 断开连接
      this.socket.disconnect();
      this.socket = null;
      } catch (error) {
        console.error('清理Socket连接时出错:', error);
      }
    }
  }

  /**
   * 设置Socket事件监听
   */
  private setupEventListeners(connectionId: string): void {
    if (!this.socket) return;

    // 如果连接ID不匹配，不设置监听器
    if (connectionId !== this.connectionId) {
      console.log(`[${connectionId}] 连接ID不匹配，不设置监听器`);
      return;
    }

    // 连接成功
    this.socket.on('connect', () => {
      // 如果连接ID不匹配，忽略此事件
      if (connectionId !== this.connectionId) {
        console.log(`[${connectionId}] 忽略过时的连接成功事件`);
        return;
      }

      console.log(`[${connectionId}] Socket连接成功, ID: ${this.socket?.id}`);
      this.reconnectAttempts = 0;
      this.reconnectInterval = this.initialReconnectInterval;
      this.isReconnecting = false;
      this.notifyConnectionChange(true);
      
      // 如果有缓存的用户，自动加入
      if (this.currentUser) {
        this.joinUser(this.currentUser);
      }
      
      // 开始心跳检测
      this.startHeartbeat();
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      // 如果连接ID不匹配，忽略此事件
      if (connectionId !== this.connectionId) {
        console.log(`[${connectionId}] 忽略过时的连接错误事件`);
        return;
      }

      console.error(`[${connectionId}] Socket连接错误:`, error.message);
      this.notifyConnectionChange(false);
      this.isReconnecting = false;
      this.attemptReconnect();
    });

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      // 如果连接ID不匹配，忽略此事件
      if (connectionId !== this.connectionId) {
        console.log(`[${connectionId}] 忽略过时的断开连接事件`);
        return;
      }

      console.log(`[${connectionId}] Socket断开连接，原因:`, reason);
      this.notifyConnectionChange(false);
      
      // 停止心跳检测
      this.stopHeartbeat();
      
      // 如果不是主动断开，尝试重连
      if (reason !== 'io client disconnect') {
        this.isReconnecting = false;
        this.attemptReconnect();
      } else {
        this.isReconnecting = false;
      }
    });
    
    // 服务器心跳
    this.socket.on('ping', () => {
      // 响应心跳
      this.socket?.emit('pong');
      this.lastHeartbeatTime = Date.now();
    });
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect(): void {
    // 如果已经在重连，不重复执行
    if (this.isReconnecting || (this.socket && this.socket.connected)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连');
      return;
    }
    
    // 检查上次重连时间，防止频繁重连
    const now = Date.now();
    if (now - this.lastReconnectTime < 2000) {
      console.log('重连太频繁，延迟重连');
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect();
      }, 2000);
      return;
    }

    this.reconnectAttempts++;
    this.lastReconnectTime = now;
    
    // 指数退避算法
    this.reconnectInterval = Math.min(
      this.initialReconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      this.maxReconnectInterval
    );
    
    console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，间隔: ${this.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(() => {
      console.log('执行重连...');
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * 通知连接状态变化
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }

  /**
   * 监听连接状态变化
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    // 防止重复添加
    if (!this.connectionListeners.includes(callback)) {
      this.connectionListeners.push(callback);
    }
    
    // 立即通知当前状态
    if (this.socket) {
      callback(this.socket.connected);
    } else {
      callback(false);
    }
  }

  /**
   * 取消监听事件
   */
  off(event: string): void {
    if (event === 'connect') {
      this.connectionListeners = [];
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
    this.connectionListeners = [];
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastHeartbeatTime = Date.now();
    
    this.heartbeatTimer = setInterval(() => {
      // 检查上次心跳时间，如果超过30秒没有心跳，认为连接断开
      const now = Date.now();
      const elapsed = now - this.lastHeartbeatTime;
      
      if (elapsed > 30000) {
        console.log('心跳超时，认为连接已断开');
        this.cleanup();
        this.isReconnecting = false;
        this.attemptReconnect();
    }
    }, 10000);
  }
  
  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.isReconnecting = false;
    }

  /**
   * 检查是否连接
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  /**
   * 加入用户
   */
  joinUser(user: User): void {
    this.currentUser = user;
    
    if (!this.socket || !this.isConnected()) {
      console.log('Socket未连接，缓存用户信息，等连接成功后自动加入');
      return;
    }
    
    console.log('加入用户:', user.username);
    this.socket.emit('user_join', user);
    }

  /**
   * 加入房间
   */
  joinRoom(roomId: string): void {
    if (!this.socket || !this.isConnected()) {
      console.log('Socket未连接，无法加入房间');
      return;
    }
    
    console.log('加入房间:', roomId);
    this.socket.emit('join_room', roomId);
  }

  /**
   * 发送自定义事件
   */
  emit(event: string, data: any): void {
    if (!this.socket || !this.isConnected()) {
      console.log(`Socket未连接，无法发送事件: ${event}`);
      return;
    }
    
    console.log(`发送事件: ${event}`, data);
    this.socket.emit(event, data);
    }

  /**
   * 监听自定义事件
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.log(`Socket未创建，无法监听事件: ${event}`);
      return;
    }
    
    this.socket.on(event, callback);
    }

  // 以下是业务方法，保持原有API

  // 发送消息
  sendMessage(message: any): void {
    this.emit('send_message', message);
  }

  // 发送私聊消息
  sendPrivateMessage(message: any): void {
    this.emit('send_private_message', message);
  }

  // 通知正在输入
  sendTyping(roomId: string): void {
    if (!this.socket || !this.isConnected() || !this.currentUser) return;
    this.socket.emit('typing', { user: this.currentUser, roomId });
    }

  // 通知停止输入
  sendStopTyping(roomId: string): void {
    if (!this.socket || !this.isConnected() || !this.currentUser) return;
    this.socket.emit('stop_typing', { user: this.currentUser, roomId });
    }

  // 通知私聊正在输入
  sendPrivateTyping(receiverId: string): void {
    if (!this.socket || !this.isConnected() || !this.currentUser) return;
    this.socket.emit('private_typing', { user: this.currentUser, receiverId });
    }

  // 通知私聊停止输入
  sendPrivateStopTyping(receiverId: string): void {
    if (!this.socket || !this.isConnected() || !this.currentUser) return;
    this.socket.emit('private_stop_typing', { user: this.currentUser, receiverId });
    }

  // 监听新消息
  onNewMessage(callback: (message: any) => void): void {
    this.on('new_message', callback);
  }

  // 监听私聊消息
  onNewPrivateMessage(callback: (message: any) => void): void {
    this.on('new_private_message', callback);
    }

  // 监听在线用户
  onOnlineUsers(callback: (users: User[]) => void): void {
    this.on('online_users', callback);
  }

  // 监听正在输入
  onTyping(callback: (typing: any) => void): void {
    this.on('typing', callback);
    }

  // 监听停止输入
  onStopTyping(callback: (typing: any) => void): void {
    this.on('stop_typing', callback);
  }

  // 监听私聊正在输入
  onPrivateTyping(callback: (typing: any) => void): void {
    this.on('private_typing', callback);
    }

  // 监听私聊停止输入
  onPrivateStopTyping(callback: (typing: any) => void): void {
    this.on('private_stop_typing', callback);
  }
}

// 导出单例实例
export default SocketService.getInstance(); 