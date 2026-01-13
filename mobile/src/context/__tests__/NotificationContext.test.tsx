import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NotificationProvider, useNotifications } from '../NotificationContext';
import { NotificationService } from '../../services/notificationService';
import { Vibration } from 'react-native';

// Mock dependencies
jest.mock('../../services/notificationService');
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'Test User', role: 'Técnico' } }),
}));
jest.mock('react-native/Libraries/Vibration/Vibration', () => ({
  default: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch notifications on mount', async () => {
    const mockNotifications = [
      { id: '1', content: 'Test', isRead: false, type: 'system', createdAt: '2023-01-01' },
    ];
    (NotificationService.getAll as jest.Mock).mockResolvedValue(mockNotifications);

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications);
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark notification as read', async () => {
    const mockNotifications = [
      { id: '1', content: 'Test', isRead: false, type: 'system', createdAt: '2023-01-01' },
    ];
    (NotificationService.getAll as jest.Mock).mockResolvedValue(mockNotifications);
    (NotificationService.markAsRead as jest.Mock).mockResolvedValue({});

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAsRead('1');
    });

    expect(NotificationService.markAsRead).toHaveBeenCalledWith('1');
    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should vibrate when new unread notifications arrive', async () => {
    (NotificationService.getAll as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: '1', content: 'New', isRead: false, type: 'system', createdAt: '2023-01-01' }
      ]);

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Initial load empty
    await waitFor(() => {
      expect(result.current.notifications).toEqual([]);
    });

    // Refresh with new notification
    await act(async () => {
      await result.current.refreshNotifications();
    });

    expect(Vibration.vibrate).toHaveBeenCalledWith(400);
  });

  it('should not vibrate if alert is disabled', async () => {
    (NotificationService.getAll as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: '1', content: 'New', isRead: false, type: 'system', createdAt: '2023-01-01' }
      ]);

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await act(async () => {
      result.current.toggleAlert(); // Disable alert
    });

    // Refresh with new notification
    await act(async () => {
      await result.current.refreshNotifications();
    });

    expect(Vibration.vibrate).not.toHaveBeenCalled();
  });
});
