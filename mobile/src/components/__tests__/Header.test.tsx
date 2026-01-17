import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Header } from '../Header';

let mockUser: any = null;

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: jest.fn(),
  }),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    alertEnabled: true,
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    refreshNotifications: jest.fn(),
    toggleAlert: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

describe('Header - Equipe & Chat visibility (mobile)', () => {
  beforeEach(() => {
    mockUser = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Técnico',
      avatar: '',
      status: 'Ativo',
      lastAccess: new Date().toISOString(),
      profile: 'Suporte Técnico',
    };
  });

  it('renderiza o header sem o botão Abrir menu de perfil', () => {
    const utils = render(<Header title="Dashboard" />);

    expect(utils.queryByLabelText('Abrir menu de perfil')).toBeNull();
  });
});
