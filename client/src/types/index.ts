export interface User {
  id: string;
  username: string;
  avatar: string;
  isAdmin?: boolean;
  isFriend?: boolean;
}

export interface Message {
  id: string;
  content: string;
  user: User;
  timestamp: string;
  user_id: string;
  username: string;
  avatar: string;
  message: string;
  roomId: string;
}

export interface PrivateMessage {
  id: string;
  content: string;
  sender: User;
  receiver: User;
  timestamp: string;
  sender_id: string;
  receiver_id: string;
  sender_username: string;
  receiver_username: string;
  sender_avatar: string;
  receiver_avatar: string;
  message: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by?: string;
  is_public?: boolean;
  is_member?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TypingUser {
  user: User;
  roomId: string;
  username: string;
}

export interface PrivateTypingUser {
  user: User;
  receiverId: string;
  username: string;
  senderId: string;
}

export interface ChatTab {
  id: string;
  type: 'room' | 'private';
  name: string;
  user?: User;
  unreadCount?: number;
}

export interface UnreadCount {
  userId: string;
  count: number;
}

export interface RoomUnreadCount {
  roomId: string;
  count: number;
}

export interface MessageNotification {
  id: string;
  type: 'private' | 'room';
  fromUserId?: string;
  fromUsername: string;
  roomId?: string;
  roomName?: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface FriendshipStatus {
  isFriend: boolean;
  canMessage: boolean;
}
