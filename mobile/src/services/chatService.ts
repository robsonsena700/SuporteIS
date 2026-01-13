import { api } from '../api/api';
import { ChatMessage } from '../types';

export const ChatService = {
  getMessages: async (otherUserId: string) => {
    const response = await api.get(`/chat/messages/${otherUserId}`);
    return response.data;
  },

  sendMessage: async (recipientId: string, content: string) => {
    const response = await api.post('/chat/send', { recipientId, content });
    return response.data;
  },

  markAsRead: async (senderId: string) => {
    await api.post(`/chat/read/${senderId}`);
  }
};
