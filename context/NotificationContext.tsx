import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Notification } from '../types';
import { NotificationService } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  playNotificationSound: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousCount = useRef(0);

  // Simple beep sound using Web Audio API to avoid external file dependencies
  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const refreshNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await NotificationService.getAll();
      setNotifications(data);
      
      // Check for new unread notifications to play sound
      const currentUnreadCount = data.filter(n => !n.isRead).length;
      if (currentUnreadCount > previousCount.current) {
        playNotificationSound();
      }
      previousCount.current = currentUnreadCount;
      
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshNotifications();
      const interval = setInterval(refreshNotifications, 10000); // Poll every 10s
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      previousCount.current = 0;
    }
  }, [isAuthenticated]);

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
        console.error('Failed to mark as read', error);
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
          console.error('Failed to mark all as read', error);
      }
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications, playNotificationSound, soundEnabled, toggleSound }}>
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
