import React, { useState } from 'react';
import { User } from '../types';
import apiService from '../services/api';

interface LoginFormProps {
  onLogin: (user: User, token: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('请填写用户名和密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = isLogin 
        ? await apiService.login(username, password)
        : await apiService.register(username, password);
      
      onLogin(response.user, response.token);
    } catch (error: any) {
      setError(error.message || '操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 欢迎标题 */}
        <div className="text-center mb-8">
          <div className="inline-block animate-float">
            <div className="text-6xl mb-4">💬</div>
          </div>
          <h1 className="text-4xl font-bold text-pink-600 mb-2">
            IM即时通讯
          </h1>
          <p className="text-pink-400 text-lg">
            美丽的粉白主题聊天应用
          </p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-pink-100">
          <div className="flex bg-pink-50 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                isLogin 
                  ? 'bg-white text-pink-600 shadow-sm' 
                  : 'text-pink-400 hover:text-pink-600'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                !isLogin 
                  ? 'bg-white text-pink-600 shadow-sm' 
                  : 'text-pink-400 hover:text-pink-600'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/50"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-200 bg-white/50"
                placeholder="请输入密码"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm animate-slide-up">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? '登录中...' : '注册中...'}
                </div>
              ) : (
                isLogin ? '登录' : '注册'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? '没有账号？' : '已有账号？'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-pink-500 hover:text-pink-600 font-medium ml-1"
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>

        {/* 功能介绍 */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-3 gap-4 text-sm text-pink-400">
            <div>
              <div className="text-2xl mb-1">🎨</div>
              <div>美丽界面</div>
            </div>
            <div>
              <div className="text-2xl mb-1">⚡</div>
              <div>实时通讯</div>
            </div>
            <div>
              <div className="text-2xl mb-1">👥</div>
              <div>多人聊天</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 