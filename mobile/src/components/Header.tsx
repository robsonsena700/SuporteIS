import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import { LogOut, Bell, Users, User as UserIcon, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notification, User } from '../types';
import { NotificationModal } from './NotificationModal';
import { UserService } from '../services/userService';

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
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

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
    if (user && (user.profile === 'Administrador' || user.profile === 'Suporte Técnico' || user.profile === 'Suporte' || user.profile === 'Líder')) {
      setShowTeamModal(true);
      loadTeamUsers();
    } else {
      Alert.alert('Equipe', 'Você não tem permissão para visualizar a equipe.');
    }
  };

  const loadTeamUsers = async () => {
    try {
      setTeamLoading(true);
      const all = await UserService.getAll();
      let filtered = all.filter((u: User) => u.id !== user?.id);
      filtered = filtered.filter((u: User) => u.profile !== 'Cliente');

      // Show all team members for authorized roles, not just online ones
      /*
      if (user?.profile !== 'Administrador') {
        filtered = filtered.filter((u: User) => {
          const isOnline = u.calculatedStatus === 'online';
          const isBusy = u.chatStatus === 'busy';
          return isOnline || isBusy;
        });
      }
      */

      setTeamUsers(filtered);
    } catch (error) {
      console.error('Failed to fetch team users', error);
      Alert.alert('Equipe', 'Não foi possível carregar a equipe. Verifique sua conexão.');
    } finally {
      setTeamLoading(false);
    }
  };

  const handleNotifications = () => {
    setShowNotifications(true);
    refreshNotifications();
  };

  useEffect(() => {
    if (!showTeamModal) return;
    const interval = setInterval(() => {
      loadTeamUsers();
    }, 10000);
    return () => clearInterval(interval);
  }, [showTeamModal]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (target: User) => {
    if (target.chatStatus === 'busy') return '#f59e0b';
    const isOnline = target.calculatedStatus === 'online' || target.chatStatus === 'online';
    return isOnline ? '#10b981' : '#6b7280';
  };

  const getStatusLabel = (target: User) => {
    if (target.chatStatus === 'busy') return 'Ocupado';
    const isOnline = target.calculatedStatus === 'online' || target.chatStatus === 'online';
    return isOnline ? 'Disponível' : 'Ausente';
  };

  const getConnectionTime = (target: User) => {
    if (!target.lastActiveAtIso) return '';
    const lastActive = new Date(target.lastActiveAtIso);
    if (isNaN(lastActive.getTime())) return '';
    const diffMs = now.getTime() - lastActive.getTime();
    if (diffMs < 0) return '';
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `há ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `há ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} d`;
  };

  const getUnreadDmForUser = (userId: string) => {
    return notifications.filter(n => n.type === 'new_dm' && n.referenceId === userId && !n.isRead).length;
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

  const canShowTeam = user?.profile === 'Administrador' || user?.profile === 'Suporte Técnico' || user?.profile === 'Suporte' || user?.profile === 'Líder';

  return (
    <>
      <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
        <View style={styles.content}>
          <View style={styles.leftContainer}>
            {showUserInfo ? (
              <TouchableOpacity style={styles.userInfo} onPress={handleOpenProfileMenu}>
                <View style={styles.userAvatar}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.userAvatarImage} />
                  ) : (
                    <Text style={styles.userAvatarInitials}>
                      {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <Text style={styles.userDetails}>
                    {user?.profile} | Último acesso: {lastAccess}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.title}>{title}</Text>
            )}
          </View>

          <View style={styles.actions}>
            {rightAction}

            {canShowTeam && (
              <TouchableOpacity
                onPress={handleTeamClick}
                style={styles.iconButton}
                accessibilityLabel="Equipe e chat"
                accessibilityRole="button"
              >
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
        visible={showTeamModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTeamModal(false)}
      >
        <View style={styles.teamOverlay}>
          <View style={styles.teamContainer}>
            <View style={styles.teamHeader}>
              <Text style={styles.teamTitle}>Equipe</Text>
              <TouchableOpacity onPress={() => setShowTeamModal(false)}>
                <Text style={styles.teamCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>

            {teamLoading ? (
              <View style={styles.teamLoading}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.teamLoadingText}>Carregando equipe...</Text>
              </View>
            ) : (
              <ScrollView style={styles.teamList}>
                {teamUsers.length === 0 ? (
                  <Text style={styles.teamEmptyText}>Nenhum membro disponível no momento.</Text>
                ) : (
                  teamUsers.map(u => {
                    const unread = getUnreadDmForUser(u.id);
                    const statusLabel = getStatusLabel(u);
                    const connectionTime = getConnectionTime(u);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.teamItem}
                        onPress={() => {
                          setShowTeamModal(false);
                          navigation.navigate('Chat', { userId: u.id, userName: u.name });
                        }}
                      >
                        <View style={styles.teamAvatarWrapper}>
                          {u.avatar ? (
                            <Image source={{ uri: u.avatar }} style={styles.teamAvatar} />
                          ) : (
                            <View style={styles.teamAvatarPlaceholder}>
                              <Text style={styles.teamAvatarInitials}>
                                {u.name.substring(0, 2).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View
                            style={[
                              styles.teamStatusDot,
                              { backgroundColor: getStatusColor(u) },
                            ]}
                          />
                        </View>
                        <View style={styles.teamInfo}>
                          <Text style={styles.teamName}>{u.name}</Text>
                          <Text style={styles.teamDetails}>
                            {statusLabel}
                            {connectionTime ? ` • ${connectionTime}` : ''}
                          </Text>
                        </View>
                        {unread > 0 && (
                          <View style={styles.teamBadge}>
                            <Text style={styles.teamBadgeText}>{unread}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userAvatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  profileButtonText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
  teamOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  teamContainer: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  teamCloseText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  teamLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  teamLoadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  teamList: {
    marginTop: 4,
  },
  teamEmptyText: {
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 16,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  teamAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  teamAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  teamAvatarPlaceholder: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
  },
  teamStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#111827',
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  teamDetails: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  teamBadge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
