import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  label: string;
  value: number | string;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color: string;
  width?: number | string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  trend, 
  trendType, 
  icon: Icon, 
  color,
  width = '100%'
}) => {
  
  const getTrendColor = () => {
    switch (trendType) {
      case 'up': return '#10b981'; // success
      case 'down': return '#ef4444'; // error
      default: return '#9ca3af'; // gray
    }
  };

  return (
    <View style={[styles.card, { width: width as any }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Icon size={20} color={color} />
        </View>
        <Text style={[styles.trend, { color: getTrendColor() }]}>
          {trend}
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
  },
  trend: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
