import { api } from '../api/api';
import { ChatMessage } from '../types';

export const ChatService = {
  getMessages: async (otherUserId: string) => {
    const response = await api.get(`/chat/${otherUserId}`);
    return response.data;
  },

  sendMessage: async (recipientId: string, content: string) => {
    const response = await api.post('/chat', { recipientId, content });
    return response.data;
  },

  markAsRead: async (senderId: string) => {
    // Backend implementation pending for markAsRead in chatRoutes
    // await api.post(`/chat/read/${senderId}`); 
  }
};
