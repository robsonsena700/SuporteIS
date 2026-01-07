
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isOpen = false, onClose }) => {
  const location = useLocation();
  const allNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Meus Chamados', path: '/tickets', icon: 'confirmation_number' },
    { label: 'Usuários', path: '/users', icon: 'group' },
    { label: 'Relatórios', path: '/reports', icon: 'analytics' },
    { label: 'Perfil', path: '/profile', icon: 'settings' },
  ];

  const navItems = allNavItems.filter(item => {
    if (user?.profile === 'Cliente') {
      return !['Equipamentos', 'Usuários'].includes(item.label);
    }
    return true;
  });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 flex flex-col justify-between border-r border-border-dark bg-background-surface p-5 shrink-0 h-screen transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Brand */}
          <div className="flex gap-3 items-center justify-between">
            <div className="flex gap-3 items-center">
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-white text-xl font-bold leading-tight truncate tracking-wide">
                  <span className="text-primary">IS</span> Suporte
                </h1>
                <p className="text-text-secondary text-xs font-normal truncate">Sistema de Gerenciamento</p>
              </div>
            </div>
            {/* Mobile Close Button */}
            <button 
              onClick={onClose}
              className="lg:hidden p-1 text-text-secondary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose?.()}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-lg transition-all group
                ${isActive 
                  ? 'bg-primary/20 text-white border-l-4 border-primary' 
                  : 'text-text-secondary hover:bg-background-card hover:text-white'
                }
              `}
            >
              <span className={`material-symbols-outlined text-[22px] ${location.pathname === item.path ? 'filled text-primary' : ''}`}>
                  {item.icon}
              </span>
              <p className="text-sm font-medium">{item.label}</p>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <NavLink 
          to="/new-ticket"
          className="flex w-full items-center justify-center gap-2 rounded-lg h-12 px-4 bg-primary hover:bg-primary-hover transition-all text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span className="truncate">Novo Chamado</span>
        </NavLink>
        
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-text-muted hover:text-red-400 transition-colors group"
        >
          <span className="material-symbols-outlined text-[22px] group-hover:text-red-400">logout</span>
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
