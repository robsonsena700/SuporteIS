import { api } from '../api/api';
import { Ticket, TicketHistory, Message, TicketStatus, TicketPriority } from '../types';

const mapMessageFromApi = (data: any): Message => ({
  id: data.id,
  senderId: data.sender_id,
  senderName: data.sender_name || 'Usuário',
  content: data.content,
  timestamp: data.created_at,
  isInternal: data.is_internal,
  attachment: data.attachment,
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
  assignedAt: data.assigned_at,
  description: data.description,
  createdAt: data.created_at,
  createdAtIso: data.created_at,
  lastInteraction: data.updated_at || data.created_at,
  resolvedAt: data.resolved_at,
  messages: data.messages ? data.messages.map(mapMessageFromApi) : [],
  creatorName: data.creator_name,
  creatorId: data.user_id,
  attachment: data.attachment,
  rating: data.rating,
  feedback: data.feedback,
  equipmentDetails: {
    model: data.model || data.equipment,
    serialNumber: data.serial_number,
    warranty: data.warranty_info,
  },
});

const mapHistoryFromApi = (data: any): TicketHistory => ({
  id: data.id,
  ticketId: data.ticket_id,
  userId: data.user_id,
  userName: data.user_name,
  userAvatar: data.user_avatar,
  changeType: data.change_type,
  oldValue: data.old_value,
  newValue: data.new_value,
  details: data.details,
  createdAt: data.created_at,
});

export const TicketService = {
  getAll: async () => {
    const response = await api.get('/tickets');
    return response.data.map(mapTicketFromApi);
  },

  getById: async (id: string) => {
    const response = await api.get(`/tickets/${id}`);
    return mapTicketFromApi(response.data);
  },

  create: async (data: any) => {
    const response = await api.post('/tickets', data);
    return mapTicketFromApi(response.data);
  },

  update: async (id: string, data: Partial<Ticket>) => {
    const payload: any = { ...data };

    if (data.clientName) {
      payload.client_name = data.clientName;
    }

    if (data.technicianId) {
      payload.technician_id = data.technicianId;
    }

    if (data.equipmentDetails?.serialNumber) {
      payload.serial_number = data.equipmentDetails.serialNumber;
    }

    const response = await api.put(`/tickets/${id}`, payload);
    return mapTicketFromApi(response.data);
  },

  addMessage: async (id: string, content: string, isInternal: boolean = false) => {
    const response = await api.post(`/tickets/${id}/messages`, {
      content,
      is_internal: isInternal,
    });
    return mapMessageFromApi(response.data);
  },

  getHistory: async (id: string) => {
    const response = await api.get(`/tickets/${id}/history`);
    return response.data.map(mapHistoryFromApi);
  },

  changeType: async (id: string) => {
    const response = await api.patch(`/tickets/${id}/type`);
    return mapTicketFromApi(response.data);
  },
};
