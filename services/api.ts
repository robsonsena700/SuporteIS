import axios from 'axios';
import { Ticket, TicketStatus, TicketPriority, User, Message } from '../types';

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
  technicianAvatar: data.technician_avatar,
  description: data.description,
  createdAt: new Date(data.created_at).toLocaleString(),
  lastInteraction: new Date(data.updated_at || data.created_at).toLocaleString(),
  messages: data.messages ? data.messages.map(mapMessageFromApi) : [],
  equipmentDetails: { // Placeholder or map if available
    model: data.equipment,
    serialNumber: 'N/A',
    warranty: 'N/A'
  }
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
  create: async (ticket: Partial<Ticket>) => {
    const payload = {
      subject: ticket.subject,
      description: ticket.description,
      equipment: ticket.equipment,
      client_name: ticket.clientName, // Map to snake_case
      priority: ticket.priority,
      status: ticket.status
    };
    const response = await api.post('/tickets', payload);
    return mapTicketFromApi(response.data);
  },
  update: async (id: string, updates: Partial<Ticket> & { technician?: string }) => {
    const payload: any = { ...updates };
    if (updates.clientName) payload.client_name = updates.clientName;
    if (updates.technician) payload.technician_id = updates.technician;
    
    const response = await api.put(`/tickets/${id}`, payload);
    return mapTicketFromApi(response.data);
  },
  addMessage: async (id: string, content: string, isInternal: boolean = false) => {
    const response = await api.post(`/tickets/${id}/messages`, { content, is_internal: isInternal });
    return mapMessageFromApi(response.data);
  }
};

export default api;
