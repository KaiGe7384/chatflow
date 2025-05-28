import { User, PrivateMessage } from '../types';

class NotificationService {
  private static instance: NotificationService;
  private hasNotificationPermission: boolean = false;

  private constructor() {
    this.requestNotificationPermission();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.hasNotificationPermission = permission === 'granted';
    }
  }

  public showMessageNotification(message: PrivateMessage, currentChatId: string | null) {
    // 如果当前正在查看该用户的聊天，则不显示通知
    if (currentChatId === message.sender.id) {
      return;
    }

    // 显示系统通知
    if (this.hasNotificationPermission) {
      const notification = new Notification(`来自 ${message.sender.username} 的新消息`, {
        body: message.content,
        icon: '/logo192.png', // 确保有这个图标
      });

      // 点击通知时切换到对应的聊天
      notification.onclick = () => {
        window.focus();
        // 这里需要实现切换到对应聊天的逻辑
      };
    }

    // 播放提示音
    this.playNotificationSound();
  }

  private playNotificationSound() {
    const audio = new Audio('/notification.mp3'); // 确保有这个音频文件
    audio.play().catch(err => console.log('播放提示音失败:', err));
  }
}

export default NotificationService.getInstance(); 