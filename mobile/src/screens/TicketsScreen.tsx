import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/api';
import { Ticket, TicketStatus } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Filter, ArrowUpDown, AlertCircle, RefreshCw } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  TicketDetail: { ticketId: string };
  NewTicket: undefined;
};

type TicketsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const STATUS_FILTERS = [
    { label: 'Todos', value: 'ALL' },
    { label: 'Abertos', value: TicketStatus.OPEN },
    { label: 'Em Análise', value: TicketStatus.IN_ANALYSIS },
    { label: 'Em Andamento', value: TicketStatus.IN_PROGRESS },
    { label: 'Resolvidos', value: TicketStatus.RESOLVED },
];

import { Header } from '../components/Header';

export const TicketsScreen = () => {
  const navigation = useNavigation<TicketsScreenNavigationProp>();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isTablet, isLandscape, screenWidth } = useResponsive();

  // Tabs
  const [activeTab, setActiveTab] = useState<'Sistema' | 'Equipamento' | 'Concluído'>('Sistema');
  const [showMyTicketsOnly, setShowMyTicketsOnly] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const cardWidth = (screenWidth - 40 - (numColumns - 1) * 16) / numColumns;

  const fetchTickets = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/tickets');
      
      const mappedTickets = response.data.map((data: any) => ({
        id: data.id,
        code: data.code,
        subject: data.subject,
        status: data.status,
        priority: data.priority,
        clientName: data.client_name,
        technician: data.technician_name,
        technicianId: data.technician_id,
        equipment: data.equipment,
        createdAt: new Date(data.created_at).toLocaleDateString('pt-BR'),
        // Store raw date for sorting
        rawDate: new Date(data.created_at).getTime()
      }));
      
      setTickets(mappedTickets);
    } catch (err) {
      console.error(err);
      setError('Não foi possível carregar os chamados. Verifique sua conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const processedTickets = useMemo(() => {
      let result = [...tickets];

      // 0. Tab Filter
      if (activeTab === 'Concluído') {
        result = result.filter(t => t.status === TicketStatus.RESOLVED);
      } else {
        // Exclude resolved from other tabs
        result = result.filter(t => t.status !== TicketStatus.RESOLVED);
        
        if (activeTab === 'Equipamento') {
           // Filter for Equipment tickets
           result = result.filter(t => 
             (t.equipment && t.equipment.trim() !== '') || 
             t.subject.toLowerCase().includes('impressora') || 
             t.subject.toLowerCase().includes('equipamento') ||
             t.subject.toLowerCase().includes('toner')
           );
        } else {
           // Sistema (System) - default for others
           // Exclude equipment tickets
           result = result.filter(t => !(
             (t.equipment && t.equipment.trim() !== '') || 
             t.subject.toLowerCase().includes('impressora') || 
             t.subject.toLowerCase().includes('equipamento') ||
             t.subject.toLowerCase().includes('toner')
           ));
        }
      }

      // 0.5 My Tickets Filter (Support/Admin only)
      if (showMyTicketsOnly && user) {
        result = result.filter(t => t.technicianId === user.id);
      }

      // 1. Status Filter (Chips)
      // Only apply if not in 'Concluído' tab (where status is fixed)
      if (activeTab !== 'Concluído' && statusFilter !== 'ALL') {
          result = result.filter(t => t.status === statusFilter);
      }

      // 2. Search Filter
      if (searchQuery) {
          const lower = searchQuery.toLowerCase();
          result = result.filter(t => 
              t.subject.toLowerCase().includes(lower) || 
              (t.code && t.code.toLowerCase().includes(lower)) ||
              t.clientName.toLowerCase().includes(lower)
          );
      }

      // 3. Sorting (Date)
      return result.sort((a: any, b: any) => {
          return sortOrder === 'desc' 
              ? b.rawDate - a.rawDate 
              : a.rawDate - b.rawDate;
      });
  }, [tickets, statusFilter, searchQuery, sortOrder, activeTab, showMyTicketsOnly, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
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

  const renderItem = ({ item }: { item: Ticket }) => (
    <TouchableOpacity 
      style={[styles.card, { width: numColumns > 1 ? cardWidth : '100%' }]}
      onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.ticketCode}>{item.code || `CH-${item.id.slice(0, 4)}`}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.clientText}>{item.clientName}</Text>
        <Text style={styles.dateText}>{item.createdAt}</Text>
      </View>
    </TouchableOpacity>
  );


  if (error) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTickets}>
          <RefreshCw size={20} color="#fff" />
          <Text style={styles.retryText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const EmptyState = () => (
    <View style={styles.center}>
      <Filter size={48} color="#374151" style={{ marginBottom: 16 }} />
      <Text style={styles.emptyTitle}>Nenhum chamado encontrado</Text>
      <Text style={styles.emptyText}>
        {searchQuery 
          ? `Não encontramos resultados para "${searchQuery}"`
          : 'Tente ajustar os filtros para ver mais resultados'}
      </Text>
    </View>
  );

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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['Sistema', 'Equipamento', 'Concluído'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => {
              setActiveTab(tab);
              setStatusFilter('ALL'); // Reset status filter on tab change
            }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
              <Search color="#9ca3af" size={20} />
              <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar chamados..."
                  placeholderTextColor="#6b7280"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
              />
          </View>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          >
              <ArrowUpDown color="#9ca3af" size={20} />
          </TouchableOpacity>
      </View>

      {/* Filters: My Tickets Toggle & Status Chips */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
            {/* My Tickets Toggle (Support only) */}
            {(user?.profile === 'Suporte Técnico' || user?.profile === 'Administrador') && (
               <TouchableOpacity
                  style={[styles.chip, showMyTicketsOnly && styles.activeChip]}
                  onPress={() => setShowMyTicketsOnly(!showMyTicketsOnly)}
               >
                 <Text style={[styles.chipText, showMyTicketsOnly && styles.activeChipText]}>
                   Meus Chamados
                 </Text>
               </TouchableOpacity>
            )}

            {/* Status Chips (Only if not in Concluído tab) */}
            {activeTab !== 'Concluído' && STATUS_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                      styles.chip,
                      statusFilter === filter.value && styles.activeChip
                  ]}
                  onPress={() => setStatusFilter(filter.value)}
                >
                    <Text style={[
                        styles.chipText,
                        statusFilter === filter.value && styles.activeChipText
                    ]}>{filter.label}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
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
              <Text style={styles.emptyText}>Nenhum chamado encontrado</Text>
            </View>
          }
          numColumns={numColumns}
          key={numColumns} // Force re-render on orientation change
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
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
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 24,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#9ca3af',
    fontWeight: '500',
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
      paddingHorizontal: 24,
      marginBottom: 16,
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
  filtersContainer: {
      marginBottom: 16,
  },
  chipsContent: {
      paddingHorizontal: 24,
      gap: 8,
  },
  chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#1f2937',
      borderWidth: 1,
      borderColor: '#374151',
  },
  activeChip: {
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
  },
  chipText: {
      color: '#9ca3af',
      fontSize: 14,
      fontWeight: '500',
  },
  activeChipText: {
      color: '#fff',
  },
  list: {
    padding: 24,
    gap: 16,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketCode: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  clientText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  dateText: {
    color: '#6b7280',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '40%',
    height: 3,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
