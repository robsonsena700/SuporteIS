export enum TicketStatus {
  OPEN = 'Aberto',
  IN_ANALYSIS = 'Em Análise',
  IN_PROGRESS = 'Em Andamento',
  FORWARDED_ACQUISITION = 'Encaminhado Aquisição',
  IN_ROUTE = 'Em Rota',
  RESOLVED = 'Resolvido',
  CANCELED = 'Cancelado'
}

export enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Técnico' | 'Cliente' | string;
  avatar: string;
  status: 'Ativo' | 'Inativo' | string;
  chatStatus?: 'online' | 'busy' | 'offline';
  calculatedStatus?: 'online' | 'offline';
  lastAccess: string;
  lastActiveAtIso?: string;
  profile: string;
  company?: string;
  phone?: string;
  department?: string;
  uf?: string;
  municipality?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isInternal?: boolean;
  attachment?: string;
}

export interface Ticket {
  id: string;
  code?: string;
  subject: string;
  equipment: string;
  clientName: string;
  unit?: string;
  municipality?: string;
  uf?: string;
  priority: TicketPriority;
  status: TicketStatus;
  technician?: string;
  technicianId?: string;
  technicianAvatar?: string;
  assignedAt?: string;
  description: string;
  createdAt: string;
  createdAtIso?: string;
  lastInteraction: string;
  resolvedAt?: string;
  messages: Message[];
  creatorName?: string;
  creatorId?: string;
  creatorAvatar?: string;
  category?: string;
  attachment?: string;
  rating?: number;
  feedback?: string;
  equipmentDetails?: {
    model: string;
    serialNumber: string;
    warranty: string;
  };
  serialNumber?: string;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  changeType: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_message' | 'new_dm' | 'status_change' | 'system';
  referenceId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  createdAtIso?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

export interface DashboardStats {
  totalTickets: number;
  resolvedCount: number;
  averageRating: number;
  tmr: string;
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  evolution: { date: string; count: number }[];
}
