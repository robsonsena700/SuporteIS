import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, Modal, ScrollView, Platform } from 'react-native';
import { Header } from '../components/Header';
import { UserService } from '../services/userService';
import { User } from '../types';
import { useAuth } from '../auth/AuthContext';
import { Search, Plus, Filter, MoreVertical, Edit2, Key, Trash2, X, Save, User as UserIcon, Check, Phone, Building, Shield, Mail } from 'lucide-react-native';
import { CustomPicker } from '../components/CustomPicker';

// --- Modals ---

interface UserModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user?: User | null;
  loading?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ visible, onClose, onSubmit, user, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Técnico',
    profile: 'Suporte Técnico',
    status: 'Ativo',
    department: '',
    phone: '',
    password: '' // Only for creation
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'Técnico',
        profile: user.profile || '',
        status: user.status || 'Ativo',
        department: user.department || '',
        phone: user.phone || '',
        password: ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'Técnico',
        profile: 'Suporte Técnico',
        status: 'Ativo',
        department: '',
        phone: '',
        password: ''
      });
    }
  }, [user, visible]);

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Erro', 'Nome e Email são obrigatórios');
      return;
    }
    if (!user && !formData.password) {
      Alert.alert('Erro', 'Senha é obrigatória para novos usuários');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{user ? 'Editar Usuário' : 'Novo Usuário'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#9ca3af" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome</Text>
              <View style={styles.inputContainer}>
                <UserIcon size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={t => setFormData({...formData, name: t})}
                  placeholder="Nome completo"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={t => setFormData({...formData, email: t})}
                  placeholder="email@exemplo.com"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {!user && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.inputContainer}>
                  <Key size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={t => setFormData({...formData, password: t})}
                    placeholder="Senha inicial"
                    placeholderTextColor="#6b7280"
                    secureTextEntry
                  />
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <CustomPicker
                  label="Perfil (Role)"
                  value={formData.role}
                  options={[
                    { label: 'Cliente', value: 'Cliente' },
                    { label: 'Técnico', value: 'Técnico' },
                    { label: 'Administrador', value: 'Administrador' },
                  ]}
                  onSelect={v => setFormData({...formData, role: v})}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <CustomPicker
                  label="Status"
                  value={formData.status}
                  options={[
                    { label: 'Ativo', value: 'Ativo' },
                    { label: 'Inativo', value: 'Inativo' },
                    { label: 'Pendente', value: 'Pendente' },
                  ]}
                  onSelect={v => setFormData({...formData, status: v})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cargo / Função</Text>
              <View style={styles.inputContainer}>
                <Shield size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.profile}
                  onChangeText={t => setFormData({...formData, profile: t})}
                  placeholder="Ex: Suporte Técnico"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Departamento</Text>
              <View style={styles.inputContainer}>
                <Building size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.department}
                  onChangeText={t => setFormData({...formData, department: t})}
                  placeholder="Departamento"
                  placeholderTextColor="#6b7280"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefone</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={t => setFormData({...formData, phone: t})}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor="#6b7280"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PasswordModal: React.FC<{ visible: boolean; onClose: () => void; onSubmit: (pass: string) => Promise<void>; loading?: boolean }> = ({ visible, onClose, onSubmit, loading }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return;
    }
    onSubmit(password);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: 'auto' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Alterar Senha</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="#9ca3af" size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nova Senha</Text>
              <View style={styles.inputContainer}>
                <Key size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#6b7280"
                  secureTextEntry
                />
              </View>
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar Senha</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- Main Screen ---

export const UsersScreen = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal States
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await UserService.getAll();
      setUsers(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (data: any) => {
    try {
      setActionLoading(true);
      await UserService.create(data);
      Alert.alert('Sucesso', 'Usuário criado com sucesso');
      setUserModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao criar usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await UserService.update(selectedUser.id, data);
      Alert.alert('Sucesso', 'Usuário atualizado com sucesso');
      setUserModalVisible(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao atualizar usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (user: User) => {
    Alert.alert(
      'Excluir Usuário',
      `Tem certeza que deseja excluir ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await UserService.delete(user.id);
              setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o usuário');
            }
          }
        }
      ]
    );
  };

  const handlePasswordChange = async (password: string) => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await UserService.updatePassword(selectedUser.id, password);
      Alert.alert('Sucesso', 'Senha atualizada com sucesso');
      setPasswordModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao atualizar senha');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async (user: User) => {
    if (currentUser?.role !== 'Administrador') return;
    const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    Alert.alert(
      'Alterar Status',
      `Deseja alterar o status de ${user.name} para ${newStatus}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await UserService.update(user.id, { status: newStatus });
              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
            } catch (error) {
              Alert.alert('Erro', 'Erro ao alterar status');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    result.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return result;
  }, [users, searchQuery, sortOrder]);

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <UserIcon size={24} color="#9ca3af" />
            </View>
          )}
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => toggleStatus(item)} disabled={currentUser?.role !== 'Administrador'}>
          <View style={[styles.statusBadge, item.status === 'Ativo' ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, item.status === 'Ativo' ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.status}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Shield size={14} color="#6b7280" />
          <Text style={styles.detailText}>{item.role} • {item.profile}</Text>
        </View>
        {item.department && (
          <View style={styles.detailRow}>
            <Building size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.department}</Text>
          </View>
        )}
      </View>

      {currentUser?.role === 'Administrador' && (
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => { setSelectedUser(item); setPasswordModalVisible(true); }}
          >
            <Key size={18} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => { setSelectedUser(item); setUserModalVisible(true); }}
          >
            <Edit2 size={18} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header 
        title="Usuários" 
        rightAction={
          currentUser?.role === 'Administrador' ? (
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => { setSelectedUser(null); setUserModalVisible(true); }}
            >
              <Plus color="#fff" size={24} />
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search color="#9ca3af" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuários..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        >
          <Filter color={sortOrder === 'asc' ? "#9ca3af" : "#3b82f6"} size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchUsers(); }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
            </View>
          }
        />
      )}

      <UserModal 
        visible={userModalVisible} 
        onClose={() => setUserModalVisible(false)} 
        onSubmit={selectedUser ? handleUpdate : handleCreate}
        user={selectedUser}
        loading={actionLoading}
      />

      <PasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        onSubmit={handlePasswordChange}
        loading={actionLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 20,
    gap: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    height: '100%',
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextInactive: {
    color: '#ef4444',
  },
  cardDetails: {
    gap: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
