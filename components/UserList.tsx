import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { UserService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

interface UserListProps {
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ onClose, onSelectUser }) => {
  const { user: currentUser } = useAuth();
  const { notifications } = useNotifications();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await UserService.getAll();
        
        let filteredUsers = allUsers.filter((u: User) => u.id !== currentUser?.id);

        if (currentUser?.profile === 'Cliente') {
           // Clients can only see Admin and Support (hide other clients)
           filteredUsers = filteredUsers.filter((u: User) => u.profile !== 'Cliente');
        } 
        // Admin and Support can see everyone (including Clients to chat with them)

        setUsers(filteredUsers);
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const getStatusColor = (user: User) => {
    // Priority: 'busy' set manually > calculated 'online' > 'offline'
    if (user.chatStatus === 'busy') return 'bg-warning';
    // We assume backend sends calculated_status in a field, or we rely on chat_status if it's accurate
    // But since we added calculated_status in backend query:
    const isOnline = user.calculatedStatus === 'online';
    return isOnline ? 'bg-success' : 'bg-gray-400';
  };

  const getStatusLabel = (user: User) => {
    if (user.chatStatus === 'busy') return 'Ocupado';
    const isOnline = user.calculatedStatus === 'online';
    return isOnline ? 'Online' : 'Offline';
  };

  const getUnreadCountForUser = (userId: string) => {
    return notifications.filter(n => n.type === 'new_dm' && n.referenceId === userId && !n.isRead).length;
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 bg-background-surface border border-border-dark rounded-xl shadow-2xl z-50 flex flex-col max-h-[500px]"
    >
      <div className="p-4 border-b border-border-dark bg-background-card/50 rounded-t-xl">
        <h3 className="text-white font-bold text-sm">Equipe</h3>
      </div>

      <div className="overflow-y-auto flex-1 p-2 gap-1 flex flex-col">
        {loading ? (
          <div className="p-4 text-center text-text-secondary text-xs">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-xs">Nenhum usuário disponível.</div>
        ) : (
          users.map((user) => {
            const unread = getUnreadCountForUser(user.id);
            return (
              <div 
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="p-2 rounded-lg cursor-pointer hover:bg-background-input transition-colors flex items-center gap-3 group relative"
              >
                <div className="relative">
                  <div 
                    className="size-10 rounded-full bg-cover bg-center border border-border-dark"
                    style={{ backgroundImage: `url(${user.avatar || 'https://ui-avatars.com/api/?name=' + user.name})` }}
                  />
                  <div 
                    className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-background-surface ${getStatusColor(user)}`} 
                    title={getStatusLabel(user)}
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-text-secondary truncate">{getStatusLabel(user)}</p>
                </div>
                
                {unread > 0 ? (
                   <div className="size-5 bg-primary rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-[10px] text-white font-bold">{unread}</span>
                   </div>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserList;
