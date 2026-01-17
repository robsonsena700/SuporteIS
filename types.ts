
export enum TicketStatus {
  OPEN = 'Aberto',
  IN_ANALYSIS = 'Em Análise',
  IN_PROGRESS = 'Em Andamento',
  FORWARDED_ACQUISITION = 'Encaminhado Aquisição',
  IN_ROUTE = 'Em Rota',
  RESOLVED = 'Resolvido'
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
  role: string;
  avatar: string;
  status: 'Ativo' | 'Inativo';
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
  attachment?: string;
  rating?: number;
  feedback?: string;
  equipmentDetails?: {
    model: string;
    serialNumber: string;
    warranty: string;
  };
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
  averageRating: string;
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
  createdAtIso?: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}
