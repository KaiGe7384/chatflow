import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import PasteImageHandler from './PasteImageHandler';

interface MessageInputProps {
  onSendMessage: (message: string, image?: File) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  placeholder?: string;
  currentUser: User;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  onStopTyping,
  placeholder = '输入消息...',
  currentUser,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 监听输入事件
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    setMessage(newMessage);

    // 处理输入状态
    if (newMessage && !isTyping) {
      setIsTyping(true);
      onTyping();
    } else if (!newMessage && isTyping) {
      setIsTyping(false);
      onStopTyping();
    }
    
    // 更新输入框高度
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }

    // 设置输入状态超时
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onStopTyping();
      }
    }, 3000);
  };

  // 发送消息处理
  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    
    if (trimmedMessage || pastedImage) {
      onSendMessage(trimmedMessage, pastedImage || undefined);
      setMessage('');
      setPastedImage(null);
      
      // 重置输入框高度
      const textarea = inputRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
      }
      
      // 停止输入状态
      if (isTyping) {
        setIsTyping(false);
        onStopTyping();
      }
      
      // 聚焦输入框
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // 按键处理
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // 使用Shift+Enter换行，Enter发送
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理粘贴图片
  const handleImagePaste = (file: File) => {
    setPastedImage(file);
  };

  // 清理输入状态超时
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (isTyping) {
        onStopTyping();
      }
    };
  }, [onStopTyping, isTyping]);

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      {/* 粘贴的图片预览 */}
      <PasteImageHandler 
        onImagePaste={handleImagePaste} 
        disabled={disabled} 
      />
      
      <div className="flex items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            placeholder={disabled ? "无法发送消息..." : placeholder}
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            rows={1}
            style={{ maxHeight: '150px' }}
          ></textarea>
        </div>

        <button
          className={`ml-2 px-4 py-2 rounded-lg text-white flex items-center justify-center focus:outline-none ${
            (!message.trim() && !pastedImage) || disabled
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-pink-500 hover:bg-pink-600'
          }`}
          onClick={handleSendMessage}
          disabled={(!message.trim() && !pastedImage) || disabled}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-1 px-2">
        按 Enter 发送消息，Shift + Enter 换行
        {pastedImage && <span className="ml-2 text-pink-500">图片已准备好发送</span>}
      </div>
    </div>
  );
};

export default MessageInput; 