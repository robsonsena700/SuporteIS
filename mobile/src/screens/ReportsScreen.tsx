import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, ScrollView, Alert, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Header } from '../components/Header';
import { TicketService } from '../services/ticketService';
import { useAuth } from '../auth/AuthContext';
import { Ticket } from '../types';
import { Search, SlidersHorizontal, FileText, Download, Share2, FileSpreadsheet } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TicketCard } from '../components/TicketCard';
import { useNavigation } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ReportsScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');

  // Helper to convert DD/MM/YYYY to YYYY-MM-DD
  const parseDateToISO = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 10) return undefined;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  };

  // Helper to format input as DD/MM/YYYY
  const handleDateChange = (text: string, setter: (value: string) => void) => {
    const numbers = text.replace(/\D/g, '');
    let formatted = numbers;
    
    if (numbers.length > 2) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    }
    if (numbers.length > 4) {
      formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
    
    setter(formatted);
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        search: searchText || undefined,
        startDate: parseDateToISO(startDate),
        endDate: parseDateToISO(endDate),
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined
      };

      const data = await TicketService.getAll(filters);
      setTickets(data);
    } catch (error) {
      console.error('Failed to fetch report', error);
      Alert.alert('Erro', 'Não foi possível carregar o relatório.');
    } finally {
      setLoading(false);
    }
  }, [searchText, startDate, endDate, status, priority, category]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const clearFilters = () => {
    setSearchText('');
    setStartDate('');
    setEndDate('');
    setStatus('');
    setPriority('');
    setCategory('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    if (status) count++;
    if (priority) count++;
    if (category) count++;
    return count;
  };

  const handleTicketPress = (ticket: Ticket) => {
    navigation.navigate('TicketDetail', { ticketId: ticket.id });
  };

  const generatePDF = async () => {
    if (tickets.length === 0) {
      Alert.alert('Atenção', 'Não há dados para exportar.');
      return;
    }

    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background-color: #f2f2f2; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .status-resolvido { color: #10b981; font-weight: bold; }
              .status-aberto { color: #3b82f6; font-weight: bold; }
              .status-outros { color: #f59e0b; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>Relatório de Chamados</h1>
            <p>Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            <p>Total de registros: ${tickets.length}</p>
            
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Assunto</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Data</th>
                  <th>Técnico</th>
                </tr>
              </thead>
              <tbody>
                ${tickets.map(t => `
                  <tr>
                    <td>${t.code || t.id.slice(0, 6)}</td>
                    <td>${t.subject}</td>
                    <td>${t.clientName || '-'}</td>
                    <td class="${t.status === 'Resolvido' ? 'status-resolvido' : t.status === 'Aberto' ? 'status-aberto' : 'status-outros'}">${t.status}</td>
                    <td>${t.priority}</td>
                    <td>${t.createdAtIso ? format(new Date(t.createdAtIso), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                    <td>${t.technician || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Erro', 'Falha ao gerar PDF.');
    }
  };

  const generateXLS = async () => {
    if (tickets.length === 0) {
      Alert.alert('Atenção', 'Não há dados para exportar.');
      return;
    }

    try {
      const data = tickets.map(t => ({
        'Código': t.code || t.id.slice(0, 6),
        'Assunto': t.subject,
        'Equipamento': t.equipment,
        'Cliente': t.clientName,
        'Status': t.status,
        'Prioridade': t.priority,
        'Data Criação': t.createdAtIso ? format(new Date(t.createdAtIso), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-',
        'Técnico': t.technician || 'Sem técnico',
        'Resolvido Em': t.resolvedAt ? format(new Date(t.resolvedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.documentDirectory + 'relatorio_chamados.xlsx';
      
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar Relatório XLS'
      });

    } catch (error) {
      console.error('Error generating XLS:', error);
      Alert.alert('Erro', 'Falha ao gerar Excel.');
    }
  };

  const FilterOption = ({ label, value, selected, onSelect }: any) => (
    <TouchableOpacity 
      style={[styles.filterChip, selected === value && styles.filterChipSelected]} 
      onPress={() => onSelect(value === selected ? '' : value)}
    >
      <Text style={[styles.filterChipText, selected === value && styles.filterChipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header title="Relatórios" />
      
      <View style={styles.content}>
        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
              placeholderTextColor="#6b7280"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={fetchReport}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]} 
            onPress={toggleFilters}
          >
            <SlidersHorizontal size={20} color="#fff" />
            {getActiveFilterCount() > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Categoria</Text>
              <View style={styles.filterRow}>
                <FilterOption 
                  label="Sistema" 
                  value="Sistema" 
                  selected={category} 
                  onSelect={setCategory} 
                />
                <FilterOption 
                  label="Equipamento" 
                  value="Equipamento" 
                  selected={category} 
                  onSelect={setCategory} 
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Período</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>De</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#6b7280"
                    value={startDate}
                    onChangeText={(text) => handleDateChange(text, setStartDate)}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Até</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#6b7280"
                    value={endDate}
                    onChangeText={(text) => handleDateChange(text, setEndDate)}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterWrap}>
                {['Aberto', 'Em Andamento', 'Em Análise', 'Resolvido'].map(s => (
                  <FilterOption 
                    key={s}
                    label={s} 
                    value={s} 
                    selected={status} 
                    onSelect={setStatus} 
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Prioridade</Text>
              <View style={styles.filterRow}>
                {['Baixa', 'Média', 'Alta'].map(p => (
                  <FilterOption 
                    key={p}
                    label={p} 
                    value={p} 
                    selected={priority} 
                    onSelect={setPriority} 
                  />
                ))}
              </View>
            </View>

            <View style={styles.actionButtons}>
               <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Limpar Filtros</Text>
              </TouchableOpacity>
              
              <View style={styles.exportButtons}>
                <TouchableOpacity style={styles.exportButton} onPress={generatePDF}>
                  <FileText size={18} color="#fff" />
                  <Text style={styles.exportButtonText}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportButton, { backgroundColor: '#10b981' }]} onPress={generateXLS}>
                  <FileSpreadsheet size={18} color="#fff" />
                  <Text style={styles.exportButtonText}>XLS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Total encontrado: <Text style={styles.summaryHighlight}>{tickets.length}</Text>
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Carregando relatórios...</Text>
          </View>
        ) : (
          <FlatList
            data={tickets}
            renderItem={({ item }) => (
              <TicketCard 
                ticket={item} 
                onPress={handleTicketPress}
              />
            )}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FileText size={48} color="#374151" />
                <Text style={styles.emptyText}>Nenhum registro encontrado</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    zIndex: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: '#374151',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filtersContainer: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterChipSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  filterChipTextSelected: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 16,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#9ca3af',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  summaryText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  summaryHighlight: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#6b7280',
    marginTop: 16,
    fontSize: 16,
  },
});
