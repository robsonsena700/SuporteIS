
import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { mockTickets, mockUsers } from './mockData';
import { Ticket, User } from './types';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import PasswordRecovery from './pages/PasswordRecovery';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Profile from './pages/Profile';
import NewTicket from './pages/NewTicket';

// Layout
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>(mockTickets);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(mockUsers[0]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthPage = ['/login', '/signup', '/recovery'].includes(location.pathname);

  // Simulated DB Actions
  const addTicket = (ticket: Ticket) => setTickets(prev => [ticket, ...prev]);
  const updateTicket = (updatedTicket: Ticket) => {
    setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('/dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/login');
  };

  const layout = (children: React.ReactNode) => (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden font-sans">
      {!isAuthPage && isAuthenticated && <Sidebar user={currentUser} onLogout={handleLogout} />}
      <main className={`flex-1 overflow-y-auto ${(!isAuthPage && isAuthenticated) ? 'p-4 lg:p-8' : ''}`}>
        {children}
      </main>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={layout(<Login onLogin={handleLogin} />)} />
      <Route path="/signup" element={layout(<Signup onSignup={handleLogin} />)} />
      <Route path="/recovery" element={layout(<PasswordRecovery />)} />
      
      {/* Protected Routes Simulation */}
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
        element={isAuthenticated ? layout(<Profile user={currentUser} />) : <Navigate to="/login" />} 
      />
      <Route 
        path="/new-ticket" 
        element={isAuthenticated ? layout(<NewTicket onAdd={addTicket} />) : <Navigate to="/login" />} 
      />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
