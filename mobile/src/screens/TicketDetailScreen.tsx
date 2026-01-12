import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList, ViewStyle, DimensionValue } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Send, Clock, User as UserIcon, MoreVertical, Edit2, CheckCircle, UserPlus, FileText, History as HistoryIcon } from 'lucide-react-native';
import { TicketService } from '../services/ticketService';
import { Ticket, TicketStatus, TicketPriority, TicketHistory } from '../types';
import { useAuth } from '../auth/AuthContext';
import { CustomPicker } from '../components/CustomPicker';
import { RatingModal } from '../components/RatingModal';
import { useResponsive } from '../hooks/useResponsive';

type RootStackParamList = {
  TicketDetail: { ticketId: string };
};

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;
type TicketDetailNavigationProp = StackNavigationProp<RootStackParamList>;

export const TicketDetailScreen = () => {
  const navigation = useNavigation<TicketDetailNavigationProp>();
  const route = useRoute<TicketDetailRouteProp>();
  const { ticketId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, screenWidth } = useResponsive();
  const isWide = isTablet || isLandscape;
  const halfWidth: ViewStyle = { width: isWide ? '48%' : '100%' };

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'details' | 'history'>('messages');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // History
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Ticket>>({});

  // Rating
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    if (activeTab === 'history' && ticket) {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchTicket = async () => {
    try {
      const data = await TicketService.getById(ticketId);
      setTicket(data);
      if (!isEditing) {
        setEditForm({
            priority: data.priority,
            status: data.status,
            equipment: data.equipment // simplistic mapping
        });
      }
    } catch (error) {
      console.error('Failed to load ticket', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
        const data = await TicketService.getHistory(ticketId);
        setHistory(data);
    } catch (error) {
        console.error('Failed to load history', error);
    } finally {
        setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!replyText.trim()) return;

    setSending(true);
    try {
      await TicketService.addMessage(ticketId, replyText);
      setReplyText('');
      await fetchTicket();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleUpdate = async () => {
    if (!ticket) return;
    
    try {
        await TicketService.update(ticket.id, editForm);
        setIsEditing(false);
        fetchTicket();
        Alert.alert('Sucesso', 'Chamado atualizado');
    } catch (error) {
        Alert.alert('Erro', 'Falha ao atualizar chamado');
    }
  };

  const handleTakeTicket = async () => {
      if (!user || !ticket) return;
      try {
          await TicketService.update(ticket.id, { technicianId: user.id });
          await fetchTicket();
          Alert.alert('Sucesso', 'Chamado atribuído a você.');
      } catch (error) {
          Alert.alert('Erro', 'Falha ao assumir chamado.');
      }
  };

  const handleResolvePress = () => {
      if (!ticket || !user) return;

      if (!ticket.technicianId) {
          Alert.alert('Aviso', 'Não é possível encerrar o chamado sem um Responsável Técnico definido.');
          return;
      }

      const isCreator = user.id === ticket.creatorId;
      
      if (isCreator) {
          setShowRatingModal(true);
      } else {
          Alert.alert(
              'Confirmar Resolução',
              'Deseja realmente marcar este chamado como resolvido? O solicitante será notificado.',
              [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Resolver', onPress: () => confirmResolution() }
              ]
          );
      }
  };

  const confirmResolution = async (rating?: number, feedback?: string) => {
      if (!ticket) return;
      setResolving(true);
      try {
          const updateData: any = { status: TicketStatus.RESOLVED };
          if (rating) updateData.rating = rating;
          if (feedback) updateData.feedback = feedback;

          await TicketService.update(ticket.id, updateData);
          setShowRatingModal(false);
          await fetchTicket();
          Alert.alert('Sucesso', 'Chamado resolvido com sucesso!');
      } catch (error) {
          Alert.alert('Erro', 'Falha ao resolver chamado.');
      } finally {
          setResolving(false);
      }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return '#3b82f6';
      case TicketStatus.IN_ANALYSIS: return '#f59e0b';
      case TicketStatus.IN_PROGRESS: return '#8b5cf6';
      case TicketStatus.RESOLVED: return '#10b981';
      default: return '#9ca3af';
    }
  };

  if (loading && !ticket) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!ticket) {
    return (
        <View style={[styles.container, styles.center]}>
            <Text style={{color: '#fff'}}>Chamado não encontrado</Text>
        </View>
    )
  }

  const canEdit = user?.profile === 'Administrador' || user?.profile === 'Suporte Técnico';
  const isTechnician = user?.profile === 'Suporte Técnico' || user?.profile === 'Administrador';
  const isUnassigned = !ticket.technicianId;
  const isResolved = ticket.status === TicketStatus.RESOLVED;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{ticket.code || 'Chamado'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>{ticket.status}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
            {/* Take Ticket Button */}
            {isTechnician && isUnassigned && !isResolved && (
                <TouchableOpacity onPress={handleTakeTicket} style={styles.actionButton}>
                    <UserPlus color="#3b82f6" size={22} />
                </TouchableOpacity>
            )}

            {/* Resolve Button */}
            {!isResolved && (
                <TouchableOpacity onPress={handleResolvePress} style={styles.actionButton}>
                    <CheckCircle color="#10b981" size={22} />
                </TouchableOpacity>
            )}

            {/* Edit Button */}
            {canEdit && !isResolved && (
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.actionButton}>
                    <Edit2 color={isEditing ? "#3b82f6" : "#fff"} size={22} />
                </TouchableOpacity>
            )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Mensagens</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Detalhes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom }]}>
        {activeTab === 'messages' ? (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ flex: 1 }}
          >
            <FlatList
              ref={flatListRef}
              data={ticket.messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              renderItem={({ item }) => {
                const isMe = item.senderId === user?.id;
                return (
                  <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.otherMessage]}>
                    <View style={styles.messageHeader}>
                        <Text style={styles.senderName}>{item.senderName}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                    </View>
                    <Text style={styles.messageText}>{item.content}</Text>
                  </View>
                );
              }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />
            
            {!isResolved && (
                <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Digite sua resposta..."
                    placeholderTextColor="#6b7280"
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendButton, !replyText.trim() && styles.disabledSend]} 
                    onPress={handleSend}
                    disabled={!replyText.trim() || sending}
                >
                    {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={20} />}
                </TouchableOpacity>
                </View>
            )}
          </KeyboardAvoidingView>
        ) : activeTab === 'details' ? (
          <ScrollView contentContainerStyle={styles.detailsContent}>
            {isEditing && canEdit ? (
                 <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                     <Text style={[styles.sectionTitle, { width: '100%' }]}>Editar Chamado</Text>
                     <CustomPicker
                        label="Status"
                        value={editForm.status || ticket.status}
                        options={[
                            { label: 'Aberto', value: TicketStatus.OPEN },
                            { label: 'Em Análise', value: TicketStatus.IN_ANALYSIS },
                            { label: 'Em Andamento', value: TicketStatus.IN_PROGRESS },
                            { label: 'Resolvido', value: TicketStatus.RESOLVED },
                        ]}
                        onSelect={(val) => setEditForm(prev => ({...prev, status: val as TicketStatus}))}
                        containerStyle={halfWidth}
                     />
                     <CustomPicker
                        label="Prioridade"
                        value={editForm.priority || ticket.priority}
                        options={[
                            { label: 'Baixa', value: TicketPriority.LOW },
                            { label: 'Média', value: TicketPriority.MEDIUM },
                            { label: 'Alta', value: TicketPriority.HIGH },
                            { label: 'Crítica', value: TicketPriority.CRITICAL },
                        ]}
                        onSelect={(val) => setEditForm(prev => ({...prev, priority: val as TicketPriority}))}
                        containerStyle={halfWidth}
                     />
                     <TouchableOpacity style={[styles.saveButton, { width: '100%' }]} onPress={handleUpdate}>
                         <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                     </TouchableOpacity>
                 </View>
            ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: isWide ? 0 : 20 }}>
                    <View style={[styles.detailItem, { width: '100%', marginBottom: isWide ? 16 : 0 }]}>
                    <Text style={styles.detailLabel}>Assunto</Text>
                    <Text style={styles.detailValue}>{ticket.subject}</Text>
                    </View>
                    
                    <View style={[styles.detailItem, { width: '100%', marginBottom: isWide ? 16 : 0 }]}>
                    <Text style={styles.detailLabel}>Descrição</Text>
                    <Text style={styles.detailValue}>{ticket.description}</Text>
                    </View>

                    <View style={[styles.detailItem, halfWidth, { marginBottom: isWide ? 16 : 0 }]}>
                        <Text style={styles.detailLabel}>Equipamento</Text>
                        <Text style={styles.detailValue}>{ticket.equipment}</Text>
                    </View>
                    <View style={[styles.detailItem, halfWidth, { marginBottom: isWide ? 16 : 0 }]}>
                        <Text style={styles.detailLabel}>Prioridade</Text>
                        <Text style={[styles.detailValue, {color: ticket.priority === 'Crítica' ? '#ef4444' : '#fff'}]}>
                            {ticket.priority}
                        </Text>
                    </View>

                    <View style={[styles.detailItem, halfWidth, { marginBottom: isWide ? 16 : 0 }]}>
                        <Text style={styles.detailLabel}>Cliente</Text>
                        <Text style={styles.detailValue}>{ticket.clientName} - {ticket.unit}</Text>
                    </View>

                    <View style={[styles.detailItem, halfWidth]}>
                        <Text style={styles.detailLabel}>Localização</Text>
                        <Text style={styles.detailValue}>{ticket.municipality} - {ticket.uf}</Text>
                    </View>

                    {ticket.technician && (
                        <View style={[styles.detailItem, { width: '100%', marginTop: 16 }]}>
                            <Text style={styles.detailLabel}>Técnico Responsável</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                                    <UserIcon size={20} color="#9ca3af" />
                                </View>
                                <Text style={styles.detailValue}>{ticket.technician}</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
          </ScrollView>
        ) : (
            <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.historyList}
                renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                        <View style={styles.historyIconContainer}>
                            <HistoryIcon size={16} color="#9ca3af" />
                        </View>
                        <View style={styles.historyContent}>
                            <Text style={styles.historyText}>{item.details || `Alteração de ${item.changeType}`}</Text>
                            <Text style={styles.historyTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyHistory}>
                        <Text style={styles.emptyHistoryText}>Nenhum histórico disponível.</Text>
                    </View>
                }
            />
        )}
      </View>

      <RatingModal 
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={confirmResolution}
        loading={resolving}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
      flexDirection: 'row',
      gap: 12,
  },
  actionButton: {
      padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    gap: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#3b82f6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  otherMessage: {
    backgroundColor: '#374151',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  messageText: {
    color: '#fff',
  },
  inputContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    backgroundColor: '#111827',
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSend: {
    backgroundColor: '#374151',
  },
  detailsContent: {
    padding: 24,
  },
  detailItem: {
    marginBottom: 24,
  },
  detailLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 16,
  },
  saveButton: {
      backgroundColor: '#3b82f6',
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 16,
  },
  saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  },
  historyList: {
      padding: 16,
  },
  historyItem: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
  },
  historyIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#1f2937',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#374151',
  },
  historyContent: {
      flex: 1,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#1f2937',
  },
  historyText: {
      color: '#fff',
      fontSize: 14,
      marginBottom: 4,
  },
  historyTime: {
      color: '#9ca3af',
      fontSize: 12,
  },
  emptyHistory: {
      alignItems: 'center',
      marginTop: 40,
  },
  emptyHistoryText: {
      color: '#6b7280',
  }
});
