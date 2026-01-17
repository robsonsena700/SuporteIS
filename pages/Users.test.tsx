import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Users from './Users';
import { User } from '../types';

const mockGetAll = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockUpdatePassword = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('../services/api', () => ({
  UserService: {
    getAll: (...args: any[]) => mockGetAll(...args),
    delete: (...args: any[]) => mockDelete(...args),
    update: (...args: any[]) => mockUpdate(...args),
    create: (...args: any[]) => mockCreate(...args),
    updatePassword: (...args: any[]) => mockUpdatePassword(...args)
  },
  AuthService: {
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args)
  }
}));

const baseUserApi = {
  id: 'target-id',
  name: 'Target User',
  email: 'target@test.com',
  role: 'Técnico',
  profile: 'Suporte Técnico',
  status: 'Ativo',
  avatar: '',
  department: '',
  company: '',
  phone: '',
  uf: '',
  municipality: '',
  last_access: null as any,
  created_at: new Date().toISOString()
};

const makeCurrentUser = (overrides: Partial<User>): User => ({
  id: 'current-id',
  name: 'Current User',
  email: 'current@test.com',
  role: 'Técnico',
  avatar: '',
  status: 'Ativo',
  lastAccess: '',
  profile: 'Suporte Técnico',
  company: '',
  phone: '',
  department: '',
  uf: '',
  municipality: '',
  ...overrides
});

describe('Users page permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAll.mockResolvedValue([baseUserApi]);
  });

  it('does not show management actions for Técnico', async () => {
    mockGetCurrentUser.mockReturnValue(
      makeCurrentUser({ role: 'Técnico', profile: 'Suporte Técnico' })
    );

    render(<Users />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalled();
    });

    expect(screen.queryByText('Adicionar Usuário')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Alterar Senha')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Editar')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Excluir')).not.toBeInTheDocument();
  });

  it('shows management actions for Administrador', async () => {
    mockGetCurrentUser.mockReturnValue(
      makeCurrentUser({ role: 'Administrador', profile: 'Administrador' })
    );

    render(<Users />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalled();
    });

    expect(screen.getByText('Adicionar Usuário')).toBeInTheDocument();
    expect(screen.getByTitle('Alterar Senha')).toBeInTheDocument();
    expect(screen.getByTitle('Editar')).toBeInTheDocument();
    expect(screen.getByTitle('Excluir')).toBeInTheDocument();
  });

  it('shows management actions for Líder profile', async () => {
    mockGetCurrentUser.mockReturnValue(
      makeCurrentUser({ role: 'Técnico', profile: 'Líder' })
    );

    render(<Users />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalled();
    });

    expect(screen.getByText('Adicionar Usuário')).toBeInTheDocument();
    expect(screen.getByTitle('Alterar Senha')).toBeInTheDocument();
    expect(screen.getByTitle('Editar')).toBeInTheDocument();
    expect(screen.getByTitle('Excluir')).toBeInTheDocument();
  });
});
