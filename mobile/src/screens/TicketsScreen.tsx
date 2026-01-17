import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, Alert, Modal } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/api';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Filter, ArrowUpDown, AlertCircle, RefreshCw, X, Check, Calendar, User as UserIcon, Monitor, Cpu } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { StackNavigationProp } from '@react-navigation/stack';
import { Header } from '../components/Header';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type RootStackParamList = {
  TicketDetail: { ticketId: string };
  NewTicket: undefined;
};

type TicketsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Unified Status Tabs
const STATUS_TABS = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Abertos', value: TicketStatus.OPEN },
    { label: 'Em Análise', value: TicketStatus.IN_ANALYSIS },
    { label: 'Em Andamento', value: TicketStatus.IN_PROGRESS },
    { label: 'Encaminhado', value: TicketStatus.FORWARDED_ACQUISITION },
    { label: 'Em Rota', value: TicketStatus.IN_ROUTE },
    { label: 'Resolvidos', value: TicketStatus.RESOLVED },
];

const PRIORITY_OPTIONS = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Baixa', value: TicketPriority.LOW },
    { label: 'Média', value: TicketPriority.MEDIUM },
    { label: 'Alta', value: TicketPriority.HIGH },
    { label: 'Crítica', value: TicketPriority.CRITICAL },
];

const TYPE_OPTIONS = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Sistema', value: 'SYSTEM' },
    { label: 'Equipamento', value: 'EQUIPMENT' },
];

export const TicketsScreen = () => {
  const navigation = useNavigation<TicketsScreenNavigationProp>();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isTablet, isLandscape, screenWidth } = useResponsive();

  // State for Filters & Tabs
  const [activeStatusTab, setActiveStatusTab] = useState('ALL'); // Primary Tab
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filters State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState({
      type: 'ALL',
      priority: 'ALL',
      showMyTickets: false,
      sortOrder: 'desc' as 'asc' | 'desc',
      sortBy: 'date' as 'date' | 'priority'
  });
  const [appliedFilters, setAppliedFilters] = useState({
      type: 'ALL',
      priority: 'ALL',
      showMyTickets: false,
      sortOrder: 'desc' as 'asc' | 'desc',
      sortBy: 'date' as 'date' | 'priority'
  });

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const cardWidth = (screenWidth - 40 - (numColumns - 1) * 16) / numColumns;

  const fetchTickets = useCallback(async () => {
    try {
      setError(null);

      const params: any = {};
      if (appliedFilters.showMyTickets) {
        params.myTickets = 'true';
      }

      const response = await api.get('/tickets', { params });
      
      const mappedTickets = response.data.map((data: any) => {
        const date = new Date(data.created_at);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');

        return {
          id: data.id,
          code: data.code,
          subject: data.subject,
          status: data.status,
          priority: data.priority,
          clientName: data.client_name,
          technician: data.technician_name,
          technicianId: data.technician_id,
          creatorId: data.user_id,
          equipment: data.equipment,
          municipality: data.municipality,
          uf: data.uf,
          rating: data.rating,
          createdAt: `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`,
          createdAtIso: data.created_at,
          created_at: data.created_at,
          rawDate: date.getTime()
        };
      });
      
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

  const processedTickets = useMemo(() => {
      let result = [...tickets];

      // 1. Status Filter (Primary Tab)
      if (activeStatusTab !== 'ALL') {
          result = result.filter(t => t.status === activeStatusTab);
      }

      // 2. Type Filter
      if (appliedFilters.type !== 'ALL') {
          if (appliedFilters.type === 'EQUIPMENT') {
             result = result.filter(t => 
                 (t.equipment && t.equipment.trim() !== '') || 
                 t.subject.toLowerCase().includes('impressora') || 
                 t.subject.toLowerCase().includes('equipamento') ||
                 t.subject.toLowerCase().includes('toner')
             );
          } else { // SYSTEM
             result = result.filter(t => !(
                 (t.equipment && t.equipment.trim() !== '') || 
                 t.subject.toLowerCase().includes('impressora') || 
                 t.subject.toLowerCase().includes('equipamento') ||
                 t.subject.toLowerCase().includes('toner')
             ));
          }
      }

      // 3. Priority Filter
      if (appliedFilters.priority !== 'ALL') {
          result = result.filter(t => t.priority === appliedFilters.priority);
      }

      if (appliedFilters.showMyTickets && user) {
        const isClient = user.profile === 'Cliente' || user.role === 'Cliente';
        if (isClient) {
          result = result.filter(t => t.creatorId === user.id);
        } else {
          result = result.filter(t => t.technicianId === user.id || t.creatorId === user.id);
        }
      }

      // 5. Search Filter
      if (searchQuery) {
          const lower = searchQuery.toLowerCase();
          result = result.filter(t => 
              t.subject.toLowerCase().includes(lower) || 
              (t.code && t.code.toLowerCase().includes(lower)) ||
              t.clientName.toLowerCase().includes(lower)
          );
      }

      // 6. Sorting
      return result.sort((a: any, b: any) => {
          let comparison = 0;
          
          if (appliedFilters.sortBy === 'priority') {
             const priorityWeight = { [TicketPriority.CRITICAL]: 4, [TicketPriority.HIGH]: 3, [TicketPriority.MEDIUM]: 2, [TicketPriority.LOW]: 1 };
             const weightA = priorityWeight[a.priority as TicketPriority] || 0;
             const weightB = priorityWeight[b.priority as TicketPriority] || 0;
             comparison = weightA - weightB;
          } else {
             // Date
             comparison = a.rawDate - b.rawDate;
          }

          return appliedFilters.sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [tickets, activeStatusTab, appliedFilters, searchQuery, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return '#3b82f6'; // Blue
      case TicketStatus.IN_ANALYSIS: return '#f59e0b'; // Amber
      case TicketStatus.IN_PROGRESS: return '#8b5cf6'; // Purple
      case TicketStatus.FORWARDED_ACQUISITION: return '#6366f1'; // Indigo
      case TicketStatus.IN_ROUTE: return '#06b6d4'; // Cyan
      case TicketStatus.RESOLVED: return '#10b981'; // Emerald
      default: return '#9ca3af';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
      switch (priority) {
          case TicketPriority.CRITICAL: return '#ef4444'; // Red
          case TicketPriority.HIGH: return '#f97316'; // Orange
          case TicketPriority.MEDIUM: return '#eab308'; // Yellow
          case TicketPriority.LOW: return '#3b82f6'; // Blue
          default: return '#9ca3af';
      }
  };

  const getStatusLabel = (status: TicketStatus) => {
      const option = STATUS_TABS.find(o => o.value === status);
      return option ? option.label : status;
  };

  const renderItem = ({ item }: { item: Ticket }) => {
    const ratingColor =
      item.rating && item.rating >= 4
        ? '#facc15'
        : item.rating && item.rating <= 2
        ? '#f87171'
        : '#fbbf24';

    return (
      <TouchableOpacity 
        style={[styles.card, { width: numColumns > 1 ? cardWidth : '100%' }]}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
               <Text style={styles.ticketCode}>{item.code || `CH-${item.id.slice(0, 4)}`}</Text>
               {item.createdAtIso && (
                   <Text style={styles.timeAgo}>
                      {format(new Date(item.createdAtIso), "dd/MM/yyyy HH:mm")}
                   </Text>
               )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) + '40' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusColor(item.status) }} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
              <UserIcon size={14} color="#9ca3af" />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.clientName}
                {item.municipality ? ` • ${item.municipality}` : ''}
              </Text>
          </View>
          
          {item.equipment && (
               <View style={styles.detailRow}>
                  <Monitor size={14} color="#9ca3af" />
                  <Text style={styles.detailText} numberOfLines={1}>{item.equipment}</Text>
              </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
           <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                  {item.priority === TicketPriority.CRITICAL ? 'Crítica' :
                   item.priority === TicketPriority.HIGH ? 'Alta' :
                   item.priority === TicketPriority.MEDIUM ? 'Média' : 'Baixa'}
              </Text>
           </View>

           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: 1 }}>
             {item.rating ? (
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <Text style={{ fontSize: 12, color: '#9ca3af' }}>Avaliação:</Text>
                 {[1, 2, 3, 4, 5].map((s) => (
                   <Text
                     key={s}
                     style={{
                       fontSize: 14,
                       color: item.rating && item.rating >= s ? ratingColor : '#4b5563',
                     }}
                   >
                     ★
                   </Text>
                 ))}
               </View>
             ) : (
               <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Não avaliado</Text>
             )}
           </View>
         </View>

         {item.technician && (
           <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <View style={styles.techContainer}>
                 <Text style={styles.techLabel}>Técnico:</Text>
                 <Text style={styles.techName} numberOfLines={1}>{item.technician}</Text>
             </View>
           </View>
         )}
      </TouchableOpacity>
    );
  };

  const applyFilters = () => {
      setAppliedFilters(tempFilters);
      setFilterModalVisible(false);
  };

  const resetFilters = () => {
      const resetState = {
          type: 'ALL',
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
    <View style={styles.container}>
      <Header 
        title="Chamados" 
        rightAction={
          user?.profile !== 'Suporte Técnico' ? (
            <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('NewTicket')}
            >
                <Plus color="#fff" size={24} />
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Primary Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.tabsContent}
        >
            {STATUS_TABS.map((tab) => (
            <TouchableOpacity
                key={tab.value}
                style={[styles.tab, activeStatusTab === tab.value && styles.activeTab]}
                onPress={() => setActiveStatusTab(tab.value)}
            >
                <Text style={[styles.tabText, activeStatusTab === tab.value && styles.activeTabText]}>
                {tab.label}
                </Text>
            </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* Search and Filters Bar */}
      <View style={styles.searchBarContainer}>
          <View style={styles.searchInputWrapper}>
              <Search color="#9ca3af" size={18} />
              <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por código, assunto..."
                  placeholderTextColor="#6b7280"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X stroke="#9ca3af" size={18} />
                  </TouchableOpacity>
              )}
          </View>
          <TouchableOpacity 
            style={[styles.filterButton, (appliedFilters.priority !== 'ALL' || appliedFilters.type !== 'ALL' || appliedFilters.showMyTickets) && styles.filterButtonActive]}
            onPress={() => {
                setTempFilters(appliedFilters);
                setFilterModalVisible(true);
            }}
          >
              <Filter color={appliedFilters.priority !== 'ALL' || appliedFilters.type !== 'ALL' || appliedFilters.showMyTickets ? "#fff" : "#9ca3af"} size={20} />
          </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={processedTickets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
                <View style={styles.emptyIconBg}>
                    <Search size={32} color="#4b5563" />
                </View>
                <Text style={styles.emptyTitle}>Nenhum chamado encontrado</Text>
                <Text style={styles.emptyText}>
                    Tente ajustar os filtros ou busque por outro termo.
                </Text>
                <TouchableOpacity style={styles.clearFiltersButton} onPress={() => {
                    setSearchQuery('');
                    setActiveStatusTab('ALL');
                    resetFilters();
                }}>
                    <Text style={styles.clearFiltersText}>Limpar Filtros</Text>
                </TouchableOpacity>
            </View>
          }
          numColumns={numColumns}
          key={numColumns} 
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Filtrar e Ordenar</Text>
                      <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                          <X color="#9ca3af" size={24} />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.modalBody}>
                      {/* Sort Options */}
                      <Text style={styles.filterSectionTitle}>Ordenar por</Text>
                      <View style={styles.filterOptionsRow}>
                          <TouchableOpacity 
                             style={[styles.filterOption, tempFilters.sortBy === 'date' && styles.filterOptionActive]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortBy: 'date' }))}
                          >
                              <Calendar size={16} color={tempFilters.sortBy === 'date' ? '#fff' : '#9ca3af'} />
                              <Text style={[styles.filterOptionText, tempFilters.sortBy === 'date' && styles.filterOptionTextActive]}>Data</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                             style={[styles.filterOption, tempFilters.sortBy === 'priority' && styles.filterOptionActive]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortBy: 'priority' }))}
                          >
                              <AlertCircle size={16} color={tempFilters.sortBy === 'priority' ? '#fff' : '#9ca3af'} />
                              <Text style={[styles.filterOptionText, tempFilters.sortBy === 'priority' && styles.filterOptionTextActive]}>Prioridade</Text>
                          </TouchableOpacity>
                      </View>

                      <Text style={styles.filterSectionTitle}>Ordem</Text>
                      <View style={styles.filterOptionsRow}>
                          <TouchableOpacity 
                             style={[styles.filterOption, tempFilters.sortOrder === 'desc' && styles.filterOptionActive]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                          >
                              <Text style={[styles.filterOptionText, tempFilters.sortOrder === 'desc' && styles.filterOptionTextActive]}>Decrescente</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                             style={[styles.filterOption, tempFilters.sortOrder === 'asc' && styles.filterOptionActive]}
                             onPress={() => setTempFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                          >
                              <Text style={[styles.filterOptionText, tempFilters.sortOrder === 'asc' && styles.filterOptionTextActive]}>Crescente</Text>
                          </TouchableOpacity>
                      </View>

                      {/* Type Filter */}
                      <Text style={styles.filterSectionTitle}>Tipo</Text>
                      <View style={styles.filterOptionsGrid}>
                          {TYPE_OPTIONS.map(opt => (
                              <TouchableOpacity
                                  key={opt.value}
                                  style={[styles.filterOption, tempFilters.type === opt.value && styles.filterOptionActive]}
                                  onPress={() => setTempFilters(prev => ({ ...prev, type: opt.value }))}
                              >
                                  <Text style={[styles.filterOptionText, tempFilters.type === opt.value && styles.filterOptionTextActive]}>{opt.label}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      {/* Priority Filter */}
                      <Text style={styles.filterSectionTitle}>Prioridade</Text>
                      <View style={styles.filterOptionsGrid}>
                          {PRIORITY_OPTIONS.map(opt => (
                              <TouchableOpacity
                                  key={opt.value}
                                  style={[styles.filterOption, tempFilters.priority === opt.value && styles.filterOptionActive]}
                                  onPress={() => setTempFilters(prev => ({ ...prev, priority: opt.value }))}
                              >
                                  <Text style={[styles.filterOptionText, tempFilters.priority === opt.value && styles.filterOptionTextActive]}>{opt.label}</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      {/* My Tickets Toggle */}
                      {(user?.profile === 'Suporte Técnico' || user?.profile === 'Administrador') && (
                          <TouchableOpacity 
                              style={styles.switchRow}
                              onPress={() => setTempFilters(prev => ({ ...prev, showMyTickets: !prev.showMyTickets }))}
                          >
                              <Text style={styles.switchLabel}>Apenas meus chamados</Text>
                              <View style={[styles.switch, tempFilters.showMyTickets ? styles.switchActive : styles.switchInactive]}>
                                  <View style={[styles.switchThumb, tempFilters.showMyTickets ? styles.switchThumbActive : styles.switchThumbInactive]} />
                              </View>
                          </TouchableOpacity>
                      )}

                      <View style={{ height: 40 }} />
                  </ScrollView>

                  <View style={styles.modalFooter}>
                      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                          <Text style={styles.resetButtonText}>Limpar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                          <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
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
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  codeContainer: {
    flex: 1,
  },
  ticketCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 24,
  },
  cardDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  techContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  techLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  techName: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
    maxWidth: 100,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  tabsContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#111827',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
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
  clearFiltersButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    height: '80%',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterOptionText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  switchLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#3b82f6',
  },
  switchInactive: {
    backgroundColor: '#374151',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchThumbInactive: {
    alignSelf: 'flex-start',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    flexDirection: 'row',
    gap: 16,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
