import { api } from '../api/api';
import { Notification } from '../types';

export const NotificationService = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/all/read');
    return response.data;
  }
};
