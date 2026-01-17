import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Header from './Header';
import { User } from '../types';
import * as NotificationContext from '../context/NotificationContext';
import * as ReactRouterDom from 'react-router-dom';

const mockUseNotifications = vi.spyOn(NotificationContext, 'useNotifications');

const createUser = (overrides: Partial<User>): User => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'Técnico',
  avatar: '',
  status: 'Ativo',
  lastAccess: new Date().toISOString(),
  profile: 'Suporte Técnico',
  ...overrides,
});

describe('Header - Equipe & Chat visibility (web)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    } as any);
  });

  const renderHeader = (user: User) => {
    render(
      <ReactRouterDom.BrowserRouter>
        <Header user={user} onChatSelect={() => {}} />
      </ReactRouterDom.BrowserRouter>
    );
  };

  it('shows Equipe & Chat button for non-client user', () => {
    const user = createUser({ profile: 'Suporte Técnico' });

    renderHeader(user);

    expect(screen.getByTitle('Equipe & Chat')).toBeInTheDocument();
  });

  it('hides Equipe & Chat button for client profile', () => {
    const user = createUser({ profile: 'Cliente', role: 'Cliente' });

    renderHeader(user);

    expect(screen.queryByTitle('Equipe & Chat')).not.toBeInTheDocument();
  });

  // Botão "Abrir menu de perfil" foi removido do header web.
});
