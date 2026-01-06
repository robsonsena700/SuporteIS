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

  useEffect(() => {
    if (!isAuthenticated) return;

    // Session Management
    let inactivityTimer: NodeJS.Timeout;
    let warningTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 60 * 60 * 1000; // 60 minutes
    const WARNING_TIME = 55 * 60 * 1000; // 55 minutes

    const resetInactivity = () => {
        clearTimeout(inactivityTimer);
        clearTimeout(warningTimer);
        
        warningTimer = setTimeout(() => {
            alert('Sua sessão irá expirar em 5 minutos. Por favor, salve seu trabalho.');
        }, WARNING_TIME);

        inactivityTimer = setTimeout(() => {
            console.warn('Sessão expirada por inatividade.');
            // Log unexpected logout if needed
            logout();
            alert('Sessão expirada por inatividade.');
        }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetInactivity));

    // Initial start
    resetInactivity();

    // Heartbeat for online status & Token Refresh check
    const ping = async () => {
        try {
            await UserService.ping();
        } catch (error: any) {
            console.error('Ping failed', error);
            // If 401, token is expired/invalid.
            // Interceptor usually handles this, but we can double check.
            if (error.response?.status === 401) {
                console.warn('Session expired (detected by ping)');
                logout(); 
            }
        }
    };

    ping(); // Initial ping
    const interval = setInterval(ping, 60000); // Ping every minute

    return () => {
        clearInterval(interval);
        events.forEach(event => document.removeEventListener(event, resetInactivity));
        clearTimeout(inactivityTimer);
        clearTimeout(warningTimer);
    };
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
