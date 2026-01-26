import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Alert, 
  Platform,
  Modal,
  ScrollView
} from 'react-native';
import { Header } from '../components/Header';
import { TicketService } from '../services/ticketService';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { Filter, Download, Calendar, Search, X, ChevronDown, ChevronUp, FileText, File as FileIcon } from 'lucide-react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useAuth } from '../auth/AuthContext';
import { format } from 'date-fns';

export const ReportsScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [startDate, setStartDate] = useState(''); // DDMMAAAA
  const [endDate, setEndDate] = useState(''); // DDMMAAAA
  const [category, setCategory] = useState('');

  // Helper to convert DDMMAAAA to YYYY-MM-DD
  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr.length !== 8) return undefined;
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return `${year}-${month}-${day}`;
  };

  const handleSearch = async () => {
    setLoading(true);
    
    // Validate Date Format
    if ((startDate && startDate.length !== 8) || (endDate && endDate.length !== 8)) {
        Alert.alert('Erro', 'Data deve estar no formato DDMMAAAA (8 dígitos).');
        setLoading(false);
        return;
    }

    try {
      const result = await TicketService.getReport({
        search,
        status,
        priority,
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
        category
      });
      setTickets(result);
      setShowFilters(false); // Auto-collapse on search to show results
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório.');
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = () => {
    if (tickets.length === 0) return;

    // CSV Header
    const header = 'ID,Código,Assunto,Status,Prioridade,Cliente,Técnico,Data Criação,Data Resolução\n';
    
    // CSV Rows
    const rows = tickets.map(t => {
      const created = t.createdAt ? format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm') : '';
      const resolved = t.resolvedAt ? format(new Date(t.resolvedAt), 'dd/MM/yyyy HH:mm') : '';
      
      // Escape fields that might contain commas
      const subject = `"${(t.subject || '').replace(/"/g, '""')}"`;
      const client = `"${(t.clientName || '').replace(/"/g, '""')}"`;
      const tech = `"${(t.technician || '').replace(/"/g, '""')}"`;

      return `${t.id},${t.code},${subject},${t.status},${t.priority},${client},${tech},${created},${resolved}`;
    }).join('\n');

    return header + rows;
  };

  const handleExportCSV = async () => {
    if (tickets.length === 0) {
      Alert.alert('Atenção', 'Não há dados para exportar.');
      return;
    }

    try {
      const csvData = generateCSV();
      if (!csvData) return;

      const filename = `relatorio_chamados_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      const file = new File(Paths.document, filename);

      file.write(csvData);
      
      const fileUri = file.uri;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sucesso', `Arquivo salvo em: ${fileUri}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao exportar CSV.');
    }
  };

  const handleExportPDF = async () => {
    if (tickets.length === 0) {
        Alert.alert('Atenção', 'Não há dados para exportar.');
        return;
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; margin-bottom: 5px; }
            p.subtitle { text-align: center; color: #666; font-size: 12px; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Relatório de Chamados</h1>
          <p class="subtitle">Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p class="subtitle">Total de registros: ${tickets.length}</p>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Assunto</th>
                <th>Cliente</th>
                <th>Técnico</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${tickets.map(t => `
                <tr>
                  <td>${t.code}</td>
                  <td>${t.subject}</td>
                  <td>${t.clientName || '-'}</td>
                  <td>${t.technician || '-'}</td>
                  <td class="status">${t.status}</td>
                  <td>${t.createdAt ? format(new Date(t.createdAt), 'dd/MM/yyyy') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error(error);
        Alert.alert('Erro', 'Falha ao gerar PDF.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return '#ef4444';
      case 'Em Andamento': return '#3b82f6';
      case 'Em Análise': return '#8b5cf6';
      case 'Resolvido': return '#10b981';
      case 'Cancelado': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.codeContainer}>
           <Text style={styles.ticketCode}>{item.code}</Text>
           {item.priority === 'Alta' && <View style={styles.priorityDot} />}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.ticketSubject} numberOfLines={2}>{item.subject}</Text>
      
      <View style={styles.ticketFooter}>
        <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Cliente:</Text>
            <Text style={styles.footerValue} numberOfLines={1}>{item.clientName}</Text>
        </View>
        <View style={styles.footerInfo}>
            <Text style={styles.footerLabel}>Data:</Text>
            <Text style={styles.footerValue}>{item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : '-'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Relatórios" />
      
      <View style={styles.mainContent}>
        {/* Toggle Filters Button */}
        <TouchableOpacity 
            style={styles.filterToggle} 
            onPress={() => setShowFilters(!showFilters)}
        >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Filter size={20} color="#3b82f6" />
                <Text style={styles.filterToggleText}>Filtros de Busca</Text>
            </View>
            {showFilters ? <ChevronUp size={20} color="#9ca3af" /> : <ChevronDown size={20} color="#9ca3af" />}
        </TouchableOpacity>

        {/* Filters Section */}
        {showFilters && (
            <View style={styles.filtersContainer}>
                {/* Search */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Busca</Text>
                    <View style={styles.inputWrapper}>
                        <Search size={18} color="#9ca3af" style={{marginLeft: 10}} />
                        <TextInput
                            style={styles.input}
                            placeholder="Buscar por assunto, ID, técnico..."
                            placeholderTextColor="#6b7280"
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>
                </View>

                {/* Category (Type) Row */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Tipo de Chamado</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                            {['', 'Serviço', 'Equipamento'].map((c) => (
                                <TouchableOpacity 
                                    key={c}
                                    style={[
                                        styles.chip, 
                                        category === c && styles.chipActive
                                    ]}
                                    onPress={() => setCategory(category === c ? '' : c)}
                                >
                                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                                        {c || 'Todos'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* Status & Priority Row */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Status</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                            {['', 'Aberto', 'Em Andamento', 'Em Análise', 'Resolvido'].map((s) => (
                                <TouchableOpacity 
                                    key={s}
                                    style={[
                                        styles.chip, 
                                        status === s && styles.chipActive,
                                        status === s && { backgroundColor: s ? getStatusColor(s) : '#3b82f6' }
                                    ]}
                                    onPress={() => setStatus(status === s ? '' : s)}
                                >
                                    <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                                        {s || 'Todos'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Prioridade</Text>
                        <View style={{flexDirection: 'row', gap: 8}}>
                            {['', 'Baixa', 'Média', 'Alta'].map((p) => (
                                <TouchableOpacity 
                                    key={p}
                                    style={[styles.chip, priority === p && styles.chipActive]}
                                    onPress={() => setPriority(priority === p ? '' : p)}
                                >
                                    <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                                        {p || 'Todas'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Date Range */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>De (DDMMAAAA)</Text>
                        <View style={styles.inputWrapper}>
                            <Calendar size={18} color="#9ca3af" style={{marginLeft: 10}} />
                            <TextInput
                                style={styles.input}
                                placeholder="DDMMAAAA"
                                placeholderTextColor="#6b7280"
                                value={startDate}
                                onChangeText={(text) => setStartDate(text.replace(/[^0-9]/g, ''))}
                                maxLength={8}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Até (DDMMAAAA)</Text>
                        <View style={styles.inputWrapper}>
                            <Calendar size={18} color="#9ca3af" style={{marginLeft: 10}} />
                            <TextInput
                                style={styles.input}
                                placeholder="DDMMAAAA"
                                placeholderTextColor="#6b7280"
                                value={endDate}
                                onChangeText={(text) => setEndDate(text.replace(/[^0-9]/g, ''))}
                                maxLength={8}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.searchButton}
                    onPress={handleSearch}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.searchButtonText}>Gerar Relatório</Text>
                    )}
                </TouchableOpacity>
            </View>
        )}

        {/* Results Info & Export */}
        <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
                <Text style={{color: '#3b82f6', fontWeight: 'bold'}}>{tickets.length}</Text> chamados encontrados
            </Text>
            
            <View style={{flexDirection: 'row', gap: 8}}>
                <TouchableOpacity 
                    style={[styles.exportButton, tickets.length === 0 && styles.exportButtonDisabled]}
                    onPress={handleExportCSV}
                    disabled={tickets.length === 0}
                >
                    <Download size={14} color={tickets.length > 0 ? '#10b981' : '#4b5563'} />
                    <Text style={[styles.exportButtonText, tickets.length === 0 && {color: '#4b5563'}]}>CSV</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.exportButton, tickets.length === 0 && styles.exportButtonDisabled, { borderColor: tickets.length > 0 ? 'rgba(239, 68, 68, 0.2)' : '#374151', backgroundColor: tickets.length > 0 ? 'rgba(239, 68, 68, 0.1)' : '#1f2937' }]}
                    onPress={handleExportPDF}
                    disabled={tickets.length === 0}
                >
                    <FileIcon size={14} color={tickets.length > 0 ? '#ef4444' : '#4b5563'} />
                    <Text style={[styles.exportButtonText, tickets.length === 0 ? {color: '#4b5563'} : {color: '#ef4444'}]}>PDF</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* List */}
        <FlatList
            data={tickets}
            renderItem={renderTicketItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyState}>
                    <FileText size={48} color="#374151" />
                    <Text style={styles.emptyStateText}>Nenhum registro encontrado</Text>
                    <Text style={styles.emptyStateSubtext}>Ajuste os filtros para buscar resultados</Text>
                </View>
            ) : null
        }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  mainContent: {
    flex: 1,
  },
  filterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  filterToggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  input: {
    flex: 1,
    height: 40,
    color: '#fff',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111827',
  },
  resultsCount: {
    color: '#d1d5db',
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  exportButtonDisabled: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  exportButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  ticketCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketCode: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  ticketSubject: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 22,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    color: '#6b7280',
    fontSize: 10,
    marginBottom: 2,
  },
  footerValue: {
    color: '#d1d5db',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptyStateSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
