import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TicketDetailModal from './TicketDetailModal';
import { TicketService } from '../services/api';
import { Ticket, TicketStatus, TicketPriority } from '../types';

let authUser = { id: 'user1', name: 'Test User', profile: 'Suporte Técnico' };

vi.mock('../services/api', () => ({
  TicketService: {
    getById: vi.fn(),
    update: vi.fn(),
    addMessage: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: authUser,
    isAuthenticated: true,
  }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('../context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    markAsRead: vi.fn(),
  }),
}));

const mockTicket: Ticket = {
  id: '1',
  subject: 'Test Ticket',
  content: 'Ticket content',
  status: TicketStatus.OPEN,
  priority: TicketPriority.MEDIUM,
  category: 'Hardware',
  createdAt: '2023-01-01',
  creatorId: 'user2',
  clientName: 'Client User',
  messages: [],
};

describe('TicketDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (TicketService.getHistory as any).mockResolvedValue([]);
    authUser = { id: 'user1', name: 'Test User', profile: 'Suporte Técnico' };
  });

  it('renders ticket details correctly', () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        technicians={[]}
        onClose={() => {}}
        onUpdate={() => {}}
      />
    );

    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText(/Client User/)).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(
      <TicketDetailModal
        ticket={mockTicket}
        technicians={[]}
        onClose={() => {}}
        onUpdate={() => {}}
      />
    );

    const historyTab = screen.getByText('Histórico');
    fireEvent.click(historyTab);
    
    // Check if TicketService.getHistory was called
    await waitFor(() => {
        expect(TicketService.getHistory).toHaveBeenCalledWith('1');
    });
  });

  it('sends a message', async () => {
    const onUpdateMock = vi.fn();
    (TicketService.addMessage as any).mockResolvedValue({
        id: 'msg1',
        content: 'New message',
        senderId: 'user1',
        senderName: 'Test User',
        timestamp: 'Now'
    });

    render(
      <TicketDetailModal
        ticket={mockTicket}
        technicians={[]}
        onClose={() => {}}
        onUpdate={onUpdateMock}
      />
    );

    const input = screen.getByPlaceholderText('Digite sua resposta...');
    fireEvent.change(input, { target: { value: 'New message' } });
    
    const sendButton = screen.getByText('Enviar Resposta');
    fireEvent.click(sendButton);

    await waitFor(() => {
        expect(TicketService.addMessage).toHaveBeenCalledWith('1', 'New message', false);
        expect(onUpdateMock).toHaveBeenCalled();
    });
  });

  it('does not send low rating without feedback', async () => {
    authUser = { id: 'creator-1', name: 'Creator User', profile: 'Cliente' };

    const ticket: Ticket = {
      ...mockTicket,
      id: 'res-1',
      status: TicketStatus.RESOLVED,
      creatorId: 'creator-1',
      messages: [],
    };

    render(
      <TicketDetailModal
        ticket={ticket}
        technicians={[]}
        onClose={() => {}}
        onUpdate={() => {}}
      />
    );

    const evaluateButton = screen.getByText('Avaliar Atendimento');
    fireEvent.click(evaluateButton);

    const stars = screen.getAllByText('star_rate');
    fireEvent.click(stars[0].closest('button') as HTMLButtonElement);

    const confirmButton = screen.getByText('Confirmar e Resolver');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(TicketService.update).not.toHaveBeenCalled();
    });
  });

  it('sends high rating without requiring feedback', async () => {
    authUser = { id: 'creator-2', name: 'Creator User', profile: 'Cliente' };

    const ticket: Ticket = {
      ...mockTicket,
      id: 'res-2',
      status: TicketStatus.RESOLVED,
      creatorId: 'creator-2',
      messages: [],
    };

    const onUpdateMock = vi.fn();
    const updatedTicket: Ticket = { ...ticket, rating: 5 };

    (TicketService.update as any).mockResolvedValue(updatedTicket);

    render(
      <TicketDetailModal
        ticket={ticket}
        technicians={[]}
        onClose={() => {}}
        onUpdate={onUpdateMock}
      />
    );

    const evaluateButton = screen.getByText('Avaliar Atendimento');
    fireEvent.click(evaluateButton);

    const stars = screen.getAllByText('star_rate');
    fireEvent.click(stars[4].closest('button') as HTMLButtonElement);

    const confirmButton = screen.getByText('Confirmar e Resolver');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(TicketService.update).toHaveBeenCalledWith('res-2', {
        status: TicketStatus.RESOLVED,
        rating: 5,
        feedback: '',
      });
      expect(onUpdateMock).toHaveBeenCalledWith(updatedTicket);
    });
  });

  it('resolves ticket when technician confirms resolution', async () => {
    authUser = { id: 'tech-1', name: 'Tech User', profile: 'Suporte Técnico' };

    const ticket: Ticket = {
      ...mockTicket,
      id: 'resolve-1',
      technicianId: 'tech-1',
      creatorId: 'creator-3',
    } as Ticket;

    const onUpdateMock = vi.fn();
    const updatedTicket: Ticket = { ...ticket, status: TicketStatus.RESOLVED };

    (TicketService.update as any).mockResolvedValue(updatedTicket);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TicketDetailModal
        ticket={ticket}
        technicians={[]}
        onClose={() => {}}
        onUpdate={onUpdateMock}
      />
    );

    const resolveButton = screen.getByText('Marcar como Resolvido');
    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(TicketService.update).toHaveBeenCalledWith('resolve-1', {
        status: TicketStatus.RESOLVED,
      });
      expect(onUpdateMock).toHaveBeenCalledWith(updatedTicket);
    });

    confirmSpy.mockRestore();
  });
});
