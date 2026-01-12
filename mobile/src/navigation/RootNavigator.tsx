import React from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TicketsScreen } from '../screens/TicketsScreen';
import { UsersScreen } from '../screens/UsersScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { NewTicketScreen } from '../screens/NewTicketScreen';
import { TicketDetailScreen } from '../screens/TicketDetailScreen';
import { LayoutDashboard, Ticket, Users, BarChart, Settings } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="TicketsTab" 
        component={TicketsScreen} 
        options={{
          tabBarLabel: 'Chamados',
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} />,
        }}
      />
      
      {/* Conditionally render Users tab based on role */}
      {user?.profile !== 'Cliente' && (
        <Tab.Screen 
          name="UsersTab" 
          component={UsersScreen} 
          options={{
            tabBarLabel: 'Usuários',
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          }}
        />
      )}

      <Tab.Screen 
        name="ReportsTab" 
        component={ReportsScreen} 
        options={{
          tabBarLabel: 'Relatórios',
          tabBarIcon: ({ color, size }) => <BarChart color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="NewTicket" component={NewTicketScreen} />
            <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
