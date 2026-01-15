import { api } from '../api/api';
import { Notification } from '../types';

const mapNotificationFromApi = (data: any): Notification => ({
  id: data.id,
  userId: data.user_id,
  type: data.type,
  referenceId: data.reference_id,
  content: data.content,
  isRead: data.is_read,
  createdAt: new Date(data.created_at).toLocaleString(),
  createdAtIso: data.created_at,
});

export const NotificationService = {
  getAll: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications');
    return response.data.map(mapNotificationFromApi);
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
