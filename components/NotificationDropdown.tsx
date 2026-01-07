import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { formatNotificationTime } from '../utils/dateUtils';

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationClick?: (notification: any) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose, onNotificationClick }) => {
  const { notifications, markAsRead, markAllAsRead, soundEnabled, toggleSound } = useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (onNotificationClick) {
        onNotificationClick(notification);
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 top-12 w-96 bg-background-surface border border-border-dark rounded-xl shadow-2xl z-50 flex flex-col max-h-[500px]"
    >
      <div className="p-4 border-b border-border-dark flex justify-between items-center bg-background-card/50 rounded-t-xl">
        <div className="flex items-center gap-3">
            <h3 className="text-white font-bold text-sm">Notificações</h3>
            <button 
                onClick={toggleSound} 
                className={`text-xs flex items-center gap-1 ${soundEnabled ? 'text-primary' : 'text-text-secondary'}`}
                title={soundEnabled ? 'Som ativado' : 'Som desativado'}
            >
                <span className="material-symbols-outlined text-[16px]">{soundEnabled ? 'volume_up' : 'volume_off'}</span>
            </button>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={markAllAsRead}
            className="text-[10px] text-primary hover:text-primary-hover font-bold uppercase tracking-wider transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 p-2 gap-2 flex flex-col">
        {notifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center gap-3 opacity-50">
            <span className="material-symbols-outlined text-4xl">notifications_off</span>
            <p className="text-sm">Nenhuma notificação nova</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`
                p-3 rounded-lg cursor-pointer transition-all border
                ${notification.isRead 
                  ? 'bg-transparent border-transparent hover:bg-background-input/50 opacity-60' 
                  : 'bg-background-input border-border-dark hover:border-primary/50'
                }
              `}
            >
              <div className="flex gap-3">
                <div className={`
                  size-8 rounded-full flex items-center justify-center shrink-0
                  ${notification.type === 'new_message' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}
                `}>
                  <span className="material-symbols-outlined text-lg">
                    {notification.type === 'new_message' ? 'chat' : 'info'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  <p className="text-sm text-white leading-snug">{notification.content}</p>
                  <span className="text-[10px] text-text-secondary">
                    {formatNotificationTime(notification.createdAtIso)}
                  </span>
                </div>
                {!notification.isRead && (
                  <div className="shrink-0 mt-1.5">
                    <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-border-dark bg-background-card/30 rounded-b-xl text-center">
        <button className="text-xs text-text-secondary hover:text-white transition-colors">
          Ver histórico completo
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
