import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TicketDetailModal from './TicketDetailModal';
import { TicketService } from '../services/api';
import { Ticket, TicketStatus, TicketPriority } from '../types';

// Mocks
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
    user: { id: 'user1', name: 'Test User', profile: 'Suporte Técnico' },
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
});
