import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ChatApp from './components/ChatApp';
import ConnectionStatus from './components/ConnectionStatus';
import socketService from './services/socket';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionChecked, setConnectionChecked] = useState<boolean>(false);

  // 初始化 - 检查登录状态和建立Socket连接
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 检查localStorage中是否有保存的用户信息
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            
            // 预先连接Socket
            await connectSocket(parsedUser);
          } catch (error) {
            console.error('解析用户数据出错:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('初始化出错:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    // 监听网络状态变化
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // 应用关闭时断开连接
      socketService.disconnect();
    };
  }, []);

  // 网络恢复在线时尝试重连
  const handleOnline = () => {
    console.log('网络连接恢复');
    if (user) {
      socketService.connect();
    }
  };

  // 网络离线时更新状态
  const handleOffline = () => {
    console.log('网络连接断开');
    // 这里不需要手动断开Socket，因为浏览器会自动处理
  };

  // 连接Socket
  const connectSocket = async (currentUser: User) => {
    return new Promise<void>((resolve) => {
      try {
        socketService.connect();
        
        // 监听连接状态
        const handleConnection = (connected: boolean) => {
          if (connected) {
            socketService.joinUser(currentUser);
            setConnectionChecked(true);
            resolve();
          } else {
            // 连接失败也标记为已检查
            setConnectionChecked(true);
            resolve();
          }
        };
        
        socketService.onConnectionChange(handleConnection);
        
        // 如果已连接，直接加入用户
        if (socketService.isConnected()) {
          socketService.joinUser(currentUser);
          setConnectionChecked(true);
          resolve();
        }
        
        // 超时处理，防止连接检查无限等待
        setTimeout(() => {
          if (!connectionChecked) {
            setConnectionChecked(true);
            resolve();
          }
        }, 5000);
      } catch (error) {
        console.error('连接Socket出错:', error);
        setConnectionChecked(true);
        resolve();
      }
    });
  };

  // 处理登录
  const handleLogin = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
    
    // 保存用户信息和Token
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('token', token);
    
    // 连接Socket
    connectSocket(loggedInUser);
  };

  // 处理注册
  const handleRegister = (registeredUser: User, token: string) => {
    handleLogin(registeredUser, token);
  };

  // 处理注销
  const handleLogout = () => {
    // 先断开Socket连接
    socketService.disconnect();
    
    // 清除状态和本地存储
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ConnectionStatus />
      <Router>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/" /> : <Register onRegister={handleRegister} />
          } />
          <Route path="/" element={
            user ? 
              <ChatApp user={user} onLogout={handleLogout} /> : 
              <Navigate to="/login" />
          } />
        </Routes>
      </Router>
    </div>
  );
};

export default App;