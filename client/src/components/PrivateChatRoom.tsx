import React, { useEffect, useRef } from 'react';
import { PrivateMessage, User, PrivateTypingUser } from '../types';
import PrivateMessageBubble from './PrivateMessageBubble';
import MessageInput from './MessageInput';

interface PrivateChatRoomProps {
  currentUser: User;
  targetUser: User;
  messages: PrivateMessage[];
  typingUsers: PrivateTypingUser[];
  onSendMessage: (message: string, image?: File) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onDeleteMessage?: (messageId: string) => void;
  placeholder?: string;
}

const PrivateChatRoom: React.FC<PrivateChatRoomProps> = ({
  currentUser,
  targetUser,
  messages,
  typingUsers,
  onSendMessage,
  onTyping,
  onStopTyping,
  onDeleteMessage,
  placeholder
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 私聊头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-pink-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img
              src={targetUser.avatar}
              alt={targetUser.username}
              className="w-12 h-12 rounded-full border-2 border-pink-300"
            />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{targetUser.username}</h2>
              <p className="text-pink-500 mt-1">私聊对话</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">私聊</p>
              <p className="font-mono text-xs text-pink-600">💬</p>
            </div>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white/50 to-pink-50/30 min-h-0">
        <div className="p-4 space-y-4 min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="text-6xl mb-4 animate-float">💕</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">开始私聊</h3>
              <p className="text-gray-400 text-center">
                你和 <span className="text-pink-500 font-medium">{targetUser.username}</span> 的私聊开始了！
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const isOwnMessage = message.sender_id === currentUser.id;
                const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id;
                
                return (
                  <div key={message.id} className="message-container">
                    <PrivateMessageBubble
                      message={message}
                      isOwnMessage={isOwnMessage}
                      showAvatar={showAvatar}
                      onDeleteMessage={isOwnMessage ? onDeleteMessage : undefined}
                    />
                  </div>
                );
              })}
              
              {/* 输入指示器 */}
              {typingUsers.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-500 animate-fade-in">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <span>
                    {typingUsers.map(t => t.username).join(', ')} 正在输入...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* 消息输入区域 */}
      <div className="flex-shrink-0">
        <MessageInput
          onSendMessage={onSendMessage}
          onTyping={onTyping}
          onStopTyping={onStopTyping}
          placeholder={placeholder}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
};

export default PrivateChatRoom;