import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { AuthService, UserService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadedUser = AuthService.getCurrentUser();
    if (loadedUser) {
      setUser(loadedUser);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // Heartbeat for online status
  useEffect(() => {
    if (!isAuthenticated) return;

    const ping = async () => {
        try {
            await UserService.ping();
        } catch (error) {
            console.error('Ping failed', error);
        }
    };

    ping(); // Initial ping
    const interval = setInterval(ping, 60000); // Ping every minute

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData: User) => {
      setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
