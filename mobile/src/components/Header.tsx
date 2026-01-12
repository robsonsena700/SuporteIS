import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LogOut, Bell, Users, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationService } from '../services/notificationService';
import { Notification } from '../types';
import { NotificationModal } from './NotificationModal';

interface HeaderProps {
  title?: string;
  showUserInfo?: boolean;
  rightAction?: React.ReactNode;
}

export const Header = ({ title, showUserInfo = false, rightAction }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await NotificationService.getAll();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.log('Error fetching notifications:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.log('Error marking all as read:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair do Sistema',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleTeamClick = () => {
    if (user?.profile === 'Administrador' || user?.profile === 'Suporte Técnico') {
      navigation.navigate('UsersTab' as never);
    } else {
      Alert.alert('Equipe', 'Você não tem permissão para visualizar a equipe.');
    }
  };

  const handleNotifications = () => {
    setShowNotifications(true);
    fetchNotifications();
  };

  // Format last access date
  const lastAccess = user?.lastAccess 
    ? new Date(user.lastAccess).toLocaleString('pt-BR') 
    : new Date().toLocaleString('pt-BR');

  const canShowTeam = user?.profile === 'Administrador' || user?.profile === 'Suporte Técnico';

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.content}>
          <View style={styles.leftContainer}>
            {showUserInfo ? (
              <View style={styles.userInfo}>
                <View style={styles.avatarContainer}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>
                        {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <Text style={styles.userDetails}>
                    {user?.profile} | Último acesso: {lastAccess}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.title}>{title}</Text>
            )}
          </View>

          <View style={styles.actions}>
            {rightAction}
            
            {canShowTeam && (
              <TouchableOpacity onPress={handleTeamClick} style={styles.iconButton}>
                <Users color="#fff" size={20} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleNotifications} style={styles.iconButton}>
              <View>
                <Bell color="#fff" size={20} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
              <LogOut color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        loading={loadingNotifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  leftContainer: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1f2937',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
