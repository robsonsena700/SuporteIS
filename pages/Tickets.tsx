import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Ticket, TicketStatus, TicketPriority, User, Message } from '../types';
import { TicketService, UserService } from '../services/api';
import TicketDetailModal from '../components/TicketDetailModal';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface TicketsProps {
  tickets: Ticket[];
  onUpdate: (ticket: Ticket) => void;
}

const Tickets: React.FC<TicketsProps> = ({ tickets, onUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { notifications, markAsRead } = useNotifications();
  const location = useLocation();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets);
  const [newTicketsIds, setNewTicketsIds] = useState<Set<string>>(new Set());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'Sistema' | 'Equipamento' | 'Concluído'>('Sistema');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Ticket; direction: 'asc' | 'desc' } | null>(null);
  const [technicians, setTechnicians] = useState<User[]>([]);

  // Helper to check for unread messages related to ticket
  const hasUnreadMessages = (ticketId: string) => {
    return notifications.some(n => n.type === 'new_message' && n.referenceId === ticketId && !n.isRead);
  };

  const markTicketNotificationsAsRead = async (ticketId: string) => {
    const related = notifications.filter(n => n.type === 'new_message' && n.referenceId === ticketId && !n.isRead);
    for (const notification of related) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read for ticket', ticketId, error);
      }
    }
  };

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  // Fetch Technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const users = await UserService.getAll();
        const techUsers = users.filter(u => u.profile === 'Suporte Técnico' || u.profile === 'Administrador');
        setTechnicians(techUsers);
      } catch (error) {
        console.error('Failed to fetch technicians', error);
      }
    };
    fetchTechnicians();
  }, []);

  // Handle auto-open from notification
  useEffect(() => {
      const state = location.state as { openTicketId?: string };
      if (state?.openTicketId) {
          console.log(`[Tickets] Auto-opening ticket from state: ${state.openTicketId}`);
          // Find ticket in current list or fetch it
          // Note: localTickets might not be fully loaded yet if initial load, 
          // but handleTicketClick fetches details by ID anyway.
          // We construct a partial ticket object to trigger handleTicketClick
          const ticketStub = { id: state.openTicketId } as Ticket;
          handleTicketClick(ticketStub);
          
          // Clear state to prevent re-opening on re-render (optional, but good practice)
          window.history.replaceState({}, document.title);
      }
  }, [location.state]);

  // Polling Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isAutoRefresh) {
        interval = setInterval(async () => {
            try {
                const updatedList = await TicketService.getAll();
                
                // Identify new tickets
                const currentIds = new Set(localTickets.map(t => t.id));
                const newIds = new Set<string>();
                
                updatedList.forEach(t => {
                    if (!currentIds.has(t.id)) {
                        newIds.add(t.id);
                    }
                });

                if (newIds.size > 0) {
                    setNewTicketsIds(prev => {
                        const next = new Set(prev);
                        newIds.forEach(id => next.add(id));
                        return next;
                    });
                }
                
                // Preserve local changes/optimistic updates if necessary, but here we overwrite
                // We might want to merge, but simpler to replace list and rely on React key diff
                setLocalTickets(updatedList);
            } catch (error) {
                console.error('Polling failed', error);
            }
        }, 30000); // 30 seconds
    }

    return () => clearInterval(interval);
  }, [isAutoRefresh, localTickets]);

  const handleManualRefresh = async () => {
    try {
        const updatedList = await TicketService.getAll();
        setLocalTickets(updatedList);
        setNewTicketsIds(new Set()); // Clear highlights on manual refresh? Or keep them? Let's clear.
    } catch (error) {
        console.error('Manual refresh failed', error);
    }
  };

  const filteredTickets = localTickets.filter(t => {
    const matchesFilter = 
        t.id.toLowerCase().includes(filter.toLowerCase()) || 
        t.subject.toLowerCase().includes(filter.toLowerCase()) ||
        t.priority.toLowerCase().includes(filter.toLowerCase()) ||
        t.status.toLowerCase().includes(filter.toLowerCase()) ||
        (t.creatorName && t.creatorName.toLowerCase().includes(filter.toLowerCase())) ||
        (t.technician && t.technician.toLowerCase().includes(filter.toLowerCase()));

    if (!matchesFilter) return false;

    if (activeTab === 'Concluído') {
        return t.status === TicketStatus.RESOLVED;
    }

    // For other tabs, exclude resolved tickets
    if (t.status === TicketStatus.RESOLVED) return false;

    if (activeTab === 'Sistema') {
        const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro'];
        const equipment = t.equipment || '';
        const subject = t.subject || '';
        const textToCheck = (equipment + ' ' + subject).toLowerCase();
        return keywords.some(k => textToCheck.includes(k));
    }
    
    if (activeTab === 'Equipamento') {
        const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro'];
        const equipment = t.equipment || '';
        const subject = t.subject || '';
        const textToCheck = (equipment + ' ' + subject).toLowerCase();
        return !keywords.some(k => textToCheck.includes(k));
    }

    return true;
  });

  const sortedTickets = React.useMemo(() => {
    if (!sortConfig) return filteredTickets;
    const { key, direction } = sortConfig;
    const dir = direction === 'asc' ? 1 : -1;
    return [...filteredTickets].sort((a, b) => {
      const av = (a as any)[key];
      const bv = (b as any)[key];
      if (key === 'createdAt') {
        const ad = av ? new Date(av).getTime() : 0;
        const bd = bv ? new Date(bv).getTime() : 0;
        return (ad - bd) * dir;
      }
      if (key === 'rating') {
        const ar = a.rating ?? 0;
        const br = b.rating ?? 0;
        return (ar - br) * dir;
      }
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      return as.localeCompare(bs) * dir;
    });
  }, [filteredTickets, sortConfig]);

  const handleSort = (key: keyof Ticket) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getPriorityStyle = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.HIGH: return 'bg-red-500/10 text-red-500 border-red-500/20';
      case TicketPriority.MEDIUM: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case TicketPriority.LOW: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-background-input text-text-muted border-border-dark';
    }
  };

  const getStatusStyle = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.OPEN: return 'bg-primary/10 text-primary border-primary/20';
      case TicketStatus.IN_ANALYSIS: return 'bg-warning/10 text-warning border-warning/20';
      case TicketStatus.IN_PROGRESS: return 'bg-primary/20 text-primary border-primary/30';
      case TicketStatus.FORWARDED_ACQUISITION: return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case TicketStatus.IN_ROUTE: return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case TicketStatus.RESOLVED: return 'bg-success/10 text-success border-success/20';
      default: return 'bg-background-input text-text-muted border-border-dark';
    }
  };

  const handleTicketClick = async (ticket: Ticket) => {
    setLoadingDetails(true);
    // Remove from new tickets highlight
    if (newTicketsIds.has(ticket.id)) {
        const next = new Set(newTicketsIds);
        next.delete(ticket.id);
        setNewTicketsIds(next);
    }

    try {
      const fullTicket = await TicketService.getById(ticket.id);
      setSelectedTicket(fullTicket);
      await markTicketNotificationsAsRead(fullTicket.id);
    } catch (error: any) {
      console.error('Failed to fetch ticket details', error);
      const status = error?.response?.status;
      if (status === 403) {
        toast.error('Acesso não autorizado ao chamado.');
      } else {
        toast.error('Erro ao carregar detalhes do chamado.');
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleModalUpdate = (updatedTicket: Ticket) => {
      // Update local list
      setLocalTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      onUpdate(updatedTicket); // Propagate up if needed
      setSelectedTicket(updatedTicket);
  };

  const showRating = activeTab === 'Concluído' && (user?.profile === 'Cliente' || user?.profile === 'Administrador');

  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  const toggleExpandSubject = (id: string) => {
    setExpandedTicketId(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    if (selectedTicket) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedTicket]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-white text-3xl font-black">Central de Atendimento</h1>
          <p className="text-text-secondary">Gerenciamento de fila de suporte técnico</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/new-ticket')}
            className="h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 border border-primary/30 transition-all active:scale-95"
            title="Abrir novo chamado"
          >
            + Novo Chamado
          </button>
          <div className="flex gap-2 bg-background-card p-1 rounded-lg border border-border-dark">
            {['Sistema', 'Equipamento', 'Concluído'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                        activeTab === tab 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'text-text-secondary hover:text-white hover:bg-white/5'
                    }`}
                >
                    {tab}
                </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-background-card rounded-xl border border-border-dark overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border-dark flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
            <input 
              type="text" 
              placeholder="Buscar por ID, assunto, status, prioridade, relator ou técnico..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 h-10 bg-background-input border border-border-dark rounded-lg text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-text-muted/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`flex items-center gap-2 h-10 px-4 rounded-lg font-bold text-sm transition-all border ${
                    isAutoRefresh 
                    ? 'bg-success/10 text-success border-success/20' 
                    : 'bg-background-input text-text-muted border-border-dark hover:text-white'
                }`}
                title={isAutoRefresh ? "Atualização automática ligada" : "Atualização automática desligada"}
            >
                <span className="material-symbols-outlined text-[20px]">{isAutoRefresh ? 'sync' : 'sync_disabled'}</span>
                <span className="hidden md:inline">{isAutoRefresh ? 'Auto' : 'Manual'}</span>
            </button>
            <button 
                onClick={handleManualRefresh}
                className="flex items-center gap-2 h-10 px-4 bg-background-input text-text-secondary border border-border-dark rounded-lg font-bold text-sm hover:text-white hover:border-text-secondary transition-all"
                title="Atualizar agora"
            >
                <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>
        </div>

        <div className="p-4">
          {sortedTickets.length === 0 && (
            <div className="px-6 py-16 text-center text-text-muted border border-dashed border-border-dark rounded-2xl">
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-4xl">inbox</span>
                <p className="text-sm">Nenhum chamado encontrado nesta categoria.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedTickets.map((ticket) => {
              const createdLabel = ticket.createdAt
                ? (() => {
                    const d = new Date(ticket.createdAt);
                    if (Number.isNaN(d.getTime())) return '-';
                    const dd = String(d.getDate()).padStart(2, '0');
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const yyyy = d.getFullYear();
                    const hh = String(d.getHours()).padStart(2, '0');
                    const min = String(d.getMinutes()).padStart(2, '0');
                    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
                  })()
                : '-';

              const ratingColor =
                ticket.rating && ticket.rating >= 4
                  ? 'text-yellow-400'
                  : ticket.rating && ticket.rating <= 2
                  ? 'text-red-400'
                  : 'text-yellow-300';

              return (
                <button
                  key={ticket.id}
                  onClick={() => handleTicketClick(ticket)}
                  className={`w-full text-left rounded-2xl border border-border-dark bg-background-surface/80 hover:bg-background-input/60 transition-all shadow-lg shadow-black/30 flex flex-col gap-3 p-4 focus:outline-none focus:ring-2 focus:ring-primary ${
                    newTicketsIds.has(ticket.id) ? 'ring-2 ring-primary/60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/30">
                          {ticket.code || `CH-${ticket.id.slice(0, 4).toUpperCase()}`}
                        </span>
                        {hasUnreadMessages(ticket.id) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-red-400">Nova mensagem</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-text-muted flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {createdLabel}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-text-muted">flag</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityStyle(ticket.priority)}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary shrink-0">description</span>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold text-white ${
                            expandedTicketId === ticket.id ? '' : 'line-clamp-2'
                          }`}
                        >
                          {ticket.subject}
                        </p>
                        {ticket.subject && ticket.subject.length > 80 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandSubject(ticket.id);
                            }}
                            className="mt-1 text-[11px] font-semibold text-primary hover:text-primary/80"
                          >
                            {expandedTicketId === ticket.id ? 'Ver menos' : 'Ver mais'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                      <span className="material-symbols-outlined text-[16px] text-text-muted">person</span>
                      <span className="font-medium text-white">
                        {ticket.creatorName || 'Sistema'}
                      </span>
                      {ticket.municipality && (
                        <span className="text-[11px] text-text-muted">• {ticket.municipality}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                      <div className="size-7 rounded-full bg-background-input border border-border-dark overflow-hidden flex items-center justify-center">
                        {ticket.technicianAvatar ? (
                          <img src={ticket.technicianAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-text-muted">engineering</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-white">
                          {ticket.technician || 'Sem responsável'}
                        </span>
                        <span className="text-[11px] text-text-muted">Suporte Técnico</span>
                      </div>
                    </div>
                  </div>

                  {showRating && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px] text-yellow-400">star</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`material-symbols-outlined text-[16px] ${
                                ticket.rating && Number(ticket.rating) >= star ? ratingColor : 'text-gray-600'
                              }`}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="text-[11px] text-text-muted">
                        {ticket.rating ? `${ticket.rating.toFixed(1)} / 5` : 'Não avaliado'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          technicians={technicians}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleModalUpdate}
          onNext={() => {
             const currentIndex = sortedTickets.findIndex(t => t.id === selectedTicket.id);
             if (currentIndex < sortedTickets.length - 1) {
                 handleTicketClick(sortedTickets[currentIndex + 1]);
             }
          }}
          onPrev={() => {
             const currentIndex = sortedTickets.findIndex(t => t.id === selectedTicket.id);
             if (currentIndex > 0) {
                 handleTicketClick(sortedTickets[currentIndex - 1]);
             }
          }}
          hasNext={sortedTickets.findIndex(t => t.id === selectedTicket.id) < sortedTickets.length - 1}
          hasPrev={sortedTickets.findIndex(t => t.id === selectedTicket.id) > 0}
        />
      )}
    </div>
  );
};

export default Tickets;
