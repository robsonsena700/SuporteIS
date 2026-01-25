import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform, Image, DimensionValue, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Paperclip, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/api';
import { CustomPicker } from '../components/CustomPicker';
import { TicketPriority, User } from '../types';
import { useResponsive } from '../hooks/useResponsive';
import { useLocationIBGE } from '../hooks/useLocationIBGE';

const EQUIPMENT_OPTIONS = [
  'CPU', 'Memória', 'HD (disco rígido)', 'Fonte / Carregador', 'Placa mãe', 
  'Monitor', 'Teclado', 'Mouse', 'Rede', 'Tablet', 'Celular', 
  'Rede (Wi-fi / Roteador / Switch, etc)', 'Roteador', 
  'Impressora Zebra / Laser / Tinta', 'Impressora Reposição / Troca de tonner ou tinta', 
  'TV Painel', 'Cabo de força', 'Formatação', 'Instalação', 'SO', 
  'Virus / Malware', 'Recuperação de dados', 'Outros'
];

export const NewTicketScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const isClient = user?.profile === 'Cliente';
  const [loading, setLoading] = useState(false);
  const [ticketType, setTicketType] = useState<'Sistema' | 'Equipamento'>('Sistema');
  const [clientUsers, setClientUsers] = useState<User[]>([]);
  
  const [attachments, setAttachments] = useState<{data: string, name: string}[]>([]);
  
  const [formData, setFormData] = useState({
    subject: '',
    equipment: '',
    otherEquipment: '',
    clientName: '',
    unit: '',
    municipality: '',
    uf: '',
    priority: TicketPriority.MEDIUM,
    description: '',
  });

  const { isTablet, isLandscape } = useResponsive();
  const isWide = isTablet || isLandscape;
  const halfWidth: ViewStyle = { width: isWide ? '48%' : '100%' };

  const { estados, municipios, loadingEstados, loadingMunicipios, fetchMunicipios, clearMunicipios } = useLocationIBGE();

  useEffect(() => {
    if (!user) return;

    setFormData(prev => ({
      ...prev,
      clientName: user.profile === 'Cliente' ? user.name : (prev.clientName || user.name),
      unit: user.company || prev.unit,
      municipality: user.municipality || prev.municipality,
      uf: user.uf || prev.uf,
    }));

    if (user.profile === 'Suporte Técnico' || user.profile === 'Administrador') {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/users');
      // Assuming API returns array of users directly or inside data
      const users: User[] = Array.isArray(response.data) ? response.data : response.data.users || [];
      const clients = users.filter(u => u.profile === 'Cliente');
      setClientUsers(clients);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const handleClientChange = (clientName: string) => {
    const selectedUser = clientUsers.find(u => u.name === clientName);
    if (selectedUser) {
        setFormData(prev => ({
            ...prev,
            clientName: clientName,
            unit: selectedUser.company || prev.unit,
            municipality: selectedUser.municipality || prev.municipality,
            uf: selectedUser.uf || prev.uf
        }));
        if (selectedUser.uf) {
          clearMunicipios();
          fetchMunicipios(selectedUser.uf);
        }
    } else {
        setFormData(prev => ({ ...prev, clientName: clientName }));
    }
  };

  const handleAttachment = async () => {
    if (attachments.length >= 3) {
      Alert.alert('Aviso', 'Máximo de 3 anexos permitidos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const asset = result.assets[0];
        const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        setAttachments(prev => [...prev, { 
          data: base64Data, 
          name: asset.fileName || `image_${Date.now()}.jpg` 
        }]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Verifique as permissões.');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.description) {
      Alert.alert('Erro', 'Por favor, descreva o problema.');
      return;
    }

    if (!formData.clientName || !formData.unit || !formData.municipality || !formData.uf) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios de localização/cliente.');
      return;
    }
    
    if (attachments.length === 0) {
      Alert.alert('Erro', 'É obrigatório incluir pelo menos 1 anexo.');
      return;
    }

    setLoading(true);

    try {
      let finalEquipment = formData.equipment;
      if (ticketType === 'Equipamento') {
          if (formData.equipment === 'Outros') {
              if (!formData.otherEquipment) {
                  Alert.alert('Erro', 'Por favor, especifique o equipamento.');
                  setLoading(false);
                  return;
              }
              finalEquipment = `Outros: ${formData.otherEquipment}`;
          }
      } else {
          finalEquipment = 'Sistema';
      }

      const attachmentPayload = JSON.stringify(attachments);

      const apiPayload = {
        subject: formData.subject,
        description: formData.description,
        equipment: finalEquipment,
        client_name: formData.clientName,
        unit: formData.unit,
        municipality: formData.municipality,
        uf: formData.uf,
        priority: formData.priority,
        status: 'Aberto',
        attachment: attachmentPayload,
        equipmentDetails: {
            model: finalEquipment,
            serialNumber: '',
            warranty: ''
        }
      };

      await api.post('/tickets', apiPayload);
      Alert.alert('Sucesso', 'Chamado criado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Erro ao criar chamado.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Chamado</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {/* Ticket Type */}
          <View style={[styles.typeContainer, { width: '100%' }]}>
            <TouchableOpacity 
              style={[styles.typeButton, ticketType === 'Sistema' && styles.typeButtonActive]}
              onPress={() => setTicketType('Sistema')}
            >
              <Text style={[styles.typeText, ticketType === 'Sistema' && styles.typeTextActive]}>Serviço</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, ticketType === 'Equipamento' && styles.typeButtonActive]}
              onPress={() => setTicketType('Equipamento')}
            >
              <Text style={[styles.typeText, ticketType === 'Equipamento' && styles.typeTextActive]}>Equipamento</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={[styles.inputGroup, { width: '100%' }]}>
            <Text style={styles.label}>Assunto</Text>
            <TextInput
              style={styles.input}
              value={formData.subject}
              onChangeText={(text) => setFormData(prev => ({ ...prev, subject: text }))}
              placeholder="Resumo do problema"
              placeholderTextColor="#6b7280"
            />
          </View>

          {ticketType === 'Equipamento' && (
            <>
              <CustomPicker
                label="Equipamento"
                value={formData.equipment}
                options={EQUIPMENT_OPTIONS.map(opt => ({ label: opt, value: opt }))}
                onSelect={(val) => setFormData(prev => ({ ...prev, equipment: val }))}
                containerStyle={halfWidth}
              />
              {formData.equipment === 'Outros' && (
                <View style={[styles.inputGroup, halfWidth]}>
                  <Text style={styles.label}>Especifique</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.otherEquipment}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, otherEquipment: text }))}
                    placeholder="Qual equipamento?"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              )}
            </>
          )}

          {/* Client Selection (Admin/Support) or Readonly (Client) */}
          {user?.profile === 'Cliente' ? (
            <View style={[styles.inputGroup, halfWidth]}>
              <Text style={styles.label}>Cliente</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={formData.clientName}
                editable={false}
              />
            </View>
          ) : (
            <CustomPicker
              label="Cliente"
              value={formData.clientName}
              options={clientUsers.map(u => ({ label: u.name, value: u.name }))}
              onSelect={handleClientChange}
              containerStyle={halfWidth}
            />
          )}

          <View style={[styles.inputGroup, halfWidth]}>
            <Text style={styles.label}>Unidade</Text>
            <TextInput
              style={[styles.input, isClient && styles.disabledInput]}
              value={formData.unit}
              onChangeText={(text) => setFormData(prev => ({ ...prev, unit: text }))}
              editable={!isClient}
            />
          </View>

          {isClient ? (
            <>
              <View style={[styles.inputGroup, halfWidth]}>
                <Text style={styles.label}>Município</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.municipality}
                  editable={false}
                />
              </View>

              <View style={[styles.inputGroup, halfWidth]}>
                <Text style={styles.label}>UF</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={formData.uf}
                  editable={false}
                />
              </View>
            </>
          ) : (
            <>
              <CustomPicker
                label="Estado (UF)"
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
                disabled={loadingEstados || loading}
                containerStyle={halfWidth}
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
                disabled={!formData.uf || loadingMunicipios || loading}
                searchable
                containerStyle={halfWidth}
              />
            </>
          )}
          
          <CustomPicker
            label="Prioridade"
            value={formData.priority}
            options={[
              { label: 'Baixa', value: TicketPriority.LOW },
              { label: 'Média', value: TicketPriority.MEDIUM },
              { label: 'Alta', value: TicketPriority.HIGH },
              { label: 'Crítica', value: TicketPriority.CRITICAL },
            ]}
            onSelect={(val) => setFormData(prev => ({ ...prev, priority: val as TicketPriority }))}
            containerStyle={halfWidth}
          />

          <View style={[styles.inputGroup, { width: '100%' }]}>
            <Text style={styles.label}>Descrição Detalhada</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
              placeholder="Descreva o problema com detalhes..."
              placeholderTextColor="#6b7280"
              textAlignVertical="top"
            />
          </View>

          {/* Attachments */}
          <View style={[styles.inputGroup, { width: '100%' }]}>
            <Text style={styles.label}>Anexos (Máx 3)</Text>
            <TouchableOpacity style={styles.attachButton} onPress={handleAttachment}>
              <Paperclip size={20} color="#3b82f6" />
              <Text style={styles.attachButtonText}>Adicionar Foto/Arquivo</Text>
            </TouchableOpacity>

            <View style={styles.attachmentsList}>
              {attachments.map((att, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Image source={{ uri: att.data }} style={styles.attachmentThumb} />
                  <TouchableOpacity 
                    style={styles.removeAttachment}
                    onPress={() => removeAttachment(index)}
                  >
                    <X size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, { width: '100%' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Criar Chamado</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
  },
  typeText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#9ca3af',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    color: '#fff',
    fontSize: 16,
  },
  disabledInput: {
    opacity: 0.6,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 56,
    gap: 8,
  },
  attachButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  attachmentsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  attachmentItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  attachmentThumb: {
    width: '100%',
    height: '100%',
  },
  removeAttachment: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
