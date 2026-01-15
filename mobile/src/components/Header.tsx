import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Bell, Users, User as UserIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationModal } from './NotificationModal';
import { Notification } from '../types';

interface HeaderProps {
  title?: string;
  showUserInfo?: boolean;
  rightAction?: React.ReactNode;
}

export const Header = ({ title, showUserInfo = false, rightAction }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { notifications, unreadCount, loading, alertEnabled, markAsRead, markAllAsRead, refreshNotifications, toggleAlert } = useNotifications();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  const handleOpenProfileMenu = () => {
    setShowProfileMenu(true);
  };

  const handleNavigateProfile = () => {
    setShowProfileMenu(false);
    navigation.navigate('ProfileTab' as never);
  };

  const handleTeamClick = () => {
    if (user?.role === 'Administrador' || user?.profile === 'Suporte Técnico') {
      navigation.navigate('UsersTab' as never);
    } else {
      Alert.alert('Equipe', 'Você não tem permissão para visualizar a equipe.');
    }
  };

  const handleNotifications = () => {
    setShowNotifications(true);
    refreshNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    setShowNotifications(false);
    
    if (notification.type === 'new_message' || notification.type === 'status_change') {
      navigation.navigate('TicketDetail', { ticketId: notification.referenceId });
    } else if (notification.type === 'new_dm') {
      navigation.navigate('Chat', { userId: notification.referenceId });
    }
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
            
            <TouchableOpacity onPress={handleOpenProfileMenu} style={styles.profileButton}>
              <View style={styles.profileButtonAvatar}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileButtonAvatarImage} />
                ) : (
                  <Text style={styles.profileButtonInitials}>
                    {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            
            {canShowTeam && (
              <TouchableOpacity onPress={handleTeamClick} style={styles.iconButton}>
                <Users stroke="#fff" size={20} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleNotifications} style={styles.iconButton}>
              <View>
                <Bell stroke="#fff" size={20} />
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
        loading={loading}
        alertEnabled={alertEnabled}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onToggleAlert={toggleAlert}
        onNotificationClick={handleNotificationClick}
      />

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <View style={styles.profileMenuOverlay}>
          <View style={styles.profileMenuContainer}>
            <View style={styles.profileMenuHeader}>
              <View style={styles.profileMenuAvatar}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.profileMenuAvatarImage} />
                ) : (
                  <View style={styles.profileMenuAvatarPlaceholder}>
                    <Text style={styles.profileMenuAvatarInitials}>
                      {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileMenuHeaderText}>
                <Text style={styles.profileMenuName}>{user?.name}</Text>
                <Text style={styles.profileMenuRole}>{user?.profile}</Text>
              </View>
            </View>

            <View style={styles.profileMenuList}>
              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleNavigateProfile}
              >
                <View style={styles.profileMenuItemIcon}>
                  <UserIcon color="#3b82f6" size={22} />
                </View>
                <View style={styles.profileMenuItemTextContainer}>
                  <Text style={styles.profileMenuItemTitle}>Ver perfil</Text>
                  <Text style={styles.profileMenuItemSubtitle}>Informações pessoais e de conta</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  handleNotifications();
                }}
              >
                <View style={styles.profileMenuItemIcon}>
                  <Bell color="#10b981" size={22} />
                </View>
                <View style={styles.profileMenuItemTextContainer}>
                  <Text style={styles.profileMenuItemTitle}>Notificações</Text>
                  <Text style={styles.profileMenuItemSubtitle}>Alertas e mensagens recentes</Text>
                </View>
              </TouchableOpacity>

              {canShowTeam && (
                <TouchableOpacity
                  style={styles.profileMenuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    handleTeamClick();
                  }}
                >
                  <View style={styles.profileMenuItemIcon}>
                    <Users color="#f59e0b" size={22} />
                  </View>
                  <View style={styles.profileMenuItemTextContainer}>
                    <Text style={styles.profileMenuItemTitle}>Equipe e chat</Text>
                    <Text style={styles.profileMenuItemSubtitle}>Acessar equipe e conversas</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  handleLogout();
                }}
              >
                <View style={styles.profileMenuItemIcon}>
                  <LogOut color="#ef4444" size={22} />
                </View>
                <View style={styles.profileMenuItemTextContainer}>
                  <Text style={styles.profileMenuItemTitle}>Sair</Text>
                  <Text style={styles.profileMenuItemSubtitle}>Encerrar sessão neste dispositivo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  profileButton: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  profileButtonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
  },
  profileButtonAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileButtonInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
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
  profileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  profileMenuContainer: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  profileMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileMenuAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    marginRight: 12,
  },
  profileMenuAvatarImage: {
    width: '100%',
    height: '100%',
  },
  profileMenuAvatarPlaceholder: {
    flex: 1,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMenuAvatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileMenuHeaderText: {
    flex: 1,
  },
  profileMenuName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileMenuRole: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4,
  },
  profileMenuList: {
    marginTop: 8,
    gap: 8,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  profileMenuItemIcon: {
    width: 32,
    alignItems: 'center',
  },
  profileMenuItemTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  profileMenuItemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  profileMenuItemSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
});
