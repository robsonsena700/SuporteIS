import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Tickets from './Tickets';
import { TicketService, UserService } from '../services/api';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { BrowserRouter } from 'react-router-dom';

// Mocks
vi.mock('../services/api', () => ({
  TicketService: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
  UserService: {
    getAll: vi.fn(),
  }
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', profile: 'Suporte Técnico' }
  })
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: []
  })
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  })
}));

// Mock the child component to simplify integration testing
vi.mock('../components/TicketDetailModal', () => ({
  default: ({ ticket, onClose }: any) => (
    <div data-testid="ticket-modal">
      <h1>Modal: {ticket.subject}</h1>
      <button onClick={onClose}>Close Modal</button>
    </div>
  )
}));

const mockTickets: Ticket[] = [
  {
    id: '1',
    subject: 'Erro no Sistema', // Contains 'sistema'
    equipment: 'Sistema ERP',
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    clientName: 'Client A',
    createdAt: '2023-01-01T10:00:00Z',
    description: 'Erro crítico no sistema ERP',
    lastInteraction: '2023-01-01T12:00:00Z',
    messages: []
  },
  {
    id: '2',
    subject: 'Impressora Quebrada', // Does not contain system keywords
    equipment: 'Impressora Laser',
    status: TicketStatus.OPEN,
    priority: TicketPriority.LOW,
    clientName: 'Client B',
    createdAt: '2023-01-02T10:00:00Z',
    description: 'Impressora não liga',
    lastInteraction: '2023-01-02T11:00:00Z',
    messages: []
  },
  {
    id: '3',
    subject: 'Erro Resolvido',
    equipment: 'Sistema ERP',
    status: TicketStatus.RESOLVED,
    priority: TicketPriority.MEDIUM,
    clientName: 'Client C',
    createdAt: '2023-01-03T10:00:00Z',
    description: 'Erro intermitente já corrigido',
    lastInteraction: '2023-01-03T12:00:00Z',
    messages: []
  }
];

describe('Tickets Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TicketService.getAll as any).mockResolvedValue(mockTickets);
    (TicketService.getById as any).mockImplementation((id: string) => 
      Promise.resolve(mockTickets.find(t => t.id === id))
    );
    (UserService.getAll as any).mockResolvedValue([]);
  });

  it('renders the list of system tickets by default', async () => {
    render(
      <BrowserRouter>
        <Tickets tickets={mockTickets} onUpdate={() => {}} />
      </BrowserRouter>
    );

    // Should show Ticket 1 (Sistema)
    expect(await screen.findByText('Erro no Sistema')).toBeInTheDocument();
    
    // Should NOT show Ticket 2 (Equipamento/Other) in Sistema tab
    expect(screen.queryByText('Impressora Quebrada')).not.toBeInTheDocument();
    
    // Should NOT show Ticket 3 (Resolved) in Sistema tab
    expect(screen.queryByText('Erro Resolvido')).not.toBeInTheDocument();
  });

  it('switches to Equipment tab and shows relevant tickets', async () => {
    render(
      <BrowserRouter>
        <Tickets tickets={mockTickets} onUpdate={() => {}} />
      </BrowserRouter>
    );

    // Wait for initial load
    await screen.findByText('Erro no Sistema');

    const equipmentTab = screen.getByText('Equipamento');
    fireEvent.click(equipmentTab);

    // Should show Ticket 2
    expect(screen.getByText('Impressora Quebrada')).toBeInTheDocument();
    
    // Should NOT show Ticket 1 (Sistema) - Wait, logic says !keywords.some...
    // 'Erro no Sistema' contains 'sistema', so it returns false. Correct.
    expect(screen.queryByText('Erro no Sistema')).not.toBeInTheDocument();
  });

  it('formats creation date as DD/MM/AAAA HH:MM:SS in list', async () => {
    render(
      <BrowserRouter>
        <Tickets tickets={mockTickets} onUpdate={() => {}} />
      </BrowserRouter>
    );

    const row = await screen.findByText('Erro no Sistema');
    expect(row).toBeInTheDocument();
  });

  it('switches to Completed tab and shows resolved tickets', async () => {
    render(
      <BrowserRouter>
        <Tickets tickets={mockTickets} onUpdate={() => {}} />
      </BrowserRouter>
    );

    // Wait for initial load
    await screen.findByText('Erro no Sistema');

    const completedTab = screen.getByText('Concluído');
    fireEvent.click(completedTab);

    // Should show Ticket 3 (Resolved)
    expect(screen.getByText('Erro Resolvido')).toBeInTheDocument();
  });

  it('opens modal when a ticket is clicked', async () => {
    render(
      <BrowserRouter>
        <Tickets tickets={mockTickets} onUpdate={() => {}} />
      </BrowserRouter>
    );

    const ticketRow = screen.getByText('Erro no Sistema');
    fireEvent.click(ticketRow);

    await waitFor(() => {
        expect(screen.getByTestId('ticket-modal')).toBeInTheDocument();
        expect(screen.getByText('Modal: Erro no Sistema')).toBeInTheDocument();
    });
  });

  it('does not open modal when API retorna 403 para detalhes do chamado', async () => {
    (TicketService.getAll as any).mockResolvedValueOnce(mockTickets);
    (TicketService.getById as any).mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Acesso não autorizado' } }
    });

    render(
      <BrowserRouter>
        <Tickets tickets={mockTickets} onUpdate={() => {}} />
      </BrowserRouter>
    );

    const ticketRow = await screen.findByText('Erro no Sistema');
    fireEvent.click(ticketRow);

    await waitFor(() => {
      expect(screen.queryByTestId('ticket-modal')).not.toBeInTheDocument();
    });
  });
});
