import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/api';
import { DashboardStats } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inbox, CheckCircle, Clock, TrendingUp, Star, Plus } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { StatCard } from '../components/StatCard';
import { Header } from '../components/Header';
import { useFocusEffect } from '@react-navigation/native';

export const DashboardScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isTablet, isLandscape, screenWidth } = useResponsive();

  const numColumns = isTablet || isLandscape ? 3 : 2; // 3 columns on tablet/landscape, 2 on mobile
  const gap = 16;
  const padding = 20;
  // Calculate card width considering gap and padding
  // width = (totalWidth - padding*2 - gap*(cols-1)) / cols
  const cardWidth = (screenWidth - (padding * 2) - (gap * (numColumns - 1))) / numColumns;
  // Fallback for very small screens or single column layout logic if needed, 
  // but let's stick to responsive grid. If width is too small (<150), maybe force 1 col?
  const finalNumColumns = cardWidth < 140 ? 1 : numColumns;
  const finalCardWidth = finalNumColumns === 1 ? '100%' : cardWidth;

  const fetchStats = async () => {
    try {
      // For Clients, we don't need to pass myTickets=true explicitly if the backend handles it by role,
      // but passing it ensures consistency if the logic changes.
      // However, the backend logic for 'Cliente' role is: if (user.role === 'Cliente' || user.profile === 'Cliente') -> filter by user_id
      // So no extra params needed for Client, just the period.
      
      const response = await api.get('/dashboard', { params: { period: 'week' } });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading && !stats) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Prepare Data
  const resolvedCount = stats?.resolvedCount || 0;
  const totalTickets = stats?.totalTickets || 0; // Fixed: default to 0, not 1
  const resolutionRate = totalTickets > 0 ? ((resolvedCount / totalTickets) * 100).toFixed(1) : '0.0';

  const openCount = stats?.byStatus.find(s => s.status === 'Aberto')?.count || 0;
  
  const inProgressCount = Number(stats?.byStatus.find(s => s.status === 'Em Andamento')?.count || 0);
  const inAnalysisCount = Number(stats?.byStatus.find(s => s.status === 'Em Análise')?.count || 0);
  const treatingCount = inProgressCount + inAnalysisCount;

  const avgRating = Number(stats?.averageRating || 0);

  const statItems = [
    {
      label: 'Total de Chamados',
      value: totalTickets,
      trend: 'No período',
      trendType: 'neutral',
      icon: Inbox,
      color: '#3b82f6'
    },
    {
      label: 'Chamados Resolvidos',
      value: resolvedCount,
      trend: `${resolutionRate}% taxa`,
      trendType: 'up',
      icon: CheckCircle,
      color: '#10b981'
    },
    {
      label: 'Em Aberto',
      value: openCount,
      trend: 'Aguardando',
      trendType: 'down',
      icon: Clock,
      color: '#f59e0b'
    },
    {
      label: 'Em Tratativa',
      value: treatingCount,
      trend: 'Andamento/Análise',
      trendType: 'neutral',
      icon: TrendingUp,
      color: '#60a5fa'
    },
    {
      label: 'Média Satisfação',
      value: avgRating.toFixed(1),
      trend: 'Avaliação',
      trendType: avgRating >= 4 ? 'up' : avgRating >= 3 ? 'neutral' : 'down',
      icon: Star,
      color: '#facc15'
    }
  ];

  return (
    <View style={styles.container}>
      <Header showUserInfo={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.grid}>
          {statItems.map((item, index) => (
            <StatCard
              key={index}
              {...item}
              width={finalCardWidth}
              trendType={item.trendType as any}
            />
          ))}
        </View>
        
        {/* Placeholder for future charts or lists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atalhos Rápidos</Text>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>Gráficos de evolução em breve</Text>
          </View>
        </View>

      </ScrollView>

      {user?.role !== 'Técnico' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('NewTicket' as never)}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      )}
    </View>
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
  scrollContent: {
    padding: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholderCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    zIndex: 10,
  },
});
