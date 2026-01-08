import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const icons = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
  warning: 'warning'
};

const colors = {
  success: 'bg-green-500/10 border-green-500/20 text-green-500',
  error: 'bg-red-500/10 border-red-500/20 text-red-500',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
};

const Toast: React.FC<ToastProps> = ({ id, message, type, duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <div className={`
      flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md animate-slide-left bg-[#111827]
      ${colors[type]}
      min-w-[300px] max-w-md pointer-events-auto transition-all duration-300
    `}>
      <span className="material-symbols-outlined text-xl">{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button 
        onClick={() => onClose(id)}
        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
};

export default Toast;
