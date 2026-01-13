import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { UserService } from '../services/userService';
import { LogOut, Camera, User as UserIcon, Phone, Briefcase, Mail, Shield, Building, Save } from 'lucide-react-native';
import { Header } from '../components/Header';
import * as ImagePicker from 'expo-image-picker';
import { CustomPicker } from '../components/CustomPicker';

export const ProfileScreen = () => {
  const { user, signOut, updateUser } = useAuth();
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
    <View style={profileStyles.container}>
      <Header title="Perfil" />
      
      <ScrollView contentContainerStyle={profileStyles.scrollContent}>
        {/* Avatar Section */}
        <View style={profileStyles.avatarSection}>
          <View style={profileStyles.avatarContainer}>
            {formData.avatar ? (
              <Image source={{ uri: formData.avatar }} style={profileStyles.avatar} />
            ) : (
              <View style={profileStyles.avatarPlaceholder}>
                <UserIcon size={40} color="#9ca3af" />
              </View>
            )}
            <TouchableOpacity style={profileStyles.cameraButton} onPress={handlePickImage}>
              <Camera size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={profileStyles.profileName}>{user?.name}</Text>
          <Text style={profileStyles.profileRole}>{user?.profile}</Text>
        </View>

        <View style={profileStyles.formSection}>
          <Text style={profileStyles.sectionTitle}>Informações Pessoais</Text>
          
          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Nome Completo</Text>
            <View style={profileStyles.inputContainer}>
              <UserIcon size={20} color="#6b7280" style={profileStyles.inputIcon} />
              <TextInput
                style={profileStyles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Seu nome"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          <View style={profileStyles.inputGroup}>
            <Text style={profileStyles.label}>Telefone / WhatsApp</Text>
            <View style={profileStyles.inputContainer}>
              <Phone size={20} color="#6b7280" style={profileStyles.inputIcon} />
              <TextInput
                style={profileStyles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="(00) 00000-0000"
                placeholderTextColor="#6b7280"
                keyboardType="phone-pad"
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

          <TouchableOpacity 
            style={profileStyles.saveButton}
            onPress={handleUpdate}
            disabled={loading}
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
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
