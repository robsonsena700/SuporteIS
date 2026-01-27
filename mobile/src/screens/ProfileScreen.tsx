import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image, ActivityIndicator, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { UserService } from '../services/userService';
import { LogOut, Camera, User as UserIcon, Phone, Briefcase, Mail, Shield, Building, Save, Settings } from 'lucide-react-native';
import { Header } from '../components/Header';
import * as ImagePicker from 'expo-image-picker';
import { CustomPicker } from '../components/CustomPicker';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../context/ThemeContext';

export const ProfileScreen = () => {
  const { user, signOut, updateUser } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const navigation = useNavigation<any>();
  const { responsiveValue } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    avatar: ''
  });

  const DEPARTMENT_OPTIONS = [
    { label: 'Suporte Técnico TI', value: 'Suporte Técnico TI' },
    { label: 'Cliente', value: 'Cliente' },
    { label: 'Manutenção Geral', value: 'Manutenção Geral' },
    { label: 'Operações', value: 'Operações' },
    { label: 'Administrativo', value: 'Administrativo' },
  ];

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const avatarSize = responsiveValue(120, 140);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permissão negada', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData(prev => ({ ...prev, avatar: base64Image }));
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const handleUpdate = async () => {
    if (!user) return;
    
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'O nome é obrigatório');
      return;
    }

    try {
      setLoading(true);
      const updatedData = {
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        avatar: formData.avatar
      };

      await UserService.updateProfile(updatedData);
      await updateUser(updatedData);
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut }
      ]
    );
  };

  return (
    <View style={[profileStyles.container, { backgroundColor: theme.background }]}>
      <Header title="Perfil" />
      
      <ScrollView contentContainerStyle={profileStyles.scrollContent}>
        <View style={profileStyles.pageHeader}>
          <Text style={[profileStyles.pageTitle, { color: theme.text }]}>Ajustes de Perfil</Text>
          <Text style={[profileStyles.pageSubtitle, { color: theme.subtext }]}>
            Gerencie suas informações pessoais e preferências de conta.
          </Text>
        </View>

        <View style={profileStyles.avatarSection}>
          <View style={profileStyles.avatarContainer}>
            {formData.avatar ? (
              <Image
                source={{ uri: formData.avatar }}
                style={[profileStyles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, borderColor: theme.border }]}
              />
            ) : (
              <View style={[profileStyles.avatarPlaceholder, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <UserIcon size={40} color={theme.subtext} />
              </View>
            )}
            <TouchableOpacity style={[profileStyles.cameraButton, { borderColor: theme.background }]} onPress={handlePickImage}>
              <Camera size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[profileStyles.profileName, { color: theme.text }]}>{user?.name}</Text>
          <Text style={profileStyles.profileRole}>{user?.profile}</Text>
          <Text style={[profileStyles.profileEmail, { color: theme.subtext }]}>
            {user?.email} {user?.id ? `• ID: #${user.id.substring(0, 5)}` : ''}
          </Text>
          <View style={profileStyles.avatarActions}>
            <TouchableOpacity style={[profileStyles.avatarActionPrimary, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handlePickImage}>
              <Camera size={18} color={theme.text} />
              <Text style={[profileStyles.avatarActionPrimaryText, { color: theme.text }]}>Alterar Foto</Text>
            </TouchableOpacity>
            {formData.avatar ? (
              <TouchableOpacity style={profileStyles.avatarActionSecondary} onPress={handleRemovePhoto}>
                <Text style={profileStyles.avatarActionSecondaryText}>Remover</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={profileStyles.formSection}>
          <Text style={[profileStyles.sectionTitle, { color: theme.text }]}>Informações Pessoais</Text>
          
          <View style={profileStyles.inputGroup}>
            <Text style={[profileStyles.label, { color: theme.subtext }]}>Nome</Text>
            <View style={[profileStyles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <UserIcon size={20} color={theme.subtext} style={profileStyles.inputIcon} />
              <TextInput
                style={[profileStyles.input, { color: theme.text }]}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Seu nome"
                placeholderTextColor={theme.subtext}
              />
            </View>
          </View>

          <View style={profileStyles.inputGroup}>
            <Text style={[profileStyles.label, { color: theme.subtext }]}>Email</Text>
            <View style={[profileStyles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Mail size={20} color={theme.subtext} style={profileStyles.inputIcon} />
              <TextInput
                style={[profileStyles.inputReadonly, { color: theme.subtext }]}
                value={user?.email || ''}
                editable={false}
                placeholderTextColor={theme.subtext}
              />
            </View>
          </View>

          <View style={profileStyles.inputGroup}>
            <Text style={[profileStyles.label, { color: theme.subtext }]}>Telefone / WhatsApp</Text>
            <View style={[profileStyles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Phone size={20} color={theme.subtext} style={profileStyles.inputIcon} />
              <TextInput
                style={[profileStyles.input, { color: theme.text }]}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={theme.subtext}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={profileStyles.inputGroup}>
            <Text style={[profileStyles.label, { color: theme.subtext }]}>Cliente / Empresa</Text>
            <View style={[profileStyles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
              <Building size={20} color={theme.subtext} style={profileStyles.inputIcon} />
              <TextInput
                style={[profileStyles.inputReadonly, { color: theme.subtext }]}
                value={user?.company || ''}
                editable={false}
                placeholderTextColor={theme.subtext}
              />
            </View>
          </View>
        </View>

        {user?.profile !== 'Cliente' && (
          <View style={profileStyles.formSection}>
            <Text style={[profileStyles.sectionTitle, { color: theme.text }]}>Dados do Sistema</Text>

            <View style={profileStyles.inputGroup}>
              <Text style={[profileStyles.label, { color: theme.subtext }]}>Cargo / Função</Text>
              <View style={[profileStyles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Briefcase size={20} color={theme.subtext} style={profileStyles.inputIcon} />
                <TextInput
                  style={[profileStyles.inputReadonly, { color: theme.subtext }]}
                  value={user?.role || ''}
                  editable={false}
                  placeholderTextColor={theme.subtext}
                />
              </View>
            </View>

            <View style={profileStyles.inputGroup}>
              <CustomPicker
                label="Departamento"
                value={formData.department}
                options={DEPARTMENT_OPTIONS}
                onSelect={(value) => setFormData(prev => ({ ...prev, department: value }))}
                placeholder="Selecione..."
                disabled={user?.role === 'Cliente'}
              />
            </View>

            <View style={profileStyles.inputGroup}>
              <Text style={[profileStyles.label, { color: theme.subtext }]}>Perfil de Acesso</Text>
              <View style={[profileStyles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Shield size={20} color={theme.subtext} style={profileStyles.inputIcon} />
                <TextInput
                  style={[profileStyles.inputReadonly, { color: theme.subtext }]}
                  value={user?.profile || ''}
                  editable={false}
                  placeholderTextColor={theme.subtext}
                />
              </View>
            </View>
          </View>
        )}

        <View style={profileStyles.formSection}>
          <Text style={[profileStyles.sectionTitle, { color: theme.text }]}>Preferências</Text>
          
          <View style={profileStyles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.inputBg, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.inputBorder }}>
              <View style={{ gap: 4 }}>
                 <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Modo Escuro</Text>
                 <Text style={{ color: theme.subtext, fontSize: 12 }}>{mode === 'dark' ? 'Ativado' : 'Desativado'}</Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: theme.primary }}
                thumbColor={"#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={(val) => setMode(val ? 'dark' : 'light')}
                value={mode === 'dark'}
              />
            </View>
          </View>
        </View>

        <View style={profileStyles.actionsRow}>
          <TouchableOpacity
            style={[profileStyles.cancelButton, { borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Cancelar alterações de perfil"
          >
            <Text style={[profileStyles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[profileStyles.saveButton, { backgroundColor: theme.primary }]}
            onPress={handleUpdate}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Salvar alterações de perfil"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={profileStyles.saveButtonText}>Salvar Alterações</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={profileStyles.logoutButton} onPress={confirmSignOut}>
          <LogOut color="#ef4444" size={20} />
          <Text style={profileStyles.logoutText}>Sair do Sistema</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#374151',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#374151',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#111827',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  profileEmail: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 8,
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  avatarActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    gap: 6,
  },
  avatarActionPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarActionSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  avatarActionSecondaryText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  formSection: {
    marginBottom: 32,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
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
  inputReadonly: {
    flex: 1,
    height: 48,
    color: '#9ca3af',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
