import React, { useState } from 'react';
import { User } from '../types';

interface CreateGroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  onCreateGroup: (name: string, description: string, inviteUsers: string[]) => void;
}

const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  onCreateGroup
}) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && groupDescription.trim()) {
      onCreateGroup(groupName.trim(), groupDescription.trim(), selectedUsers);
      handleClose();
    }
  };

  const handleClose = () => {
    setGroupName('');
    setGroupDescription('');
    setSelectedUsers([]);
    onClose();
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">创建群聊</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
                群聊名称
              </label>
              <input
                type="text"
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="输入群聊名称"
                required
              />
            </div>

            <div>
              <label htmlFor="groupDescription" className="block text-sm font-medium text-gray-700 mb-2">
                群聊描述
              </label>
              <textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                placeholder="输入群聊描述"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邀请用户 ({selectedUsers.length} 人已选择)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {allUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                    />
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-8 h-8 rounded-full ml-3 mr-3"
                    />
                    <span className="text-gray-800">{user.username}</span>
                  </label>
                ))}
                {allUsers.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    暂无其他用户
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!groupName.trim() || !groupDescription.trim()}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              创建群聊
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupChatModal; 