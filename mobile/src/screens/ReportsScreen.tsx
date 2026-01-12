import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Header } from '../components/Header';

export const ReportsScreen = () => (
  <View style={styles.container}>
    <Header title="Relatórios" />
    <View style={styles.content}>
      <Text style={styles.subtitle}>Em breve</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
