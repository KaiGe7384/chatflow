// import { PrivateMessage } from '../types';

// 通知服务
export class NotificationService {
  private static instance: NotificationService;
  private hasNotificationPermission: boolean = false;
  private audioElement: HTMLAudioElement | null = null;

  private constructor() {
    this.requestPermission();
    this.initAudio();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initAudio() {
    try {
      // 使用Web Audio API创建简单的通知音效
      this.createNotificationSound();
    } catch (error) {
      console.error('初始化通知音频失败:', error);
    }
  }

  private createNotificationSound() {
    // 如果不支持AudioContext，忽略音效
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      return;
    }
  }

  public async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.hasNotificationPermission = permission === 'granted';
    }
  }

  public getPermission(): boolean {
    return this.hasNotificationPermission;
  }

  public isSupported(): boolean {
    return 'Notification' in window;
  }

  public playNotificationSound() {
    try {
      // 创建简单的提示音（双音调）
      this.playBeep(800, 100);
      setTimeout(() => this.playBeep(600, 100), 150);
    } catch (error) {
      console.error('播放通知声音出错:', error);
    }
  }

  private playBeep(frequency: number, duration: number) {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.error('播放提示音失败:', error);
    }
  }

  public showMessageNotification(message: any, currentChatId: string | null) {
    try {
      // 如果是当前聊天的消息，只播放声音不显示通知
      const isCurrent = currentChatId && (message.sender.id === currentChatId || (message.receiver && message.receiver.id === currentChatId));
      
      // 播放通知声音
      this.playNotificationSound();
      
      // 如果不是当前聊天，且有通知权限，显示通知
      if (!isCurrent && this.hasNotificationPermission) {
        const title = `来自 ${message.sender.username} 的消息`;
        const options = {
          body: message.content,
          icon: message.sender.avatar || '/logo192.png',
          badge: '/logo192.png',
          tag: `message-${message.sender.id}`,
          renotify: true
        };
        
        const notification = new Notification(title, options);
        
        // 点击通知时聚焦窗口
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
        
        // 自动关闭
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('显示消息通知失败:', error);
    }
  }
  
  // 显示成功通知
  public showSuccess(message: string) {
    // 播放通知声音
    this.playNotificationSound();
    
    // 如果支持系统通知且有权限，显示系统通知
    if (this.isSupported() && this.hasNotificationPermission) {
      const notification = new Notification('成功', {
        body: message,
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
      
      setTimeout(() => {
        notification.close();
      }, 3000);
    } else {
      // 否则显示页面内通知
      this.showToast(message, 'success');
    }
  }
  
  // 显示错误通知
  public showError(message: string) {
    // 如果支持系统通知且有权限，显示系统通知
    if (this.isSupported() && this.hasNotificationPermission) {
      const notification = new Notification('错误', {
        body: message,
        icon: '/logo192.png',
        badge: '/logo192.png'
      });
      
      setTimeout(() => {
        notification.close();
      }, 5000);
    } else {
      // 否则显示页面内通知
      this.showToast(message, 'error');
    }
  }
  
  // 显示页面内通知
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // 创建通知元素
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300';
    
    // 根据类型设置样式
    if (type === 'success') {
      toast.className += ' bg-green-500 text-white';
    } else if (type === 'error') {
      toast.className += ' bg-red-500 text-white';
    } else {
      toast.className += ' bg-blue-500 text-white';
    }
    
    // 设置内容
    toast.textContent = message;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 设置动画
    setTimeout(() => {
      toast.style.opacity = '1';
    }, 10);
    
    // 自动关闭
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, type === 'error' ? 5000 : 3000);
  }

  public showRoomMessageNotification(senderName: string, roomName: string, content: string) {
    if (this.hasNotificationPermission) {
      const notification = new Notification(`${roomName} - ${senderName}`, {
        body: content,
        icon: '/logo192.png',
      });

      notification.onclick = () => {
        window.focus();
      };
    }

    this.playNotificationSound();
  }
}

export default NotificationService.getInstance();