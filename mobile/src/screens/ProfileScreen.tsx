import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { LogOut } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{user?.name}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>Perfil</Text>
          <Text style={styles.value}>{user?.profile}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutText}>Sair do Sistema</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  infoCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
