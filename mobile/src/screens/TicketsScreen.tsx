import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/api';
import { Ticket, TicketStatus } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react-native';
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

export const TicketsScreen = () => {
  const navigation = useNavigation<TicketsScreenNavigationProp>();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isTablet, isLandscape, screenWidth } = useResponsive();

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const numColumns = isTablet || isLandscape ? 2 : 1;
  const cardWidth = (screenWidth - 40 - (numColumns - 1) * 16) / numColumns;

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      
      const mappedTickets = response.data.map((data: any) => ({
        id: data.id,
        code: data.code,
        subject: data.subject,
        status: data.status,
        priority: data.priority,
        clientName: data.client_name,
        technician: data.technician_name,
        createdAt: new Date(data.created_at).toLocaleDateString(),
        // Store raw date for sorting if needed, but here using mapped string
        rawDate: new Date(data.created_at).getTime()
      }));
      
      setTickets(mappedTickets);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
      let result = [...tickets];

      // 1. Status Filter
      if (statusFilter !== 'ALL') {
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
      result.sort((a: any, b: any) => {
          return sortOrder === 'desc' 
              ? b.rawDate - a.rawDate 
              : a.rawDate - b.rawDate;
      });

      setFilteredTickets(result);
  }, [tickets, statusFilter, searchQuery, sortOrder]);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chamados</Text>
        {user?.profile !== 'Suporte Técnico' && (
            <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('NewTicket')}
            >
                <Plus color="#fff" size={24} />
            </TouchableOpacity>
        )}
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

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
              {STATUS_FILTERS.map((filter) => (
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
          data={filteredTickets}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
  },
});
