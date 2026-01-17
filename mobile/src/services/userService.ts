import { api } from '../api/api';
import { User } from '../types';

const mapUserFromApi = (data: any): User => ({
  id: data.id,
  name: data.name,
  email: data.email,
  role: data.role,
  avatar: data.avatar,
  status: data.status,
  chatStatus: data.chat_status,
  calculatedStatus: data.calculated_status,
  lastAccess: data.last_access,
  lastActiveAtIso: data.last_active_at,
  profile: data.profile,
  company: data.company,
  phone: data.phone,
  department: data.department,
  uf: data.uf,
  municipality: data.municipality,
});

export const UserService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data.map(mapUserFromApi);
  },

  getProfile: async () => {
    // Assuming /auth/me or similar exists, or just use stored user. 
    // But to get latest data including phone/dept, we might need an endpoint.
    // Using /users/profile or similar if it exists, otherwise /users/:id
    // For now, let's assume we can fetch by ID or use a specific profile endpoint.
    // The backend authController has updateProfile, so likely we can fetch it too.
    // Let's try to get the current user details.
    // If we don't have a direct 'me' endpoint, we might rely on what's stored or fetch by ID if we have it.
    // Let's assume we have the ID in context.
    return null; 
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await api.put('/auth/profile', data);
    return mapUserFromApi(response.data);
  },

  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return mapUserFromApi(response.data);
  },

  create: async (data: Partial<User> & { password?: string }) => {
    const response = await api.post('/users', data);
    return mapUserFromApi(response.data);
  },

  update: async (id: string, data: Partial<User>) => {
    const response = await api.put(`/users/${id}`, data);
    return mapUserFromApi(response.data);
  },

  delete: async (id: string) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  updatePassword: async (id: string, password: string) => {
    const response = await api.put(`/users/${id}/password`, { password });
    return response.data;
  },

  ping: async () => {
    await api.post('/users/ping');
  }
};
