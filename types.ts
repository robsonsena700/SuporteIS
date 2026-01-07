
export enum TicketStatus {
  OPEN = 'Aberto',
  IN_ANALYSIS = 'Em Análise',
  IN_PROGRESS = 'Em Andamento',
  RESOLVED = 'Resolvido'
}

export enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'Ativo' | 'Inativo';
  chatStatus?: 'online' | 'busy' | 'offline';
  calculatedStatus?: 'online' | 'offline';
  lastAccess: string;
  profile: 'Administrador' | 'Suporte Técnico' | 'Cliente';
  company?: string;
  phone?: string;
  department?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface Ticket {
  id: string;
  code?: string;
  subject: string;
  equipment: string;
  clientName: string;
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
  messages: Message[];
  creatorName?: string;
  creatorId?: string;
  attachment?: string;
  equipmentDetails?: {
    model: string;
    serialNumber: string;
    warranty: string;
  };
}

export interface Stat {
  label: string;
  value: string | number;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

export interface DashboardStats {
  totalTickets: number;
  byStatus: { status: string; count: string }[];
  chartData: { name: string; chamados: string }[];
  resolvedCount: number;
  recentActivity: any[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'new_message' | 'new_dm' | 'status_change' | 'system';
  referenceId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}
