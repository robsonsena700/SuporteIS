import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NewTicket from './NewTicket';
import { BrowserRouter } from 'react-router-dom';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/api';

// Mocks
vi.mock('../services/api', () => ({
  TicketService: {
    create: vi.fn(),
  },
  UserService: {
    getAll: vi.fn(),
  }
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  })
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('NewTicket Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for Client', () => {
    const mockUser: User = {
      id: '1',
      name: 'Test Client',
      email: 'client@test.com',
      role: 'client',
      avatar: '',
      status: 'Ativo',
      lastAccess: '',
      profile: 'Cliente'
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn()
    });

    render(
      <BrowserRouter>
        <NewTicket onAdd={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByText('Novo Chamado')).toBeInTheDocument();
    const clientInput = screen.getByPlaceholderText('Nome do Cliente');
    expect(clientInput).toHaveAttribute('readonly');
    expect(clientInput).toHaveValue('Test Client');
  });

  it('renders correctly for Support (Select Client)', async () => {
    const mockSupportUser: User = {
        id: '2',
        name: 'Support User',
        email: 'support@test.com',
        role: 'support',
        avatar: '',
        status: 'Ativo',
        lastAccess: '',
        profile: 'Suporte Técnico'
    };

    vi.mocked(useAuth).mockReturnValue({
      user: mockSupportUser,
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn()
    });

    vi.mocked(UserService.getAll).mockResolvedValue([
      { id: '1', name: 'Cliente Teste', profile: 'Cliente', email: '', role: 'client', status: 'Ativo', lastAccess: '', avatar: '' },
      { id: '2', name: 'Outro Cliente', profile: 'Cliente', email: '', role: 'client', status: 'Ativo', lastAccess: '', avatar: '' },
      { id: '3', name: 'Suporte', profile: 'Suporte Técnico', email: '', role: 'support', status: 'Ativo', lastAccess: '', avatar: '' }
    ]);

    render(
      <BrowserRouter>
        <NewTicket onAdd={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByText('Novo Chamado')).toBeInTheDocument();
    
    await waitFor(() => {
        expect(UserService.getAll).toHaveBeenCalled();
    });

    const select = await screen.findByRole('combobox');
    expect(select).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    // 1 default + 2 clients = 3 options
    expect(options).toHaveLength(3); 
    expect(screen.queryByText('Suporte')).not.toBeInTheDocument();
    expect(screen.getByText('Cliente Teste')).toBeInTheDocument();
  });
});
