import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import UserList from './UserList';
import { UserService } from '../services/api';
import * as AuthContext from '../context/AuthContext';
import * as NotificationContext from '../context/NotificationContext';

// Mocks
vi.mock('../services/api', () => ({
  UserService: {
    getAll: vi.fn()
  }
}));

// Mock dos hooks de contexto
const mockUseAuth = vi.spyOn(AuthContext, 'useAuth');
const mockUseNotifications = vi.spyOn(NotificationContext, 'useNotifications');

describe('UserList', () => {
  const mockUsers = [
    { id: '1', name: 'Admin User', profile: 'Administrador', calculatedStatus: 'online', chatStatus: 'online', avatar: '' },
    { id: '2', name: 'Support Online', profile: 'Suporte Técnico', calculatedStatus: 'online', chatStatus: 'online', avatar: '' },
    { id: '3', name: 'Support Offline', profile: 'Suporte Técnico', calculatedStatus: 'offline', chatStatus: 'offline', avatar: '' },
    { id: '4', name: 'Support Busy', profile: 'Suporte Técnico', calculatedStatus: 'online', chatStatus: 'busy', avatar: '' }, // Busy
    { id: '5', name: 'Client User', profile: 'Cliente', calculatedStatus: 'online', chatStatus: 'online', avatar: '' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({ notifications: [], markAsRead: vi.fn() } as any);
  });

  it('deve mostrar todos os usuários (exceto clientes e o próprio user) para Administrador', async () => {
    // Current user is Admin (id 1)
    mockUseAuth.mockReturnValue({ user: { id: '1', profile: 'Administrador' } } as any);
    (UserService.getAll as any).mockResolvedValue(mockUsers);

    render(<UserList onClose={vi.fn()} onSelectUser={vi.fn()} />);

    await waitFor(() => {
      // Admin não vê a si mesmo na lista (filtrado por id !== currentUser.id)
      expect(screen.queryByText('Admin User')).not.toBeInTheDocument(); 
      
      expect(screen.getByText('Support Online')).toBeInTheDocument();
      expect(screen.getByText('Support Offline')).toBeInTheDocument(); // Admin vê offline
      expect(screen.getByText('Support Busy')).toBeInTheDocument();
      expect(screen.queryByText('Client User')).not.toBeInTheDocument(); // Clientes sempre ocultos
    });
  });

  it('deve ocultar usuários offline para Suporte Técnico', async () => {
    // Current user is Support (id 2)
    mockUseAuth.mockReturnValue({ user: { id: '2', profile: 'Suporte Técnico' } } as any);
    (UserService.getAll as any).mockResolvedValue(mockUsers);

    render(<UserList onClose={vi.fn()} onSelectUser={vi.fn()} />);

    await waitFor(() => {
      expect(screen.queryByText('Support Online')).not.toBeInTheDocument(); // Self
      
      expect(screen.getByText('Admin User')).toBeInTheDocument(); // Online
      expect(screen.queryByText('Support Offline')).not.toBeInTheDocument(); // Oculto para não-admin
      expect(screen.getByText('Support Busy')).toBeInTheDocument(); // Busy conta como visível
      expect(screen.queryByText('Client User')).not.toBeInTheDocument();
    });
  });
});
