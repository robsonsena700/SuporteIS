import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator, Modal, ScrollView, Platform, RefreshControl } from 'react-native';
import { Header } from '../components/Header';
import { UserService } from '../services/userService';
import { User } from '../types';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Search, Plus, Filter, MoreVertical, Edit2, Key, Trash2, X, Save, User as UserIcon, Check, Phone, Building, Shield, Mail } from 'lucide-react-native';
import { CustomPicker } from '../components/CustomPicker';
import { useLocationIBGE } from '../hooks/useLocationIBGE';

// --- Modals ---

interface UserModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user?: User | null;
  loading?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ visible, onClose, onSubmit, user, loading }) => {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const { estados, municipios, loadingEstados, loadingMunicipios, fetchMunicipios, clearMunicipios } = useLocationIBGE();
  const canEditLocation = currentUser?.profile === 'Suporte Técnico' || currentUser?.profile === 'Administrador';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Técnico',
    profile: 'Suporte Técnico',
    status: 'Ativo',
    department: '',
    phone: '',
    password: '',
    uf: '',
    municipality: ''
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
        password: '',
        uf: user.uf || '',
        municipality: user.municipality || ''
      });
      if (user.uf) {
        clearMunicipios();
        fetchMunicipios(user.uf);
      }
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'Técnico',
        profile: 'Suporte Técnico',
        status: 'Ativo',
        department: '',
        phone: '',
        password: '',
        uf: '',
        municipality: ''
      });
    }
  }, [user, visible, clearMunicipios, fetchMunicipios]);

  const handleSubmit = () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Erro', 'Nome e Email são obrigatórios');
      return;
    }
    if (!user && !formData.password) {
      Alert.alert('Erro', 'Senha é obrigatória para novos usuários');
      return;
    }
     if (canEditLocation && (!formData.uf || !formData.municipality)) {
      Alert.alert('Erro', 'UF e Município são obrigatórios para usuários de suporte/administrador.');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{user ? 'Editar Usuário' : 'Novo Usuário'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={theme.subtext} size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.subtext }]}>Nome</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <UserIcon size={20} color={theme.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.name}
                  onChangeText={t => setFormData({...formData, name: t})}
                  placeholder="Nome completo"
                  placeholderTextColor={theme.subtext}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.subtext }]}>Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Mail size={20} color={theme.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.email}
                  onChangeText={t => setFormData({...formData, email: t})}
                  placeholder="email@exemplo.com"
                  placeholderTextColor={theme.subtext}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {!user && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.subtext }]}>Senha</Text>
                <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                  <Key size={20} color={theme.subtext} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={formData.password}
                    onChangeText={t => setFormData({...formData, password: t})}
                    placeholder="Senha inicial"
                    placeholderTextColor={theme.subtext}
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
              <Text style={[styles.label, { color: theme.subtext }]}>Cargo / Função</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Shield size={20} color={theme.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.profile}
                  onChangeText={t => setFormData({...formData, profile: t})}
                  placeholder="Ex: Suporte Técnico"
                  placeholderTextColor={theme.subtext}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.subtext }]}>Departamento</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Building size={20} color={theme.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.department}
                  onChangeText={t => setFormData({...formData, department: t})}
                  placeholder="Departamento"
                  placeholderTextColor={theme.subtext}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.subtext }]}>Telefone</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Phone size={20} color={theme.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.phone}
                  onChangeText={t => setFormData({...formData, phone: t})}
                  placeholder="(00) 00000-0000"
                  placeholderTextColor={theme.subtext}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {canEditLocation ? (
              <>
                <CustomPicker
                  label="UF"
                  value={formData.uf}
                  options={estados.map(estado => ({
                    label: `${estado.sigla} - ${estado.nome}`,
                    value: estado.sigla,
                  }))}
                  onSelect={(value) => {
                    setFormData(prev => ({ ...prev, uf: value, municipality: '' }));
                    clearMunicipios();
                    fetchMunicipios(value);
                  }}
                  placeholder={loadingEstados ? 'Carregando estados...' : 'Selecione o estado'}
                  disabled={loadingEstados || !!loading}
                />

                <CustomPicker
                  label="Município"
                  value={formData.municipality}
                  options={municipios.map(municipio => ({
                    label: municipio.nome,
                    value: municipio.nome,
                  }))}
                  onSelect={(value) => setFormData(prev => ({ ...prev, municipality: value }))}
                  placeholder={
                    !formData.uf
                      ? 'Selecione primeiro o estado'
                      : loadingMunicipios
                      ? 'Carregando municípios...'
                      : 'Selecione o município'
                  }
                  disabled={!formData.uf || loadingMunicipios || !!loading}
                  searchable
                />
              </>
            ) : (
              <Text style={[styles.permissionDeniedText, { color: theme.danger }]}>
                Acesso negado: apenas perfis de suporte ou administrador podem alterar UF e Município.
              </Text>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.border }]} onPress={onClose} disabled={loading}>
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSubmit} disabled={loading}>
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
  const { theme } = useTheme();

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
        <View style={[styles.modalContent, { maxHeight: 'auto', backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Alterar Senha</Text>
            <TouchableOpacity onPress={onClose}>
              <X stroke={theme.subtext} size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.subtext }]}>Nova Senha</Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Key size={20} stroke={theme.subtext} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={theme.subtext}
                  secureTextEntry
                />
              </View>
            </View>
          </View>
          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSubmit} disabled={loading}>
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

  const canManageUsers = currentUser?.profile === 'Administrador' || currentUser?.profile === 'Líder' || currentUser?.role === 'Administrador' || currentUser?.role === 'Líder';

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
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar o usuário');
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
      fetchUsers();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o usuário');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (password: string) => {
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      await UserService.updatePassword(selectedUser.id, password);
      Alert.alert('Sucesso', 'Senha alterada com sucesso');
      setPasswordModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível alterar a senha');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (user: User) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir o usuário ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await UserService.delete(user.id);
              Alert.alert('Sucesso', 'Usuário excluído');
              fetchUsers();
            } catch (error: any) {
              const msg = error.response?.data?.message || 'Não foi possível excluir o usuário';
              Alert.alert('Erro', msg);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

    return result;
  }, [users, searchQuery, sortOrder]);

  const renderItem = ({ item }: { item: User }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
            {item.avatar ? (
                <Image source={{uri: item.avatar}} style={styles.avatar} />
            ) : (
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
            <Text style={[styles.userEmail, { color: theme.subtext }]}>{item.email}</Text>
            <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: theme.primary }]}>{item.role}</Text>
                </View>
                {item.status !== 'Ativo' && (
                    <View style={[styles.badge, { backgroundColor: theme.danger + '20' }]}>
                        <Text style={[styles.badgeText, { color: theme.danger }]}>{item.status}</Text>
                    </View>
                )}
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {canManageUsers && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.border }]}
                onPress={() => {
                  setSelectedUser(item);
                  setUserModalVisible(true);
                }}
              >
                <Edit2 stroke={theme.subtext} size={20} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.border }]}
                onPress={() => {
                  setSelectedUser(item);
                  setPasswordModalVisible(true);
                }}
              >
                <Key stroke={theme.subtext} size={20} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.border }]}
                onPress={() => handleDelete(item)}
              >
                <Trash2 stroke={theme.danger} size={20} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      <View style={[styles.cardDetails, { borderTopColor: theme.border }]}>
          <Text style={[styles.detailText, { color: theme.subtext }]}>
              <Shield size={14} color={theme.subtext} /> {item.profile}
          </Text>
          {item.department && (
              <Text style={[styles.detailText, { color: theme.subtext }]}>
                  <Building size={14} color={theme.subtext} /> {item.department}
              </Text>
          )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Gerenciar Usuários" />
      
      <View style={styles.toolbar}>
        <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
          <Search color={theme.subtext} size={20} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar usuários..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setSelectedUser(null);
            setUserModalVisible(true);
          }}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Nenhum usuário encontrado</Text>
            </View>
          ) : null
        }
      />

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
        onSubmit={handleChangePassword}
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
  toolbar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userEmail: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 6,
  },
  badges: {
      flexDirection: 'row',
      gap: 8,
  },
  badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  badgeText: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  cardDetails: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: '#374151',
      flexDirection: 'row',
      gap: 16,
  },
  detailText: {
      color: '#9ca3af',
      fontSize: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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
  row: {
      flexDirection: 'row',
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
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
  cancelButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionDeniedText: {
    color: '#f97373',
    fontSize: 13,
    marginTop: 8,
  },
});
