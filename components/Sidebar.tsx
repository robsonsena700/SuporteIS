
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User } from '../types';

interface SidebarProps {
  user: User | null;
  onLogout?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Meus Chamados', path: '/tickets', icon: 'confirmation_number' },
    { label: 'Equipamentos', path: '/equipments', icon: 'devices' },
    { label: 'Usuários', path: '/users', icon: 'group' },
    { label: 'Relatórios', path: '/reports', icon: 'analytics' },
    { label: 'Configurações', path: '/profile', icon: 'settings' },
  ];

  return (
    <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-border-dark bg-background-surface p-5 shrink-0 h-screen transition-all duration-300">
      <div className="flex flex-col gap-8">
        {/* Profile / Brand */}
        <div className="flex gap-3 items-center">
          <div 
            className="size-12 rounded-full bg-cover bg-center border-2 border-primary ring-2 ring-primary/20 shadow-lg"
            style={{ backgroundImage: `url(${user?.avatar})` }}
          />
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-white text-base font-bold leading-tight truncate">{user?.name || 'TechSupport'}</h1>
            <p className="text-text-secondary text-xs font-normal truncate">{user?.role || 'Painel Administrativo'}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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
  );
};

export default Sidebar;
