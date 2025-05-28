import React, { useEffect, useRef } from 'react';
import { Message, User, Room, TypingUser } from '../types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

interface ChatRoomProps {
  room: Room | undefined;
  messages: Message[];
  currentUser: User;
  typingUsers: TypingUser[];
  onSendMessage: (message: string, image?: File) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  onDeleteMessage?: (messageId: string) => void;
  placeholder?: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  room,
  messages,
  currentUser,
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

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">选择一个聊天室</h3>
          <p className="text-gray-400">从左侧选择一个房间开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 房间头部 */}
      <div className="hidden lg:block bg-white/80 backdrop-blur-sm border-b border-pink-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{room.name}</h2>
            <p className="text-pink-500 mt-1">{room.description}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">房间ID</p>
              <p className="font-mono text-xs text-pink-600">{room.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white/50 to-pink-50/30 min-h-0">
        <div className="p-4 space-y-4 min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="text-6xl mb-4 animate-float">💬</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无消息</h3>
              <p className="text-gray-400 text-center">
                成为第一个在 <span className="text-pink-500 font-medium">{room.name}</span> 发消息的人吧！
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.user_id !== message.user_id;
                
                return (
                  <div key={message.id} className="message-container">
                    <MessageBubble
                      message={message}
                      isOwnMessage={message.user_id === currentUser.id}
                      showAvatar={showAvatar}
                      onDeleteMessage={onDeleteMessage}
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

export default ChatRoom; 