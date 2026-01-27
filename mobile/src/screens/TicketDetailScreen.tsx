import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, FlatList, ViewStyle, DimensionValue, Image, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, Send, Clock, User as UserIcon, MoreVertical, Edit2, CheckCircle, UserPlus, FileText, History as HistoryIcon, Star, Lock, Calendar, MapPin, Paperclip, Flag, Tag, AlertTriangle, MessageSquare, XCircle, Download, Smile } from 'lucide-react-native';
import { TicketService } from '../services/ticketService';
import { Ticket, TicketStatus, TicketPriority, TicketHistory } from '../types';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { CustomPicker } from '../components/CustomPicker';
import { RatingModal } from '../components/RatingModal';
import { useResponsive } from '../hooks/useResponsive';
import { Tabs } from '../components/Tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RootStackParamList = {
  TicketDetail: { ticketId: string };
};

type TicketDetailRouteProp = RouteProp<RootStackParamList, 'TicketDetail'>;
type TicketDetailNavigationProp = StackNavigationProp<RootStackParamList>;
const COMMON_EMOJIS = ["👍", "👎", "😊", "😂", "🤔", "👀", "✅", "❌", "🎉", "🔥", "❤️", "🙏", "👋", "😁", "😢", "😡", "🚀", "💻", "🐛", "🔧"];

export const TicketDetailScreen = () => {
  const navigation = useNavigation<TicketDetailNavigationProp>();
  const route = useRoute<TicketDetailRouteProp>();
  const { ticketId } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const { notifications, markAsRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape, screenWidth } = useResponsive();
  const isWide = isTablet || isLandscape;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Mensagens');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Input State
  const [inputHeight, setInputHeight] = useState(40);
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // History
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Ticket>>({});

  // Rating
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    if (!ticket) return;
    const related = notifications.filter(
      n => n.type === 'new_message' && n.referenceId === ticket.id && !n.isRead
    );
    if (related.length === 0) return;
    related.forEach(n => {
      markAsRead(n.id).catch(error => {
        console.log('Failed to mark notification as read on ticket open (mobile)', ticket.id, error);
      });
    });
  }, [ticket, notifications, markAsRead]);

  const fetchTicket = async () => {
    try {
      const data = await TicketService.getById(ticketId);
      setTicket(data);
      if (!isEditing) {
        setEditForm({
          priority: data.priority,
          status: data.status,
          equipment: data.equipment,
        });
      }
    } catch (error: any) {
      console.error('Failed to load ticket', error.message || error);
      if (error.response) {
          if (error.response.status === 403) {
              setUnauthorized(true);
          }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;

    setSending(true);
    try {
      await TicketService.addMessage(ticket.id, replyText, isInternal);
      setReplyText('');
      fetchTicket();
      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async () => {
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

  const handleResolvePress = () => {
      if (!ticket) return;
      Alert.alert(
          'Resolver Chamado',
          'Tem certeza que deseja marcar este chamado como resolvido?',
          [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Confirmar', onPress: () => confirmResolution() }
          ]
      );
  };

  const confirmResolution = async (rating?: number, feedback?: string) => {
      if (!ticket) return;
      setResolving(true);
      try {
          if (rating) {
              await TicketService.rate(ticket.id, rating, feedback || '');
          } else {
              await TicketService.updateStatus(ticket.id, TicketStatus.RESOLVED);
          }
          setShowRatingModal(false);
          fetchTicket();
          Alert.alert('Sucesso', 'Chamado resolvido com sucesso!');
          navigation.goBack();
      } catch (error) {
          Alert.alert('Erro', 'Falha ao resolver chamado');
      } finally {
          setResolving(false);
      }
  };

  const handleTakeTicket = async () => {
      if (!ticket || !user) return;
      try {
          await TicketService.update(ticket.id, { technicianId: user.id, status: TicketStatus.IN_PROGRESS });
          fetchTicket();
          Alert.alert('Sucesso', 'Chamado atribuído a você');
      } catch (error) {
          Alert.alert('Erro', 'Falha ao assumir chamado');
      }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (unauthorized) {
      return (
          <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
              <Lock size={48} color={theme.danger} />
              <Text style={{color: theme.text, marginTop: 16, fontSize: 18, fontWeight: 'bold'}}>Acesso Negado</Text>
              <Text style={{color: theme.subtext, marginTop: 8}}>Você não tem permissão para ver este chamado.</Text>
              <TouchableOpacity onPress={() => navigation.goBack()} style={{marginTop: 24, padding: 12, backgroundColor: theme.card, borderRadius: 8}}>
                  <Text style={{color: theme.text}}>Voltar</Text>
              </TouchableOpacity>
          </View>
      );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        <Text style={{color: theme.text}}>Chamado não encontrado</Text>
      </View>
    );
  }

  const isTechnician = user?.profile === 'Técnico' || user?.profile === 'Admin';
  const isCreator = user?.id === ticket.creatorId;
  const isAssignedToMe = ticket.technicianId === user?.id;
  const isUnassigned = !ticket.technicianId;
  const isResolved = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CANCELED;
  
  const allowedInternalProfiles = ['Administrador', 'Suporte Técnico', 'Líder', 'Suporte'];
  const canEdit = user && allowedInternalProfiles.includes(user.profile) && !isResolved;
  
  const canEvaluate = isCreator && isResolved && !ticket.rating;
  
  // Access Control for Rating
  const canViewRating = user?.profile === 'Administrador' || user?.profile === 'Cliente';

  const getStatusColor = (status: TicketStatus) => {
      switch (status) {
          case TicketStatus.OPEN: return '#3b82f6';
          case TicketStatus.IN_ANALYSIS: return '#8b5cf6';
          case TicketStatus.IN_PROGRESS: return '#eab308';
          case TicketStatus.RESOLVED: return '#10b981';
          case TicketStatus.CANCELED: return '#ef4444';
          default: return '#9ca3af';
      }
  };

  const getHistoryColor = (type: string) => {
      switch (type) {
          case 'Criação': return '#10b981';
          case 'Status': return '#3b82f6';
          case 'Mensagem': return '#8b5cf6';
          case 'Atribuição': return '#eab308';
          default: return '#9ca3af';
      }
  };

  const handleCancelTicket = () => {
      if (!ticket) return;
      Alert.alert(
          'Cancelar Chamado',
          'Tem certeza que deseja cancelar este chamado? Esta ação não pode ser desfeita.',
          [
              { text: 'Não', style: 'cancel' },
              { text: 'Sim, Cancelar', style: 'destructive', onPress: confirmCancellation }
          ]
      );
  };

  const confirmCancellation = async () => {
      if (!ticket) return;
      setResolving(true);
      try {
          await TicketService.updateStatus(ticket.id, TicketStatus.CANCELED);
          fetchTicket();
          Alert.alert('Sucesso', 'Chamado cancelado com sucesso.');
          navigation.goBack();
      } catch (error) {
           Alert.alert('Erro', 'Falha ao cancelar chamado');
      } finally {
          setResolving(false);
      }
  };

  const getPriorityColor = (priority: TicketPriority) => {
      switch (priority) {
          case TicketPriority.CRITICAL: return '#ef4444';
          case TicketPriority.HIGH: return '#f97316';
          case TicketPriority.MEDIUM: return '#eab308';
          case TicketPriority.LOW: return '#3b82f6';
          default: return '#9ca3af';
      }
  };

  const renderMessageItem = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;
    const internal = !!item.isInternal;
    const date = item.createdAt ? new Date(item.createdAt) : new Date();
    const isValidDate = !isNaN(date.getTime());

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isMe && (
          <View style={styles.messageAvatar}>
            {item.senderAvatar ? (
              <Image
                source={{ uri: item.senderAvatar }}
                style={styles.messageAvatarImage}
              />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: theme.border }]}>
                <Text style={[styles.messageAvatarInitials, { color: theme.text }]}>
                    {item.senderName?.substring(0, 2).toUpperCase() || 'US'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMe ? { backgroundColor: theme.primary, borderBottomRightRadius: 4, borderBottomLeftRadius: 16 } : { backgroundColor: theme.card },
            internal && { backgroundColor: '#451a03', borderColor: theme.warning, borderWidth: 1 },
          ]}
        >
          <View style={styles.messageHeader}>
            <View style={styles.messageHeaderLeft}>
              <Text style={[styles.senderName, { color: isMe ? '#fff' : theme.text }]}>{item.senderName}</Text>
              {internal && (
                  <View style={[styles.internalBadge, { backgroundColor: theme.warning }]}>
                      <Lock size={10} color="#000" />
                      <Text style={styles.internalText}>Interna</Text>
                  </View>
              )}
            </View>
            <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.subtext }]}>
              {isValidDate ? format(date, 'HH:mm') : ''}
            </Text>
          </View>
          <Text style={[styles.messageText, { color: isMe ? '#fff' : theme.text }]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.text} size={24} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={[styles.headerCode, { color: theme.subtext }]}>{ticket.code || `#${ticket.id.substring(0,6)}`}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
             <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>{ticket.status}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
            {isTechnician && isUnassigned && !isResolved && (
                <TouchableOpacity onPress={handleTakeTicket} style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <UserPlus color={theme.primary} size={20} />
                </TouchableOpacity>
            )}

            {canEvaluate && canViewRating ? (
                <TouchableOpacity onPress={() => setShowRatingModal(true)} style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Star color={theme.warning} size={20} />
                </TouchableOpacity>
            ) : (
                !isResolved && (
                    <TouchableOpacity onPress={handleResolvePress} style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <CheckCircle color={theme.secondary} size={20} />
                    </TouchableOpacity>
                )
            )}

            {canEdit && !isResolved && (
                <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Edit2 color={isEditing ? theme.primary : theme.text} size={20} />
                </TouchableOpacity>
            )}
        </View>
      </View>

      {/* Ticket Main Info */}
      <View style={styles.mainInfo}>
          <Text style={[styles.ticketTitle, { color: theme.text }]}>{ticket.subject}</Text>
          <View style={styles.creatorInfo}>
              <View style={[styles.avatarSmall, { backgroundColor: theme.card }]}>
                  {ticket.creatorAvatar ? (
                       <Image source={{ uri: ticket.creatorAvatar }} style={styles.avatarImage} />
                  ) : (
                       <UserIcon size={14} color={theme.subtext} />
                  )}
              </View>
              <Text style={[styles.creatorName, { color: theme.subtext }]}>{ticket.creatorName} • {format(new Date(ticket.createdAt), "dd 'de' MMM, HH:mm", { locale: ptBR })}</Text>
          </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Tabs 
            tabs={['Mensagens', 'Detalhes']} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
        />
      </View>

      <View style={styles.content}>
        {activeTab === 'Mensagens' ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <View style={{ flex: 1 }}>
                <FlatList
                  ref={flatListRef}
                  data={ticket.messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessageItem}
                  contentContainerStyle={styles.messagesList}
                  inverted={false}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
                
                {!isResolved && (
                    <View style={[styles.inputWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <View style={styles.emojiPicker}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    {COMMON_EMOJIS.map(emoji => (
                                        <TouchableOpacity 
                                            key={emoji} 
                                            onPress={() => setReplyText(prev => prev + emoji)}
                                            style={styles.emojiButton}
                                        >
                                            <Text style={styles.emojiText}>{emoji}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        <View style={[
                            styles.inputContainer, 
                            isFocused && styles.inputContainerFocused
                        ]}>
                            {isTechnician && (
                                <TouchableOpacity 
                                    style={[styles.internalToggle, isInternal && styles.internalToggleActive]}
                                    onPress={() => setIsInternal(!isInternal)}
                                    accessibilityLabel={isInternal ? "Nota interna ativada" : "Nota interna desativada"}
                                    accessibilityHint="Alterna entre mensagem pública e nota interna"
                                >
                                    <Lock size={16} color={isInternal ? '#fbbf24' : '#9ca3af'} />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity 
                                onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                                style={styles.iconButton}
                                accessibilityLabel="Inserir emoji"
                            >
                                <Smile size={20} color={showEmojiPicker ? "#3b82f6" : "#9ca3af"} />
                            </TouchableOpacity>

                            <TextInput
                                style={[
                                    styles.input, 
                                    { height: Math.min(Math.max(40, inputHeight), 120) }
                                ]}
                                placeholder={isInternal ? "Nota interna..." : "Digite sua mensagem..."}
                                placeholderTextColor="#6b7280"
                                value={replyText}
                                onChangeText={setReplyText}
                                multiline
                                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                                onFocus={() => {
                                    setIsFocused(true);
                                    setShowEmojiPicker(false);
                                }}
                                onBlur={() => setIsFocused(false)}
                                accessibilityLabel="Campo de mensagem"
                                accessibilityHint="Digite sua mensagem para o chamado"
                            />
                            
                            <TouchableOpacity 
                                style={[styles.sendButton, (!replyText.trim() || sending) && styles.sendButtonDisabled]}
                                onPress={handleSendReply}
                                disabled={!replyText.trim() || sending}
                                accessibilityLabel="Enviar mensagem"
                                accessibilityState={{ disabled: !replyText.trim() || sending }}
                            >
                                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={20} />}
                            </TouchableOpacity>
                        </View>
                        {replyText.length > 0 && (
                             <Text style={styles.charCount}>{replyText.length} caracteres</Text>
                        )}
                    </View>
                )}
            </View>
          </KeyboardAvoidingView>
        ) : activeTab === 'Detalhes' ? (
          <ScrollView style={[styles.detailsContainer, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
            {isEditing && (
                 <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Edição Rápida</Text>
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

                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSaveEdit}>
                            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* General Info Card */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                    <AlertTriangle size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Informações Gerais</Text>
                </View>
                
                <View style={[styles.infoRow, { borderBottomColor: theme.border + '50' }]}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Prioridade</Text>
                    <View style={[styles.badge, { backgroundColor: getPriorityColor(ticket.priority) + '20' }]}>
                        <Text style={[styles.badgeText, { color: getPriorityColor(ticket.priority) }]}>
                            {ticket.priority}
                        </Text>
                    </View>
                </View>

                <View style={[styles.infoRow, { borderBottomColor: theme.border + '50' }]}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Categoria</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{ticket.category || 'Geral'}</Text>
                </View>

                 <View style={[styles.infoRow, { borderBottomColor: theme.border + '50' }]}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Cliente</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{ticket.clientName || 'N/A'}</Text>
                </View>

                 <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Local</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                        <MapPin size={14} color={theme.subtext} />
                        <Text style={[styles.infoValue, { color: theme.text }]}>{ticket.municipality || 'Não informado'}</Text>
                    </View>
                </View>
            </View>

             {/* Technician Card */}
             <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                 <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                    <UserIcon size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Responsável Técnico</Text>
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    <View style={[styles.avatar, { backgroundColor: theme.border }]}>
                        {ticket.technicianAvatar ? (
                             <Image source={{ uri: ticket.technicianAvatar }} style={styles.avatarImage} />
                        ) : (
                             <UserIcon size={20} color={theme.subtext} />
                        )}
                    </View>
                    <View>
                        <Text style={[styles.infoValue, { color: theme.text }]}>{ticket.technician || 'Não atribuído'}</Text>
                        <Text style={[styles.infoLabel, { fontSize: 12, color: theme.subtext }]}>{ticket.technician ? 'Técnico Designado' : 'Aguardando atribuição'}</Text>
                    </View>
                </View>
            </View>

            {/* Equipment Card */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                 <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.iconBox, { backgroundColor: theme.border }]}>
                             <Text style={{fontSize: 16}}>🖥️</Text>
                        </View>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Equipamento</Text>
                    </View>
                </View>
                <View style={[styles.infoRow, { borderBottomColor: theme.border + '50' }]}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Modelo</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{ticket.equipment || 'N/A'}</Text>
                </View>
                 <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.infoLabel, { color: theme.subtext }]}>Serial</Text>
                    <Text style={[styles.infoValue, { color: theme.text }]}>{ticket.equipmentDetails?.serialNumber || ticket.serialNumber || 'N/A'}</Text>
                </View>
            </View>

            {/* Description Card */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                 <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                    <FileText size={18} color={theme.primary} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Descrição</Text>
                </View>
                <Text style={[styles.descriptionText, { color: theme.text }]}>{ticket.description}</Text>
            </View>

            {/* Attachments Card */}
            {ticket.attachment && (
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                        <Paperclip size={18} color={theme.primary} />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Anexo</Text>
                    </View>
                    
                    {ticket.attachment.match(/\.(jpeg|jpg|gif|png)$/i) || ticket.attachment.startsWith('data:image') ? (
                        <TouchableOpacity onPress={() => Linking.openURL(ticket.attachment!)}>
                            <Image 
                                source={{ uri: ticket.attachment }} 
                                style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 8, resizeMode: 'cover' }} 
                            />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.attachmentButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                            onPress={() => Linking.openURL(ticket.attachment!)}
                        >
                            <Download size={20} color={theme.primary} />
                            <Text style={[styles.attachmentText, { color: theme.primary }]}>Baixar Anexo</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {ticket.rating && canViewRating && (
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
                        <Star size={18} color={theme.warning} />
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Avaliação</Text>
                    </View>
                    <View style={{flexDirection:'row', marginBottom: 8}}>
                            {[1,2,3,4,5].map(s => (
                                <Text key={s} style={{fontSize: 24, color: s <= ticket.rating! ? theme.warning : theme.subtext}}>★</Text>
                            ))}
                    </View>
                    {ticket.feedback && <Text style={[styles.descriptionText, { fontStyle: 'italic', color: theme.subtext }]}>"{ticket.feedback}"</Text>}
                </View>
            )}

            {/* Cancel Button */}
            {!isResolved && ticket.status !== TicketStatus.CANCELED && (
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTicket}>
                    <XCircle size={20} color={theme.danger} />
                    <Text style={[styles.cancelButtonText, { color: theme.danger }]}>Cancelar Chamado</Text>
                </TouchableOpacity>
            )}

          </ScrollView>
        ) : (
            <ScrollView style={[styles.detailsContainer, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
             {loadingHistory ? (
                 <ActivityIndicator color={theme.primary} style={{marginTop: 20}} />
             ) : (
                 history.map((h, index) => (
                     <View key={index} style={styles.historyItem}>
                         <View style={styles.historyLeft}>
                            <View style={[styles.historyIcon, { backgroundColor: getHistoryColor(h.changeType) + '20', borderColor: theme.border }]}>
                                <HistoryIcon size={16} color={getHistoryColor(h.changeType)} />
                            </View>
                            {index < history.length - 1 && <View style={[styles.historyLine, { backgroundColor: theme.border }]} />}
                         </View>
                         <View style={[styles.historyContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
                             <View style={styles.historyHeader}>
                                 <Text style={[styles.historyUser, { color: theme.text }]}>{h.userName || 'Sistema'}</Text>
                                 <Text style={[styles.historyTime, { color: theme.subtext }]}>{format(new Date(h.createdAt), "dd/MM HH:mm", { locale: ptBR })}</Text>
                             </View>
                             <View style={[styles.historyBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '40' }]}>
                                <Text style={[styles.historyType, { color: theme.primary }]}>{h.changeType}</Text>
                             </View>
                             <Text style={[styles.historyDetails, { color: theme.text }]}>{h.details}</Text>
                         </View>
                     </View>
                 ))
             )}
          </ScrollView>
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
    backgroundColor: '#111827',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerActions: {
      flexDirection: 'row',
      gap: 8,
  },
  actionButton: {
      padding: 8,
      backgroundColor: '#1f2937',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#374151',
  },
  mainInfo: {
      paddingHorizontal: 16,
      paddingBottom: 16,
  },
  ticketTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 8,
      lineHeight: 28,
  },
  creatorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  avatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#374151',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
  },
  creatorName: {
      color: '#9ca3af',
      fontSize: 12,
  },
  content: {
    flex: 1,
    backgroundColor: '#0f141f', // Slightly darker for contrast with cards
  },
  messagesList: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '100%',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  messageAvatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
  },
  messageAvatarImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
  },
  messageAvatarInitials: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  myMessage: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 16,
  },
  otherMessage: {
    backgroundColor: '#1f2937',
  },
  internalMessage: {
    backgroundColor: '#451a03', // Dark amber
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  messageHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  internalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: '#f59e0b',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
  },
  internalText: {
      fontSize: 8,
      color: '#000',
      fontWeight: 'bold',
  },
  inputWrapper: {
    padding: 12,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputContainerFocused: {
    borderColor: '#3b82f6',
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  emojiPicker: {
    marginBottom: 12,
    height: 40,
  },
  emojiButton: {
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#374151',
      marginRight: 8,
      borderRadius: 8,
      height: 40,
      width: 40,
  },
  emojiText: {
      fontSize: 20,
  },
  iconButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
      height: 40,
      width: 40,
  },
  charCount: {
      fontSize: 10,
      color: '#6b7280',
      textAlign: 'right',
      marginTop: 4,
      marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  internalToggle: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#111827',
  },
  internalToggleActive: {
      backgroundColor: '#451a03',
      borderWidth: 1,
      borderColor: '#f59e0b',
  },
  // Details Tab Styles
  detailsContainer: {
    padding: 16,
  },
  card: {
      backgroundColor: '#1f2937',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#374151',
  },
  cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#374151',
  },
  cardTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
  },
  infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#37415150',
  },
  infoLabel: {
      color: '#9ca3af',
      fontSize: 14,
  },
  infoValue: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
  },
  badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
  },
  badgeText: {
      fontSize: 12,
      fontWeight: 'bold',
  },
  descriptionText: {
      color: '#e5e7eb',
      fontSize: 14,
      lineHeight: 22,
  },
  avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
  },
  avatarImage: {
      width: '100%',
      height: '100%',
  },
  iconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: '#374151',
      alignItems: 'center',
      justifyContent: 'center',
  },
  formSection: {
      gap: 16,
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
  attachmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      backgroundColor: '#1f2937',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#374151',
  },
  attachmentText: {
      color: '#3b82f6',
      fontWeight: 'bold',
  },
  cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 16,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
      marginBottom: 32,
  },
  cancelButtonText: {
      color: '#ef4444',
      fontWeight: 'bold',
      fontSize: 16,
  },
  // History Styles
  historyItem: {
      flexDirection: 'row',
      marginBottom: 20,
  },
  historyLeft: {
      alignItems: 'center',
      marginRight: 12,
  },
  historyIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      zIndex: 1,
  },
  historyLine: {
      flex: 1,
      width: 2,
      backgroundColor: '#1f2937',
      marginTop: 4,
  },
  historyContent: {
      flex: 1,
      backgroundColor: '#1f2937',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#374151',
  },
  historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
  },
  historyUser: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 13,
  },
  historyTime: {
      color: '#9ca3af',
      fontSize: 11,
  },
  historyBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginBottom: 6,
  },
  historyType: {
      color: '#3b82f6',
      fontSize: 10,
      fontWeight: 'bold',
  },
  historyDetails: {
      color: '#d1d5db',
      fontSize: 13,
      lineHeight: 18,
  },
});
