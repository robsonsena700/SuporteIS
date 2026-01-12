import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { X, Bell, MessageSquare, CheckCircle, Info } from 'lucide-react-native';
import { Notification } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationModal = ({
  visible,
  onClose,
  notifications,
  loading,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationModalProps) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'new_message':
      case 'new_dm':
        return <MessageSquare color="#3b82f6" size={24} />;
      case 'status_change':
        return <CheckCircle color="#10b981" size={24} />;
      default:
        return <Info color="#9ca3af" size={24} />;
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.item, !item.isRead && styles.unreadItem]} 
      onPress={() => onMarkAsRead(item.id)}
    >
      <View style={styles.iconContainer}>
        {getIcon(item.type)}
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.content}>{item.content}</Text>
        <Text style={styles.time}>
          {item.createdAtIso 
            ? format(new Date(item.createdAtIso), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })
            : item.createdAt}
        </Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Bell color="#fff" size={20} />
              <Text style={styles.title}>Notificações</Text>
            </View>
            <View style={styles.headerActions}>
              {notifications.some(n => !n.isRead) && (
                <TouchableOpacity onPress={onMarkAllAsRead}>
                  <Text style={styles.markAllText}>Ler todas</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X color="#9ca3af" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.center}>
              <Bell color="#374151" size={48} />
              <Text style={styles.emptyText}>Nenhuma notificação</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  list: {
    padding: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
    marginBottom: 12,
    gap: 16,
  },
  unreadItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  iconContainer: {
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  content: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    color: '#9ca3af',
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 8,
  },
});
