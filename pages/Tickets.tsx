import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Ticket, TicketStatus, TicketPriority, User, Message } from '../types';
import { mockUsers } from '../mockData';
import { TicketService } from '../services/api';
import TicketDetailModal from '../components/TicketDetailModal';
import { useNotifications } from '../context/NotificationContext';

interface TicketsProps {
  tickets: Ticket[];
  onUpdate: (ticket: Ticket) => void;
}

const Tickets: React.FC<TicketsProps> = ({ tickets, onUpdate }) => {
  const { notifications } = useNotifications();
  const location = useLocation();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets);
  const [newTicketsIds, setNewTicketsIds] = useState<Set<string>>(new Set());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'Sistema' | 'Equipamento' | 'Concluído'>('Sistema');

  // Helper to check for unread messages related to ticket
  const hasUnreadMessages = (ticketId: string) => {
    return notifications.some(n => n.type === 'new_message' && n.referenceId === ticketId && !n.isRead);
  };

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

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
    let interval: NodeJS.Timeout;

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
        return t.equipment.toLowerCase().includes('sistema') || t.equipment.toLowerCase().includes('software');
    }
    
    if (activeTab === 'Equipamento') {
        return !t.equipment.toLowerCase().includes('sistema') && !t.equipment.toLowerCase().includes('software');
    }

    return true;
  });

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
    } catch (error) {
      console.error('Failed to fetch ticket details', error);
      setSelectedTicket(ticket);
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

  const technicians = mockUsers.filter(u => u.profile === 'Suporte Técnico' || u.profile === 'Administrador');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-white text-3xl font-black">Central de Atendimento</h1>
          <p className="text-text-secondary">Gerenciamento de fila de suporte técnico</p>
        </div>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background-surface/50 border-b border-border-dark">
              <tr>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ticket</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Assunto</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Prioridade</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Relator</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filteredTickets.map((ticket) => (
                <tr 
                    key={ticket.id} 
                    className={`group transition-colors cursor-pointer ${newTicketsIds.has(ticket.id) ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-background-input/40'}`}
                    onClick={() => handleTicketClick(ticket)}
                >
                  <td className="p-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-white text-xs font-bold font-mono tracking-wider">{ticket.code || `CH-${ticket.id.slice(0, 4).toUpperCase()}`}</span>
                      {hasUnreadMessages(ticket.id) && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 rounded border border-primary/30 w-fit">
                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-[9px] font-bold text-primary">NOVA MSG</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                         <span className="text-white text-sm font-medium">{ticket.subject}</span>
                         {hasUnreadMessages(ticket.id) && (
                           <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 shadow-sm animate-bounce" title="Novas mensagens">
                             <span className="material-symbols-outlined text-white text-[12px] font-bold">mail</span>
                           </div>
                         )}
                      </div>
                      <span className="text-text-muted text-[11px]">{ticket.clientName}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityStyle(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusStyle(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                         <div className="size-6 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-[10px] text-white font-bold">
                            {ticket.creatorName ? ticket.creatorName.charAt(0) : '-'}
                         </div>
                         <span className="text-white text-xs font-medium">{ticket.creatorName || 'Sistema'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-background-surface border border-border-dark overflow-hidden flex items-center justify-center">
                        {ticket.technicianAvatar ? <img src={ticket.technicianAvatar} alt="" /> : <span className="material-symbols-outlined text-xs">person</span>}
                      </div>
                      <span className="text-white text-xs font-medium">{ticket.technician || 'Ninguém'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicket && (
          <TicketDetailModal 
            ticket={selectedTicket}
            technicians={technicians}
            onClose={() => setSelectedTicket(null)}
            onUpdate={handleModalUpdate}
          />
      )}
    </div>
  );
};

export default Tickets;