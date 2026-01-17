import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { api, setUnauthorizedCallback } from '../api/api';
import { User } from '../types';
import { UserService } from '../services/userService';
import { setStorageItem, getStorageItem, removeStorageItem } from '../utils/storage';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      try {
        const token = await getStorageItem('token');
        const userStr = await getStorageItem('user');

        if (token && userStr) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(JSON.parse(userStr));
        }
      } catch (error) {
        console.error('Error loading auth data', error);
      } finally {
        setLoading(false);
      }
    }

    loadStorageData();

    // Register callback for 401 Unauthorized responses
    setUnauthorizedCallback(async () => {
      await signOut();
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const ping = async () => {
      try {
        await UserService.ping();
      } catch (error) {
        console.error('Ping failed', error);
      }
    };

    ping();
    const interval = setInterval(ping, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  async function signIn(email: string, password: string) {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      const mappedUser: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        chatStatus: user.chat_status,
        calculatedStatus: user.calculated_status,
        lastAccess: user.last_access,
        profile: user.profile,
        company: user.company,
        phone: user.phone,
        department: user.department,
        uf: user.uf,
        municipality: user.municipality
      };

      await setStorageItem('token', token);
      
      // Don't store avatar in SecureStore to avoid size limits (2048 bytes on Android)
      const userToStore = { ...mappedUser, avatar: null };
      await setStorageItem('user', JSON.stringify(userToStore));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(mappedUser);
    } catch (error: any) {
      console.error('SignIn Error:', error);
      if (error.response) {
          console.error('Response Data:', error.response.data);
          console.error('Response Status:', error.response.status);
      } else if (error.request) {
          console.error('Request Error (No Response):', error.request);
      } else {
          console.error('Setup Error:', error.message);
      }
      throw error;
    }
  }

  async function signUp(data: any) {
    try {
      console.log('Sending register payload:', data);
      await api.post('/auth/register', data);
      // Automatically log in after sign up
      await signIn(data.email, data.password);
    } catch (error: any) {
      console.error('SignUp Error:', error);
      if (error.response) {
        console.error('SignUp Response Error:', error.response.data);
      }
      throw error;
    }
  }

  async function signOut() {
    await removeStorageItem('token');
    await removeStorageItem('user');
    api.defaults.headers.common['Authorization'] = '';
    setUser(null);
  }

  async function updateUser(userData: Partial<User>) {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    // Don't store avatar in SecureStore to avoid size limits
    const userToStore = { ...updatedUser, avatar: null };
    await setStorageItem('user', JSON.stringify(userToStore));
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
