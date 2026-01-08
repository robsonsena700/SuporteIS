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
    // Ignore 401 for login endpoint to allow UI to handle "Incorrect Password"
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      // Only redirect if not already on login
      if (window.location.pathname !== '/login') {
          window.location.href = '/login';
      }
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
  id: data.id,
  code: data.code,
  subject: data.subject,
  equipment: data.equipment,
  clientName: data.client_name,
  unit: data.unit,
  municipality: data.municipality,
  uf: data.uf,
  priority: data.priority as TicketPriority,
  status: data.status as TicketStatus,
  technician: data.technician_name,
  technicianId: data.technician_id,
  technicianAvatar: data.technician_avatar,
  assignedAt: data.assigned_at ? new Date(data.assigned_at).toLocaleString() : undefined,
  description: data.description,
  createdAt: new Date(data.created_at).toLocaleString(),
  createdAtIso: data.created_at,
  lastInteraction: new Date(data.updated_at || data.created_at).toLocaleString(),
  resolvedAt: data.resolved_at,
  messages: data.messages ? data.messages.map(mapMessageFromApi) : [],
  creatorName: data.creator_name,
  creatorId: data.user_id,
  attachment: data.attachment,
  rating: data.rating,
  feedback: data.feedback,
  equipmentDetails: {
    model: data.model || data.equipment,
    serialNumber: data.serial_number || 'N/A',
    warranty: data.warranty_info || 'N/A'
  }
});

const mapNotificationFromApi = (data: any): Notification => ({
  id: data.id,
  userId: data.user_id,
  type: data.type,
  referenceId: data.reference_id,
  content: data.content,
  isRead: data.is_read,
  createdAt: new Date(data.created_at).toLocaleString(),
  createdAtIso: data.created_at
});

const mapUserFromApi = (data: any): User => ({
  id: data.id,
  name: data.name,
  email: data.email,
  role: data.role,
  avatar: data.avatar,
  status: data.status,
  chatStatus: data.chat_status,
  calculatedStatus: data.calculated_status,
  lastAccess: data.last_access ? new Date(data.last_access).toLocaleString() : 'Nunca',
  profile: data.profile,
  company: data.company,
  phone: data.phone,
  department: data.department
});

export const AuthService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(mapUserFromApi(response.data.user)));
    }
    return { ...response.data, user: mapUserFromApi(response.data.user) };
  },
  register: async (userData: Partial<User> & { password?: string }) => {
    const response = await api.post('/auth/register', userData);
    // Automatically login or return user
    return mapUserFromApi(response.data);
  },
  updateProfile: async (userData: Partial<User>) => {
    const response = await api.put('/auth/profile', userData);
    const mappedUser = mapUserFromApi(response.data);
    // Update local storage user if successful
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && currentUser.id === mappedUser.id) {
        localStorage.setItem('user', JSON.stringify(mappedUser));
    }
    return mappedUser;
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
  getAll: async (filters?: { startDate?: string; endDate?: string; status?: string; priority?: string; search?: string; category?: string }) => {
    const params: any = {};
    if (filters) {
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.search) params.search = filters.search;
        if (filters.category) params.category = filters.category;
    }
    const response = await api.get('/tickets', { params });
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
      unit: ticket.unit,
      municipality: ticket.municipality,
      uf: ticket.uf,
      priority: ticket.priority,
      status: ticket.status,
      attachment: ticket.attachment,
      equipmentDetails: ticket.equipmentDetails
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
    
    // Map serial number from equipmentDetails
    if (updates.equipmentDetails?.serialNumber) {
        payload.serial_number = updates.equipmentDetails.serialNumber;
    }

    const response = await api.put(`/tickets/${id}`, payload);
    return mapTicketFromApi(response.data);
  },
  addMessage: async (id: string, content: string, isInternal: boolean = false, attachment?: string) => {
    const response = await api.post(`/tickets/${id}/messages`, { content, is_internal: isInternal, attachment });
    return mapMessageFromApi(response.data);
  },
  getHistory: async (id: string) => {
    const response = await api.get(`/tickets/${id}/history`);
    return response.data.map((h: any) => ({
      id: h.id,
      ticketId: h.ticket_id,
      userId: h.user_id,
      userName: h.user_name || 'Sistema',
      userAvatar: h.user_avatar,
      changeType: h.change_type,
      oldValue: h.old_value,
      newValue: h.new_value,
      details: h.details,
      createdAt: new Date(h.created_at).toLocaleString()
    }));
  }
};

export const UserService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data.map(mapUserFromApi);
  },
  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return mapUserFromApi(response.data);
  },
  create: async (user: any) => {
    const response = await api.post('/users', user);
    return mapUserFromApi(response.data);
  },
  update: async (id: string, updates: any) => {
    const response = await api.put(`/users/${id}`, updates);
    return mapUserFromApi(response.data);
  },
  updateStatus: async (id: string, chatStatus: string) => {
      const response = await api.put(`/users/${id}/status`, { chat_status: chatStatus });
      return mapUserFromApi(response.data);
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
  getStats: async (period: string = 'week', myTickets: boolean = false) => {
    const response = await api.get(`/dashboard?period=${period}&myTickets=${myTickets}`);
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
