import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Vibration, Platform } from 'react-native';
import { Notification } from '../types';
import { NotificationService } from '../services/notificationService';
import { useAuth } from '../auth/AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  alertEnabled: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: (showLoading?: boolean) => Promise<void>;
  toggleAlert: () => void;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  autoRefresh?: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, autoRefresh = true }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const previousCount = useRef(0);

  const playNotificationAlert = () => {
    if (!alertEnabled) return;
    // Vibrate for 400ms on Android/iOS
    // On iOS this might require specific permissions or audio session setup for sound,
    // so we stick to Vibration which is simple and effective for "native feel"
    Vibration.vibrate(400);
  };

  const refreshNotifications = async (showLoading = false) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    try {
      const data = await NotificationService.getAll();
      setNotifications(data);
      
      // Check for new unread notifications to trigger alert
      const currentUnreadCount = data.filter((n: Notification) => !n.isRead).length;
      if (currentUnreadCount > previousCount.current) {
        playNotificationAlert();
      }
      previousCount.current = currentUnreadCount;
      
    } catch (error) {
      console.log('Failed to fetch notifications', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      previousCount.current = 0;
      return;
    }

    if (!autoRefresh) {
      return;
    }

    refreshNotifications(true);
    const interval = setInterval(() => refreshNotifications(false), 10000);
    return () => clearInterval(interval);
  }, [user, autoRefresh]);

  const markAsRead = async (id: string) => {
    try {
        await NotificationService.markAsRead(id);
        // Optimistic update
        setNotifications(prev => {
            const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
            previousCount.current = updated.filter(n => !n.isRead).length;
            return updated;
        });
    } catch (error) {
        console.log('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
      try {
          await NotificationService.markAllAsRead();
          setNotifications(prev => {
              const updated = prev.map(n => ({ ...n, isRead: true }));
              previousCount.current = 0;
              return updated;
          });
      } catch (error) {
          console.log('Failed to mark all as read', error);
      }
  };

  const toggleAlert = () => {
    setAlertEnabled(prev => !prev);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, alertEnabled, markAsRead, markAllAsRead, refreshNotifications, toggleAlert }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
