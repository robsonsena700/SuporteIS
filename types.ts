
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
  lastAccess: string;
  profile: 'Administrador' | 'Suporte Técnico' | 'Cliente';
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
  subject: string;
  equipment: string;
  clientName: string;
  priority: TicketPriority;
  status: TicketStatus;
  technician?: string;
  technicianAvatar?: string;
  description: string;
  createdAt: string;
  lastInteraction: string;
  messages: Message[];
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
