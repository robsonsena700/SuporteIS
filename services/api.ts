import axios from 'axios';
import { Ticket, TicketStatus, TicketPriority, User, Message, Notification, DirectMessage } from '../types';

const api = axios.create({
  baseURL: '/api', // Use Vite Proxy
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to map Backend Snake_Case to Frontend CamelCase
const mapMessageFromApi = (data: any): Message => ({
  id: data.id,
  senderId: data.sender_id,
  senderName: data.sender_name || 'Usuário',
  content: data.content,
  timestamp: new Date(data.created_at).toLocaleString(),
  isInternal: data.is_internal
});

const mapTicketFromApi = (data: any): Ticket => ({
  id: data.code || data.id, // Prefer code (CH-XXXX) if available
  subject: data.subject,
  equipment: data.equipment,
  clientName: data.client_name,
  priority: data.priority as TicketPriority,
  status: data.status as TicketStatus,
  technician: data.technician_name,
  technicianId: data.technician_id,
  technicianAvatar: data.technician_avatar,
  assignedAt: data.assigned_at ? new Date(data.assigned_at).toLocaleString() : undefined,
  description: data.description,
  createdAt: new Date(data.created_at).toLocaleString(),
  lastInteraction: new Date(data.updated_at || data.created_at).toLocaleString(),
  messages: data.messages ? data.messages.map(mapMessageFromApi) : [],
  creatorName: data.creator_name,
  attachment: data.attachment,
  equipmentDetails: { // Placeholder or map if available
    model: data.equipment,
    serialNumber: 'N/A',
    warranty: 'N/A'
  }
});

const mapNotificationFromApi = (data: any): Notification => ({
  id: data.id,
  userId: data.user_id,
  type: data.type,
  referenceId: data.reference_id,
  content: data.content,
  isRead: data.is_read,
  createdAt: new Date(data.created_at).toLocaleString()
});

export const AuthService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  register: async (userData: Partial<User> & { password?: string }) => {
    const response = await api.post('/auth/register', userData);
    // Automatically login or return user
    return response.data;
  },
  updateProfile: async (userData: Partial<User>) => {
    const response = await api.put('/auth/profile', userData);
    // Update local storage user if successful
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && currentUser.id === response.data.id) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

export const TicketService = {
  getAll: async () => {
    const response = await api.get('/tickets');
    return response.data.map(mapTicketFromApi);
  },
  getById: async (id: string) => {
    const response = await api.get(`/tickets/${id}`);
    return mapTicketFromApi(response.data);
  },
  create: async (ticket: Partial<Ticket> & { attachment?: string }) => {
    const payload = {
      subject: ticket.subject,
      description: ticket.description,
      equipment: ticket.equipment,
      client_name: ticket.clientName, // Map to snake_case
      priority: ticket.priority,
      status: ticket.status,
      attachment: ticket.attachment
    };
    const response = await api.post('/tickets', payload);
    return mapTicketFromApi(response.data);
  },
  update: async (id: string, updates: Partial<Ticket> & { technician?: string }) => {
    const payload: any = { ...updates };
    if (updates.clientName) payload.client_name = updates.clientName;
    // Map technicianId (frontend) to technician_id (backend)
    if (updates.technicianId) payload.technician_id = updates.technicianId;
    // Legacy support if 'technician' is passed as ID (should avoid this ambiguity, but keeping for safety if used elsewhere)
    if (updates.technician && !updates.technicianId) payload.technician_id = updates.technician;
    
    const response = await api.put(`/tickets/${id}`, payload);
    return mapTicketFromApi(response.data);
  },
  addMessage: async (id: string, content: string, isInternal: boolean = false) => {
    const response = await api.post(`/tickets/${id}/messages`, { content, is_internal: isInternal });
    return mapMessageFromApi(response.data);
  }
};

export const UserService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  create: async (user: any) => {
    const response = await api.post('/users', user);
    return response.data;
  },
  update: async (id: string, updates: any) => {
    const response = await api.put(`/users/${id}`, updates);
    return response.data;
  },
  updateStatus: async (id: string, chatStatus: string) => {
      const response = await api.put(`/users/${id}/status`, { chat_status: chatStatus });
      return response.data;
  },
  updatePassword: async (id: string, password: string) => {
      const response = await api.put(`/users/${id}/password`, { password });
      return response.data;
  },

  ping: async () => {
    await api.post('/users/ping');
  },
  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};

export const DashboardService = {
  getStats: async (period: string = 'week') => {
    const response = await api.get('/dashboard', { params: { period } });
    return response.data;
  }
};

export const NotificationService = {
    getAll: async () => {
        const response = await api.get('/notifications');
        return response.data.map(mapNotificationFromApi);
    },
    markAsRead: async (id: string) => {
        await api.put(`/notifications/${id}/read`);
    },
    markAllAsRead: async () => {
        await api.put(`/notifications/all/read`);
    }
};

export const ChatService = {
    sendMessage: async (receiverId: string, content: string) => {
        const response = await api.post('/chat', { receiverId, content });
        return response.data;
    },
    getMessages: async (otherUserId: string) => {
        const response = await api.get(`/chat/${otherUserId}`);
        return response.data.map((msg: any) => ({
            id: msg.id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            content: msg.content,
            isRead: msg.is_read,
            createdAt: new Date(msg.created_at).toLocaleString()
        }));
    }
};

export default api;
