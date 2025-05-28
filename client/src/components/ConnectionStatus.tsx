import React, { useEffect } from 'react';
import socketService from '../services/socket';

const ConnectionStatus: React.FC = () => {
  // 完全隐藏连接状态提示，只在后台维护连接状态
  useEffect(() => {
    // 监听连接状态变化，但不显示任何UI
    socketService.onConnectionChange((connected) => {
      // 可以在这里添加日志记录，但不显示UI
      console.log(`连接状态: ${connected ? '已连接' : '已断开'}`);
    });

    return () => {
      socketService.off('connect');
    };
  }, []);

  // 不渲染任何UI
  return null;
};

export default ConnectionStatus; 