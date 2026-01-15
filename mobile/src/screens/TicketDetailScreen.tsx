import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList, ViewStyle, DimensionValue } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Send, Clock, User as UserIcon, MoreVertical, Edit2, CheckCircle, UserPlus, FileText, History as HistoryIcon, Star } from 'lucide-react-native';
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
    } catch (error: any) {
      console.error('Failed to load ticket', error.message || error);
      if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
      }
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
      // Auto-assign logic: If no technician and user is tech support/admin
      if (ticket && !ticket.technicianId && user && (user.profile === 'Suporte Técnico' || user.profile === 'Administrador')) {
        try {
            await TicketService.update(ticket.id, { technicianId: user.id });
        } catch (err) {
            console.error('Failed to auto-assign', err);
        }
      }

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

  const handleChangeType = () => {
    Alert.alert(
        'Confirmar Alteração',
        'Tem certeza que deseja alterar o tipo deste chamado para Equipamento (EQP)? Esta ação gerará um novo código e não pode ser desfeita.',
        [
            { text: 'Cancelar', style: 'cancel' },
            { 
                text: 'Alterar', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        await TicketService.changeType(ticketId);
                        Alert.alert('Sucesso', 'Tipo de chamado alterado com sucesso!');
                        fetchTicket();
                    } catch (error) {
                         Alert.alert('Erro', 'Falha ao alterar tipo do chamado.');
                    }
                }
            }
        ]
    );
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
      } catch (error: any) {
          console.error('Failed to resolve ticket', error?.response?.data || error);
          const message = error?.response?.data?.message || 'Falha ao resolver chamado.';
          Alert.alert('Erro', message);
      } finally {
          setResolving(false);
      }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return '#3b82f6';
      case TicketStatus.IN_ANALYSIS: return '#f59e0b';
      case TicketStatus.IN_PROGRESS: return '#8b5cf6';
      case TicketStatus.FORWARDED_ACQUISITION: return '#6366f1';
      case TicketStatus.IN_ROUTE: return '#06b6d4';
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
  const isCreator = user?.id === ticket.creatorId;
  const canEvaluate = isResolved && isCreator && !ticket.rating;

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
            {isTechnician && isUnassigned && !isResolved && (
                <TouchableOpacity onPress={handleTakeTicket} style={styles.actionButton}>
                    <UserPlus color="#3b82f6" size={22} />
                </TouchableOpacity>
            )}

            {canEvaluate ? (
                <TouchableOpacity onPress={() => setShowRatingModal(true)} style={styles.actionButton}>
                    <Star color="#fbbf24" size={22} />
                </TouchableOpacity>
            ) : (
                !isResolved && (
                    <TouchableOpacity onPress={handleResolvePress} style={styles.actionButton}>
                        <CheckCircle color="#10b981" size={22} />
                    </TouchableOpacity>
                )
            )}

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
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                      {item.content}
                    </Text>
                  </View>
                );
              }}
            />
            
            {!isResolved && (
                <>
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
                            style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]} 
                            onPress={handleSend}
                            disabled={!replyText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Send color="#fff" size={20} />
                            )}
                        </TouchableOpacity>
                    </View>
                    {user && (user.profile === 'Suporte Técnico' || user.profile === 'Administrador' || user.profile === 'Líder') && ticket.status === TicketStatus.OPEN && !ticket.code?.startsWith('EQP') && (
                        <TouchableOpacity 
                            style={[styles.saveButton, { marginTop: 16, backgroundColor: 'rgba(99, 102, 241, 0.2)', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.4)' }]} 
                            onPress={handleChangeType}
                        >
                            <Text style={[styles.saveButtonText, { color: '#818cf8' }]}>Alterar para Equipamento</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
          </KeyboardAvoidingView>
        ) : activeTab === 'details' ? (
          <ScrollView style={styles.detailsContainer}>
            {isEditing ? (
                <View style={styles.formSection}>
                    <CustomPicker
                        label="Prioridade"
                        value={editForm.priority || TicketPriority.LOW}
                        options={[
                            { label: 'Baixa', value: TicketPriority.LOW },
                            { label: 'Média', value: TicketPriority.MEDIUM },
                            { label: 'Alta', value: TicketPriority.HIGH },
                            { label: 'Crítica', value: TicketPriority.CRITICAL },
                        ]}
                        onSelect={(v) => setEditForm(p => ({...p, priority: v as TicketPriority}))}
                    />

                    <CustomPicker
                        label="Status"
                        value={editForm.status || TicketStatus.OPEN}
                        options={[
                            { label: 'Aberto', value: TicketStatus.OPEN },
                            { label: 'Em Análise', value: TicketStatus.IN_ANALYSIS },
                            { label: 'Em Andamento', value: TicketStatus.IN_PROGRESS },
                            { label: 'Encaminhado Aquisição', value: TicketStatus.FORWARDED_ACQUISITION },
                            { label: 'Em Rota', value: TicketStatus.IN_ROUTE },
                            { label: 'Resolvido', value: TicketStatus.RESOLVED },
                        ]}
                        onSelect={(v) => setEditForm(p => ({...p, status: v as TicketStatus}))}
                    />

                    <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
                        <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Equipamento:</Text>
                        <Text style={styles.infoValue}>{ticket.equipment}</Text>
                    </View>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cliente:</Text>
                        <Text style={styles.infoValue}>{ticket.clientName}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Departamento:</Text>
                        <Text style={styles.infoValue}>{ticket.municipality || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Técnico:</Text>
                        <Text style={styles.infoValue}>{ticket.technician || 'Não atribuído'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Prioridade:</Text>
                        <Text style={[styles.infoValue, { 
                            color: ticket.priority === TicketPriority.CRITICAL ? '#ef4444' : '#fff' 
                        }]}>
                            {ticket.priority === TicketPriority.CRITICAL ? 'Crítica' :
                             ticket.priority === TicketPriority.HIGH ? 'Alta' :
                             ticket.priority === TicketPriority.MEDIUM ? 'Média' : 'Baixa'}
                        </Text>
                    </View>
                </View>
            )}

            <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>Descrição do Problema</Text>
                <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>{ticket.description}</Text>
                </View>
            </View>

            {ticket.rating && (
                <View style={styles.ratingSection}>
                    <Text style={styles.ratingLabel}>Avaliação do Cliente</Text>
                    <View style={styles.ratingBox}>
                        <View style={{flexDirection:'row', marginBottom: 8}}>
                             {[1,2,3,4,5].map(s => (
                                 <Text key={s} style={{fontSize: 20, color: s <= ticket.rating! ? '#eab308' : '#4b5563'}}>★</Text>
                             ))}
                        </View>
                        {ticket.feedback && <Text style={styles.feedbackText}>{ticket.feedback}</Text>}
                    </View>
                </View>
            )}

          </ScrollView>
        ) : (
          <View style={styles.historyContainer}>
              {loadingHistory ? (
                  <ActivityIndicator color="#3b82f6" />
              ) : (
                  <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.historyItem}>
                            <View style={styles.historyIcon}>
                                <Clock size={16} color="#9ca3af" />
                            </View>
                            <View style={styles.historyContent}>
                                <Text style={styles.historyAction}>{item.changeType}</Text>
                                <Text style={styles.historyDetails}>
                                    {item.userName} • {new Date(item.createdAt).toLocaleString()}
                                </Text>
                                {item.details && <Text style={styles.historyMeta}>{item.details}</Text>}
                            </View>
                        </View>
                    )}
                  />
              )}
          </View>
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
    backgroundColor: '#111827',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
      flexDirection: 'row',
      gap: 12,
  },
  actionButton: {
      padding: 8,
      backgroundColor: '#1f2937',
      borderRadius: 8,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#9ca3af',
    fontWeight: '600',
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
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 4,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#e5e7eb',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1f2937',
    alignItems: 'flex-end',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 16,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#4b5563',
    opacity: 0.5,
  },
  detailsContainer: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  descriptionSection: {
      marginBottom: 20,
  },
  descriptionLabel: {
      color: '#9ca3af',
      fontSize: 14,
      marginBottom: 8,
      fontWeight: '500',
  },
  descriptionBox: {
      backgroundColor: '#1f2937',
      borderRadius: 16,
      padding: 16,
  },
  descriptionText: {
      color: '#e5e7eb',
      fontSize: 15,
      lineHeight: 22,
  },
  historyContainer: {
      padding: 20,
  },
  historyItem: {
      flexDirection: 'row',
      marginBottom: 24,
  },
  historyIcon: {
      marginRight: 16,
      alignItems: 'center',
  },
  historyContent: {
      flex: 1,
  },
  historyAction: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 14,
      marginBottom: 4,
  },
  historyDetails: {
      color: '#9ca3af',
      fontSize: 12,
      marginBottom: 2,
  },
  historyMeta: {
      color: '#6b7280',
      fontSize: 12,
      fontStyle: 'italic',
  },
  formSection: {
      gap: 16,
      marginBottom: 20,
  },
  saveButton: {
      backgroundColor: '#3b82f6',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 8,
  },
  saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  },
  ratingSection: {
      marginTop: 10,
  },
  ratingLabel: {
      color: '#9ca3af',
      fontSize: 14,
      marginBottom: 8,
      fontWeight: '500',
  },
  ratingBox: {
      backgroundColor: '#1f2937',
      borderRadius: 16,
      padding: 16,
  },
  feedbackText: {
      color: '#e5e7eb',
      fontStyle: 'italic',
  }
});
