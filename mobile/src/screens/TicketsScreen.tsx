import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, Alert, Modal } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api/api';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Filter, AlertCircle, RefreshCw, X, Calendar, User as UserIcon } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { StackNavigationProp } from '@react-navigation/stack';
import { Header } from '../components/Header';
import { TicketCard } from '../components/TicketCard';
import { Tabs } from '../components/Tabs';

type RootStackParamList = {
  TicketDetail: { ticketId: string };
  NewTicket: undefined;
};

type TicketsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const PRIORITY_OPTIONS = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Baixa', value: TicketPriority.LOW },
    { label: 'Média', value: TicketPriority.MEDIUM },
    { label: 'Alta', value: TicketPriority.HIGH },
    { label: 'Crítica', value: TicketPriority.CRITICAL },
];

export const TicketsScreen = () => {
  const navigation = useNavigation<TicketsScreenNavigationProp>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isTablet, isLandscape, screenWidth } = useResponsive();

  // Primary Navigation
  const [activeTab, setActiveTab] = useState('Sistema');

  // Filters
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState({
      priority: 'ALL',
      showMyTickets: false,
      sortOrder: 'desc' as 'asc' | 'desc',
      sortBy: 'date' as 'date' | 'priority'
  });
  const [appliedFilters, setAppliedFilters] = useState({
      priority: 'ALL',
      showMyTickets: false,
      sortOrder: 'desc' as 'asc' | 'desc',
      sortBy: 'date' as 'date' | 'priority'
  });

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const cardWidth = (screenWidth - 40 - (numColumns - 1) * 16) / numColumns;

  // Access Control for Rating
  const canViewRating = user?.profile === 'Administrador' || user?.profile === 'Cliente';

  const fetchTickets = useCallback(async () => {
    try {
      setError(null);
      const params: any = {};
      if (appliedFilters.showMyTickets) {
        params.myTickets = 'true';
      }

      const response = await api.get('/tickets', { params });
      
      const mappedTickets = response.data.map((data: any) => ({
          id: data.id,
          code: data.code,
          subject: data.subject,
          status: data.status,
          priority: data.priority,
          clientName: data.client_name,
          technician: data.technician_name,
          technicianId: data.technician_id,
          technicianAvatar: data.technician_avatar, 
          creatorId: data.user_id,
          creatorName: data.creator_name, 
          equipment: data.equipment,
          municipality: data.municipality,
          uf: data.uf,
          rating: data.rating,
          createdAt: data.created_at,
          createdAtIso: data.created_at,
      }));
      
      setTickets(mappedTickets);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os chamados. Verifique sua conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedFilters.showMyTickets, user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isAutoRefresh) {
      fetchTickets(); // Initial fetch when enabled
      interval = setInterval(() => {
        fetchTickets();
      }, 30000);
    }
    return () => {
      if (interval !== undefined) {
        clearInterval(interval);
      }
    };
  }, [isAutoRefresh, fetchTickets]);

  const processedTickets = useMemo(() => {
      let result = [...tickets];

      // 1. Tab Filter (Web Logic)
      if (activeTab === 'Concluído') {
          result = result.filter(t => t.status === TicketStatus.RESOLVED);
      } else {
          // Exclude resolved tickets for other tabs
          result = result.filter(t => t.status !== TicketStatus.RESOLVED);

          if (activeTab === 'Sistema') {
              const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro'];
              result = result.filter(t => {
                  const equipment = t.equipment || '';
                  const subject = t.subject || '';
                  const textToCheck = (equipment + ' ' + subject).toLowerCase();
                  return keywords.some(k => textToCheck.includes(k));
              });
          } else if (activeTab === 'Equipamento') {
              const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro'];
              result = result.filter(t => {
                  const equipment = t.equipment || '';
                  const subject = t.subject || '';
                  const textToCheck = (equipment + ' ' + subject).toLowerCase();
                  return !keywords.some(k => textToCheck.includes(k));
              });
          }
      }

      // 2. Priority Filter
      if (appliedFilters.priority !== 'ALL') {
          result = result.filter(t => t.priority === appliedFilters.priority);
      }

      // 3. My Tickets Filter
      if (appliedFilters.showMyTickets && user) {
         const isClient = user.profile === 'Cliente';
         if (isClient) {
             result = result.filter(t => t.creatorId === user.id);
         } else {
             result = result.filter(t => t.technicianId === user.id || t.creatorId === user.id);
         }
      }

      // 4. Search Filter
      if (searchQuery) {
          const lower = searchQuery.toLowerCase();
          result = result.filter(t => 
              t.subject.toLowerCase().includes(lower) || 
              (t.code && t.code.toLowerCase().includes(lower)) ||
              t.clientName.toLowerCase().includes(lower) ||
              (t.technician && t.technician.toLowerCase().includes(lower))
          );
      }

      // 5. Sorting
      return result.sort((a, b) => {
          let comparison = 0;
          if (appliedFilters.sortBy === 'priority') {
             const priorityWeight = { [TicketPriority.CRITICAL]: 4, [TicketPriority.HIGH]: 3, [TicketPriority.MEDIUM]: 2, [TicketPriority.LOW]: 1 };
             const weightA = priorityWeight[a.priority] || 0;
             const weightB = priorityWeight[b.priority] || 0;
             comparison = weightA - weightB;
          } else {
             // Date
             const dateA = new Date(a.createdAtIso || a.createdAt).getTime();
             const dateB = new Date(b.createdAtIso || b.createdAt).getTime();
             comparison = dateA - dateB;
          }
          return appliedFilters.sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [tickets, activeTab, appliedFilters, searchQuery, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const applyFilters = () => {
      setAppliedFilters(tempFilters);
      setFilterModalVisible(false);
  };

  const resetFilters = () => {
      const resetState = {
          priority: 'ALL',
          showMyTickets: false,
          sortOrder: 'desc' as 'asc' | 'desc',
          sortBy: 'date' as 'date' | 'priority'
      };
      setTempFilters(resetState);
      setAppliedFilters(resetState);
      setFilterModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title="Central de Atendimento" 
        rightAction={
          <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.primary }]} 
              onPress={() => navigation.navigate('NewTicket')}
          >
              <Plus color="#fff" size={24} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
          <Tabs 
             tabs={['Sistema', 'Equipamento', 'Concluído']} 
             activeTab={activeTab} 
             onTabChange={setActiveTab} 
          />

          <View style={styles.controlsContainer}>
              <View style={styles.searchRow}>
                 <View style={[styles.searchWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Search color={theme.subtext} size={18} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Buscar..."
                        placeholderTextColor={theme.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X color={theme.subtext} size={18} />
                        </TouchableOpacity>
                    )}
                 </View>
                 
                 <TouchableOpacity 
                    style={[
                        styles.iconButton, 
                        { backgroundColor: theme.card, borderColor: theme.border },
                        filterModalVisible && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => {
                        setTempFilters(appliedFilters);
                        setFilterModalVisible(true);
                    }}
                 >
                    <Filter color={filterModalVisible ? "#fff" : theme.subtext} size={20} />
                 </TouchableOpacity>
              </View>

              <View style={styles.actionsRow}>
                   {user?.profile !== 'Cliente' && (
                       <TouchableOpacity 
                            style={[
                                styles.actionButton,
                                { backgroundColor: theme.card, borderColor: theme.border }, 
                                appliedFilters.showMyTickets && { backgroundColor: theme.primary + '20', borderColor: theme.primary + '80' }
                            ]}
                            onPress={() => {
                                const newValue = !appliedFilters.showMyTickets;
                                setAppliedFilters(prev => ({ ...prev, showMyTickets: newValue }));
                                setTempFilters(prev => ({ ...prev, showMyTickets: newValue }));
                            }}
                        >
                            <UserIcon color={appliedFilters.showMyTickets ? theme.primary : theme.subtext} size={18} />
                            <Text style={[styles.actionButtonText, { color: theme.subtext }, appliedFilters.showMyTickets && { color: theme.primary }]}>
                                Meus Chamados
                            </Text>
                        </TouchableOpacity>
                   )}

                    <TouchableOpacity 
                        style={[
                            styles.actionButton,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            isAutoRefresh && { backgroundColor: theme.primary + '20', borderColor: theme.primary + '80' }
                        ]}
                        onPress={() => setIsAutoRefresh(!isAutoRefresh)}
                    >
                        <RefreshCw color={isAutoRefresh ? theme.secondary : theme.subtext} size={18} />
                        <Text style={[styles.actionButtonText, { color: theme.subtext }, isAutoRefresh && { color: theme.secondary }]}>
                            {isAutoRefresh ? 'Auto: ON' : 'Auto: OFF'}
                        </Text>
                    </TouchableOpacity>
              </View>
          </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={processedTickets}
          renderItem={({ item }) => (
            <View style={{ width: numColumns > 1 ? cardWidth : '100%', marginRight: numColumns > 1 ? 16 : 0 }}>
                <TicketCard 
                    ticket={item} 
                    onPress={(t) => navigation.navigate('TicketDetail', { ticketId: t.id })}
                    showRating={activeTab === 'Concluído' && canViewRating}
                />
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
                <View style={[styles.emptyIconBg, { backgroundColor: theme.card }]}>
                    <Search size={32} color={theme.subtext} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum chamado encontrado</Text>
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                    Tente ajustar os filtros ou busque por outro termo.
                </Text>
            </View>
          }
          numColumns={numColumns}
          key={numColumns} 
        />
      )}

       <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.modalTitle, { color: theme.text }]}>Filtrar e Ordenar</Text>
                      <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                          <X color={theme.subtext} size={24} />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalBody}>
                      <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Ordenar por</Text>
                      <View style={styles.filterOptionsRow}>
                          <TouchableOpacity 
                             style={[
                                 styles.filterOption,
                                 { backgroundColor: theme.background, borderColor: theme.border },
                                 tempFilters.sortBy === 'date' && { backgroundColor: theme.primary, borderColor: theme.primary }
                             ]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortBy: 'date' }))}
                          >
                              <Calendar size={16} color={tempFilters.sortBy === 'date' ? '#fff' : theme.subtext} />
                              <Text style={[styles.filterOptionText, { color: theme.subtext }, tempFilters.sortBy === 'date' && { color: '#fff' }]}>Data</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                             style={[
                                 styles.filterOption,
                                 { backgroundColor: theme.background, borderColor: theme.border },
                                 tempFilters.sortBy === 'priority' && { backgroundColor: theme.primary, borderColor: theme.primary }
                             ]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortBy: 'priority' }))}
                          >
                              <AlertCircle size={16} color={tempFilters.sortBy === 'priority' ? '#fff' : theme.subtext} />
                              <Text style={[styles.filterOptionText, { color: theme.subtext }, tempFilters.sortBy === 'priority' && { color: '#fff' }]}>Prioridade</Text>
                          </TouchableOpacity>
                      </View>

                      <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Ordem</Text>
                      <View style={styles.filterOptionsRow}>
                          <TouchableOpacity 
                             style={[
                                 styles.filterOption,
                                 { backgroundColor: theme.background, borderColor: theme.border },
                                 tempFilters.sortOrder === 'desc' && { backgroundColor: theme.primary, borderColor: theme.primary }
                             ]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                          >
                              <Text style={[styles.filterOptionText, { color: theme.subtext }, tempFilters.sortOrder === 'desc' && { color: '#fff' }]}>Decrescente</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                             style={[
                                 styles.filterOption,
                                 { backgroundColor: theme.background, borderColor: theme.border },
                                 tempFilters.sortOrder === 'asc' && { backgroundColor: theme.primary, borderColor: theme.primary }
                             ]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                          >
                              <Text style={[styles.filterOptionText, { color: theme.subtext }, tempFilters.sortOrder === 'asc' && { color: '#fff' }]}>Crescente</Text>
                          </TouchableOpacity>
                      </View>

                      <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Prioridade</Text>
                      <View style={styles.filterOptionsGrid}>
                          {PRIORITY_OPTIONS.map(opt => (
                              <TouchableOpacity
                                  key={opt.value}
                                  style={[
                                      styles.filterOption,
                                      { backgroundColor: theme.background, borderColor: theme.border },
                                      tempFilters.priority === opt.value && { backgroundColor: theme.primary, borderColor: theme.primary }
                                  ]}
                                  onPress={() => setTempFilters(prev => ({ ...prev, priority: opt.value }))}
                              >
                                  <Text style={[styles.filterOptionText, { color: theme.subtext }, tempFilters.priority === opt.value && { color: '#fff' }]}>{opt.label}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>
                      
                      <View style={{ height: 40 }} />
                  </ScrollView>

                  <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                      <TouchableOpacity 
                          style={[styles.resetButton, { borderColor: theme.border }]} 
                          onPress={resetFilters}
                      >
                          <Text style={[styles.resetButtonText, { color: theme.subtext }]}>Limpar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                          style={[styles.applyButton, { backgroundColor: theme.primary }]} 
                          onPress={applyFilters}
                      >
                          <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#111827',
  },
  controlsContainer: {
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#374151',
    height: 48,
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  iconButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  actionButtonTextActive: {
    color: '#3b82f6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    display: 'flex',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
  },
  filterOptionText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
