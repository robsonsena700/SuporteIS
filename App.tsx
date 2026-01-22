
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { mockUsers } from './mockData'; // Keep mockUsers for now or replace later
import { Ticket, User } from './types';
import { TicketService } from './services/api';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import PasswordRecovery from './pages/PasswordRecovery';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Profile from './pages/Profile';
import NewTicket from './pages/NewTicket';
import Reports from './pages/Reports';
import LogoManager from './pages/LogoManager';

// Layout
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';

const App: React.FC = () => {
  const { user, isAuthenticated, loading, login, logout, updateUser: contextUpdateUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ['/login', '/signup', '/recovery'].includes(location.pathname);

  // Fetch Tickets when Authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    }
  }, [isAuthenticated]);

  const loadTickets = async () => {
    try {
      const data = await TicketService.getAll();
      setTickets(data);
    } catch (error) {
      console.error('Failed to load tickets', error);
    }
  };

  const addTicket = async (ticket: Ticket) => {
    // Optimistic update or wait for reload?
    // Let's rely on Tickets page to fetch or App to re-fetch
    await loadTickets();
  };

  const updateTicket = async (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    // In a real app, we would call API here too, but Tickets page might handle specific updates
  };

  const handleUpdateUser = (updatedUser: User) => {
    contextUpdateUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleLogin = (userData?: User) => {
    if (userData) {
        login(userData);
        navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const layout = (children: React.ReactNode) => (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden font-sans relative">
      {!isAuthPage && isAuthenticated && (
        <Sidebar 
          user={user} 
          onLogout={handleLogout} 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        {!isAuthPage && isAuthenticated && (
          <Header 
            user={user} 
            onChatSelect={setActiveChatUser} 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onLogout={handleLogout}
          />
        )}
        <main className={`flex-1 overflow-y-auto ${(!isAuthPage && isAuthenticated) ? 'p-4 lg:p-8' : ''} transition-all`}>
          <Suspense fallback={<div className="flex items-center justify-center h-full text-white">Carregando...</div>}>
            {children}
          </Suspense>
        </main>
        {activeChatUser && (
          <ChatWindow 
            recipient={activeChatUser} 
            onClose={() => setActiveChatUser(null)} 
          />
        )}
      </div>
    </div>
  );

  if (loading) return <div className="flex h-screen items-center justify-center bg-background-dark text-white">Carregando...</div>;

  return (
    <Routes>
      <Route path="/login" element={layout(<Login onLogin={handleLogin} />)} />
      <Route path="/signup" element={layout(<Signup onSignup={handleLogin} />)} />
      <Route path="/recovery" element={layout(<PasswordRecovery />)} />
      
      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={isAuthenticated ? layout(<Dashboard tickets={tickets} />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/tickets" 
        element={isAuthenticated ? layout(<Tickets tickets={tickets} onUpdate={updateTicket} />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/users" 
        element={isAuthenticated ? layout(<Users users={users} />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/profile" 
        element={isAuthenticated ? layout(<Profile user={user} onUpdate={handleUpdateUser} />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/new-ticket" 
        element={isAuthenticated ? layout(<NewTicket onAdd={addTicket} />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/reports" 
        element={isAuthenticated ? layout(<Reports />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/settings/logos" 
        element={isAuthenticated ? layout(<LogoManager />) : <Navigate to="/login" />} 
      />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
