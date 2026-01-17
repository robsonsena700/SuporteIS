import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Notification } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { UserService } from '../services/api';
import NotificationDropdown from './NotificationDropdown';
import UserList from './UserList';

interface HeaderProps {
  user: User | null;
  onChatSelect: (user: User) => void;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onChatSelect, onToggleSidebar, onLogout }) => {
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const navigate = useNavigate();

  const isClientProfile =
    user?.profile === 'Cliente' ||
    user?.role === 'Cliente' ||
    user?.role === 'client';

  const canShowTeamButton = !!user && !isClientProfile;

  const handleNotificationSelect = async (notification: Notification) => {
    try {
        console.log(`[Notification] Clicked notification: ${notification.id}, type: ${notification.type}`);
        setShowNotifications(false);
        
        if (notification.type === 'new_message') {
      console.log(`[Notification] Navigating to tickets for notification: ${notification.id}`);
      // Navigate to tickets page with state to open specific ticket
      navigate('/tickets', { state: { openTicketId: notification.referenceId } });
    } else if (notification.type === 'new_dm') {
            console.log(`[Notification] Opening chat for user: ${notification.referenceId}`);
            // Fetch user details to open chat
            const chatUser = await UserService.getById(notification.referenceId);
            if (chatUser) {
                onChatSelect(chatUser);
            } else {
                console.warn(`[Notification] User not found for DM notification: ${notification.referenceId}`);
            }
        }
    } catch (error) {
        console.error(`[Notification] Error handling notification click:`, error);
        // Optionally show a toast error here
    }
  };

  return (
    <header className="h-16 border-b border-border-dark bg-background-surface flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-40">
      {/* Left side - Breadcrumbs or Title */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 text-text-secondary hover:text-white"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        )}
        <h2 className="text-white font-bold text-lg">
           SupportTech Pro
        </h2>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-4">
        {/* Team / Users Dropdown - Only for non-clients */}
        {canShowTeamButton && (
          <div className="relative">
            <button 
              onClick={() => { setShowUserList(!showUserList); setShowNotifications(false); }}
              className="size-10 rounded-xl bg-background-input hover:bg-background-card border border-border-dark flex items-center justify-center text-text-secondary hover:text-white transition-all relative"
              title="Equipe & Chat"
            >
              <span className="material-symbols-outlined">group</span>
            </button>
            {showUserList && (
              <UserList 
                onClose={() => setShowUserList(false)} 
                onSelectUser={(u) => {
                  onChatSelect(u);
                  setShowUserList(false);
                }} 
              />
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); setShowUserList(false); }}
            className={`
              size-10 rounded-xl border flex items-center justify-center transition-all relative
              ${showNotifications 
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                : 'bg-background-input hover:bg-background-card border-border-dark text-text-secondary hover:text-white'
              }
            `}
            title="Notificações"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full border-2 border-background-surface flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
          </button>
          {showNotifications && (
            <NotificationDropdown 
                onClose={() => setShowNotifications(false)} 
                onNotificationClick={handleNotificationSelect}
            />
          )}
        </div>

        {/* New Ticket */}
        <button
          onClick={() => navigate('/new-ticket')}
          className="h-10 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 border border-primary/30 transition-all active:scale-95"
          title="Abrir novo chamado"
        >
          + Novo Chamado
        </button>

        <div className="h-8 w-px bg-border-dark mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-white">{user?.name}</span>
            <span className="text-[10px] text-text-secondary">{user?.profile}</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="size-8 rounded-full flex items-center justify-center text-text-secondary hover:text-white transition-colors ml-1"
              title="Sair"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
