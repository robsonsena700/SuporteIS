import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/api';
import { DashboardStats } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inbox, CheckCircle, Clock, TrendingUp, Star } from 'lucide-react-native';
import { useResponsive } from '../hooks/useResponsive';
import { StatCard } from '../components/StatCard';
import { useFocusEffect } from '@react-navigation/native';

export const DashboardScreen = () => {
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
      // Default period 'week' as per web
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
  const totalTickets = stats?.totalTickets || 1; // avoid division by zero
  const resolutionRate = ((resolvedCount / totalTickets) * 100).toFixed(1);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>Visão Geral</Text>
        </View>
        <Text style={styles.date}>{new Date().toLocaleDateString('pt-BR')}</Text>
      </View>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  date: {
    color: '#6b7280',
    fontSize: 12,
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
});
