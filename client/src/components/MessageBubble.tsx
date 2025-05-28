import React, { useState, useEffect } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar: boolean;
  onDeleteMessage?: (messageId: string) => void;
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showAvatar,
  onDeleteMessage
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // 确保消息渲染后立即可见
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  const handleDeleteMessage = () => {
    if (window.confirm('确定要删除这条消息吗？删除后无法恢复。')) {
      onDeleteMessage && onDeleteMessage(message.id);
    }
  };

  // 检查是否是临时消息
  const isTemporary = message.id.startsWith('temp_');

  return (
    <div 
      className={`flex items-end space-x-2 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''} animate-slide-up group transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      key={message.id}
    >
      {/* 头像 */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <img
            src={message.avatar}
            alt={message.username}
            className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
          />
        ) : (
          <div className="w-8 h-8"></div>
        )}
      </div>

      {/* 消息内容 */}
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%] sm:max-w-xs lg:max-w-md relative`}>
        {/* 用户名和时间 */}
        {showAvatar && (
          <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <span className="text-xs font-medium text-gray-600">{message.username}</span>
            <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
          </div>
        )}

        {/* 消息气泡和操作按钮 */}
        <div className="relative flex items-center w-full">
          {/* 消息气泡 */}
          <div className={`
            relative px-4 py-2 rounded-2xl shadow-sm w-full break-words word-wrap overflow-wrap-anywhere
            ${isOwnMessage 
              ? `bg-gradient-to-br from-pink-500 to-pink-600 text-white ${isTemporary ? 'opacity-70' : ''}` 
              : `bg-white text-gray-800 border border-pink-100 ${isTemporary ? 'opacity-70' : ''}`
            }
          `}>
            {/* 气泡箭头 */}
            <div className={`
              absolute top-2 w-3 h-3 transform rotate-45
              ${isOwnMessage 
                ? 'bg-pink-500 -right-1' 
                : 'bg-white border-l border-b border-pink-100 -left-1'
              }
            `} />
            
            {/* 消息文本 */}
            <div className="relative z-10 flex items-center">
              <span className="message-text">
                {message.content || message.message}
              </span>
              {isTemporary && (
                <div className="ml-2 w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50 flex-shrink-0"></div>
              )}
            </div>
          </div>

          {/* 删除按钮 - 仅对自己的消息显示 */}
          {isOwnMessage && onDeleteMessage && showActions && !isTemporary && (
            <button
              onClick={handleDeleteMessage}
              className={`
                ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
                bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700
              `}
              title="删除消息"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* 仅显示时间（当不显示头像时） */}
        {!showAvatar && (
          <div className={`text-xs text-gray-400 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 