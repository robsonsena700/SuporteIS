import { api } from '../api/api';
import { Ticket, TicketHistory, Message } from '../types';

export const TicketService = {
  getAll: async () => {
    const response = await api.get('/tickets');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post('/tickets', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Ticket>) => {
    const response = await api.put(`/tickets/${id}`, data);
    return response.data;
  },

  addMessage: async (id: string, content: string, isInternal: boolean = false) => {
    const response = await api.post(`/tickets/${id}/messages`, { content, isInternal });
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await api.get(`/tickets/${id}/history`);
    return response.data;
  },

  changeType: async (id: string) => {
    const response = await api.patch(`/tickets/${id}/type`);
    return response.data;
  }
};
