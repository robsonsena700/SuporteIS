
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User } from '../types';
import api from '../services/api';

interface SidebarProps {
  user: User | null;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isOpen = false, onClose }) => {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if web logo exists
    const checkLogo = async () => {
      try {
        const timestamp = Date.now();
        // Try to load the image
        const img = new Image();
        img.src = `http://localhost:5000/assets/logos/web/logo_web.png?t=${timestamp}`;
        img.onload = () => setLogoUrl(img.src);
        img.onerror = () => setLogoUrl(null);
      } catch (e) {
        setLogoUrl(null);
      }
    };
    checkLogo();
  }, []);

  const allNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Chamados', path: '/tickets', icon: 'confirmation_number' },
    { label: 'Usuários', path: '/users', icon: 'group' },
    { label: 'Relatórios', path: '/reports', icon: 'analytics' },
    { label: 'Logos', path: '/settings/logos', icon: 'image' },
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
        fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-border-dark bg-background-surface shrink-0 h-screen transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-6 shrink-0 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-3 items-center">
              <div className="flex flex-col overflow-hidden">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo da Empresa" 
                    className="h-12 w-auto object-contain mb-2" 
                  />
                ) : (
                  <h1 className="text-white text-xl font-bold leading-tight truncate tracking-wide">
                    <span className="text-primary">IS</span> Suporte
                  </h1>
                )}
                <p className="text-text-secondary text-xs font-normal truncate">Sistema de Gerenciamento</p>
              </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-text-secondary hover:text-white transition-colors rounded-lg active:bg-white/10"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Navigation - Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose?.()}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 h-12 rounded-xl transition-all group select-none
                  ${isActive 
                    ? 'bg-primary/20 text-white border-l-4 border-primary shadow-lg shadow-primary/10' 
                    : 'text-text-secondary hover:bg-background-card hover:text-white'
                  }
                `}
              >
                <span className={`material-symbols-outlined text-[24px] ${location.pathname === item.path ? 'filled text-primary' : ''}`}>
                    {item.icon}
                </span>
                <p className="text-sm font-bold tracking-wide">{item.label}</p>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Actions - Fixed Bottom Area */}
        <div className="p-6 shrink-0 flex flex-col gap-4 border-t border-white/5 bg-[#111827]/50 backdrop-blur-sm">
          <button 
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-3 h-12 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-95 group"
            aria-label="Sair do Sistema"
          >
            <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">logout</span>
            <span className="text-sm font-bold">Sair do Sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
