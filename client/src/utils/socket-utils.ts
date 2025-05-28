import socketService from '../services/socket';
import { User, Message, PrivateMessage } from '../types';
import notificationService from '../services/notification';

/**
 * 确保用户已连接到Socket服务器
 * @param user 当前用户
 * @returns 返回Promise，在连接成功时解析
 */
export const ensureSocketConnection = (user: User): Promise<boolean> => {
  return new Promise((resolve) => {
    if (socketService.isConnected()) {
      resolve(true);
      return;
    }

    console.log('Socket未连接，正在尝试重新连接...');
    
    // 添加连接状态变化监听
    const connectionHandler = (connected: boolean) => {
      if (connected) {
        // 连接成功，加入用户
        socketService.joinUser(user);
        resolve(true);
        
        // 移除监听器
        socketService.off('connect');
      }
    };
    
    // 监听连接状态变化
    socketService.onConnectionChange(connectionHandler);
    
    // 尝试连接
    socketService.connect();
    
    // 设置超时，如果30秒内未连接则返回失败
    setTimeout(() => {
      resolve(false);
      socketService.off('connect');
    }, 30000);
  });
};

// 跟踪是否已显示过连接成功提示
let hasShownConnectionSuccess = false;

/**
 * 显示连接状态通知
 * @param connected 是否已连接
 */
export const showConnectionNotification = (connected: boolean): void => {
  // 禁用烦人的连接状态提示，只在控制台记录
  console.log(connected ? '已连接到服务器' : '与服务器的连接已断开');
  
  // 只在首次连接成功时显示一次提示
  if (connected && !hasShownConnectionSuccess) {
    notificationService.showSuccess('连接成功');
    hasShownConnectionSuccess = true;
  }
};

/**
 * 发送消息前检查连接状态
 * @param user 当前用户
 * @param message 消息内容
 * @param roomId 房间ID
 * @returns 消息是否发送成功
 */
export const sendMessageWithConnectionCheck = async (
  user: User,
  message: string,
  roomId: string,
  image?: File
): Promise<boolean> => {
  // 确保已连接
  const isConnected = await ensureSocketConnection(user);
  
  if (!isConnected) {
    notificationService.showError('无法连接到服务器，消息发送失败');
    return false;
  }
  
  // 创建消息对象
  const messageData: Omit<Message, 'id'> = {
    user: user,
    user_id: user.id,
    username: user.username,
    avatar: user.avatar,
    content: message,
    message: message,
    roomId: roomId,
    timestamp: new Date().toISOString()
  };
  
  // 发送消息
  socketService.sendMessage(messageData);
  return true;
};

/**
 * 发送私聊消息前检查连接状态
 * @param sender 发送者
 * @param receiver 接收者
 * @param message 消息内容
 * @returns 消息是否发送成功
 */
export const sendPrivateMessageWithConnectionCheck = async (
  sender: User,
  receiver: User,
  message: string,
  image?: File
): Promise<boolean> => {
  // 确保已连接
  const isConnected = await ensureSocketConnection(sender);
  
  if (!isConnected) {
    notificationService.showError('无法连接到服务器，消息发送失败');
    return false;
  }
  
  // 创建消息对象
  const messageData: Omit<PrivateMessage, 'id'> = {
    sender: sender,
    receiver: receiver,
    sender_id: sender.id,
    receiver_id: receiver.id,
    sender_username: sender.username,
    receiver_username: receiver.username,
    sender_avatar: sender.avatar,
    receiver_avatar: receiver.avatar,
    content: message,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  // 发送私聊消息
  socketService.sendPrivateMessage(messageData);
  return true;
};

const socketUtils = {
  ensureSocketConnection,
  sendMessageWithConnectionCheck,
  sendPrivateMessageWithConnectionCheck,
  showConnectionNotification
};

export default socketUtils; 