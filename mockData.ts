
import { Ticket, TicketStatus, TicketPriority, User } from './types';

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Ricardo Mendes',
    email: 'ricardo.m@techsupport.com',
    role: 'Admin Principal',
    avatar: 'https://picsum.photos/seed/ricardo/200',
    status: 'Ativo',
    lastAccess: 'Há 5 minutos',
    profile: 'Administrador'
  },
  {
    id: 'u2',
    name: 'Julia Santos',
    email: 'julia.santos@techsupport.com',
    role: 'Técnico Sênior',
    avatar: 'https://picsum.photos/seed/julia/200',
    status: 'Ativo',
    lastAccess: 'Há 2 horas',
    profile: 'Suporte Técnico'
  },
  {
    id: 'u3',
    name: 'Marcos Pereira',
    email: 'marcos.p@empresa.com',
    role: 'Gerente Financeiro',
    avatar: 'https://picsum.photos/seed/marcos/200',
    status: 'Inativo',
    lastAccess: 'Há 1 semana',
    profile: 'Cliente'
  }
];

export const mockTickets: Ticket[] = [
  {
    id: '#CH-2049',
    subject: 'Falha Crítica na Impressora Central - Setor Financeiro',
    equipment: 'HP LaserJet Pro M404',
    clientName: 'TechSolutions Ltda.',
    priority: TicketPriority.HIGH,
    status: TicketStatus.IN_PROGRESS,
    technician: 'Carlos M.',
    technicianAvatar: 'https://picsum.photos/seed/carlos/100',
    description: 'A impressora está apresentando erro 50.4 Fuser Error. Já tentamos reiniciar mas o problema persiste.',
    createdAt: 'Ontem, 16:30',
    lastInteraction: 'Hoje, 09:15',
    messages: [
      {
        id: 'm1',
        senderId: 'client-1',
        senderName: 'Marcos Lima',
        content: 'A impressora está apresentando erro 50.4 Fuser Error. Já tentamos reiniciar mas o problema persiste.',
        timestamp: 'Ontem, 16:30'
      },
      {
        id: 'm2',
        senderId: 'tech-1',
        senderName: 'Você',
        content: 'Olá Marcos. Esse erro geralmente indica um problema na unidade fusora ou na alimentação de energia. Poderia confirmar se houve alguma oscilação elétrica recente no andar?',
        timestamp: 'Hoje, 09:15'
      }
    ],
    equipmentDetails: {
      model: 'HP LaserJet Pro M404',
      serialNumber: 'VNC3H12345',
      warranty: 'Válida (até Dez/24)'
    }
  },
  {
    id: '#CH-2048',
    subject: 'Lentidão no servidor de arquivos',
    equipment: 'Server Dell R740',
    clientName: 'Global Services',
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.IN_ANALYSIS,
    technician: 'Ana Silva',
    technicianAvatar: 'https://picsum.photos/seed/ana/100',
    description: 'Usuários estão reportando lentidão extrema ao acessar pastas compartilhadas no servidor.',
    createdAt: 'Ontem, 14:20',
    lastInteraction: 'Ontem, 18:00',
    messages: []
  },
  {
    id: '#CH-2045',
    subject: 'Instalação Office 365',
    equipment: 'Notebook #442',
    clientName: 'TechSolutions Ltda.',
    priority: TicketPriority.LOW,
    status: TicketStatus.RESOLVED,
    technician: 'Roberto J.',
    technicianAvatar: 'https://picsum.photos/seed/roberto/100',
    description: 'Necessário instalar pacote Office 365 em novo notebook corporativo.',
    createdAt: '2 dias atrás',
    lastInteraction: 'Ontem, 11:30',
    messages: []
  }
];
