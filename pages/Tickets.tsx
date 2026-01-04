
import React, { useState } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, Message } from '../types';
import { mockUsers } from '../mockData';

interface TicketsProps {
  tickets: Ticket[];
  onUpdate: (ticket: Ticket) => void;
}

const Tickets: React.FC<TicketsProps> = ({ tickets, onUpdate }) => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showTransferList, setShowTransferList] = useState(false);

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(filter.toLowerCase()) || 
    t.id.toLowerCase().includes(filter.toLowerCase())
  );

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
      case TicketStatus.IN_PROGRESS: return 'bg-primary/20 text-primary border-primary/30';
      case TicketStatus.RESOLVED: return 'bg-success/10 text-success border-success/20';
      default: return 'bg-background-input text-text-muted border-border-dark';
    }
  };

  const handleSendMessage = () => {
    if (!selectedTicket || !replyText.trim()) return;

    const newMessage: Message = {
      id: `m-${Date.now()}`,
      senderId: 'u1', // Ricardo Mendes (current user)
      senderName: 'Você',
      content: replyText,
      timestamp: 'Agora mesmo'
    };

    const updatedTicket = { ...selectedTicket };
    updatedTicket.messages = [...updatedTicket.messages, newMessage];
    
    // Auto-assignment logic: if no technician, assign to current user on first reply
    if (!updatedTicket.technician || updatedTicket.technician === 'Ninguém') {
      updatedTicket.technician = 'Ricardo Mendes';
      updatedTicket.technicianAvatar = 'https://picsum.photos/seed/ricardo/200';
      updatedTicket.status = TicketStatus.IN_PROGRESS;
    }

    onUpdate(updatedTicket);
    setSelectedTicket(updatedTicket);
    setReplyText('');
  };

  const handleTransfer = (technician: User) => {
    if (!selectedTicket) return;
    
    const updatedTicket = { ...selectedTicket };
    updatedTicket.technician = technician.name;
    updatedTicket.technicianAvatar = technician.avatar;
    
    // Add internal message about the transfer
    updatedTicket.messages.push({
      id: `transfer-${Date.now()}`,
      senderId: 'system',
      senderName: 'Sistema',
      content: `Chamado encaminhado para ${technician.name}`,
      timestamp: 'Agora mesmo',
      isInternal: true
    });

    onUpdate(updatedTicket);
    setSelectedTicket(updatedTicket);
    setShowTransferList(false);
  };

  const technicians = mockUsers.filter(u => u.profile === 'Suporte Técnico' || u.profile === 'Administrador');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-white text-3xl font-black">Central de Atendimento</h1>
          <p className="text-text-secondary">Gerenciamento de fila de suporte técnico</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-background-card rounded-xl border border-border-dark">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
          <span className="text-[11px] font-bold text-white uppercase tracking-widest">Status: Online</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-background-card rounded-2xl border border-border-dark overflow-hidden shadow-xl">
        <div className="p-5 border-b border-border-dark flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Buscar ticket, ID ou cliente..."
              className="w-full h-11 pl-10 pr-4 bg-background-input border border-border-dark rounded-xl text-sm text-white focus:ring-1 focus:ring-primary transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <button className="h-11 px-6 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Filtrar Resultados
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background-surface/50 border-b border-border-dark">
              <tr>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ticket</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Assunto</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Prioridade</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Status</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-wider">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="group hover:bg-background-input/40 transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                  <td className="p-4 text-xs font-mono text-text-secondary">{ticket.id}</td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-medium">{ticket.subject}</span>
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

      {/* Detail Modal Overlay - Matching the provided image */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-[#1f2937] w-full max-w-[900px] h-[600px] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <header className="p-6 border-b border-[#1f2937] flex justify-between items-start bg-[#111827]">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-tighter mb-1">{selectedTicket.id}</span>
                  <div className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(19,91,236,0.8)]"></div>
                </div>
                <div>
                  <h2 className="text-white text-lg font-bold leading-tight">{selectedTicket.subject}</h2>
                  <p className="text-text-muted text-xs">Elias Boutala • Aberto há 2h</p>
                </div>
              </div>
              <button onClick={() => { setSelectedTicket(null); setReplyText(''); setShowTransferList(false); }} className="text-[#4b5563] hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_280px]">
              
              {/* Left Column: Messages and Input */}
              <div className="flex flex-col h-full bg-[#111827] border-r border-[#1f2937]">
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                  <h4 className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Mensagens / Comentários</h4>
                  
                  <div className="flex flex-col gap-5">
                    {selectedTicket.messages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.senderName === 'Você' ? 'flex-row-reverse' : ''}`}>
                        <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${msg.senderName === 'Você' ? 'bg-primary text-white' : 'bg-[#1f2937] text-text-secondary'}`}>
                          {msg.senderName[0]}
                        </div>
                        <div className={`flex flex-col gap-1 max-w-[70%] ${msg.senderName === 'Você' ? 'items-end' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-white text-[11px] font-bold">{msg.senderName}</span>
                            <span className="text-[9px] text-[#6b7280]">{msg.timestamp}</span>
                          </div>
                          <div className={`p-3 rounded-xl text-sm leading-relaxed ${msg.senderName === 'Você' ? 'bg-[#135bec] text-white rounded-tr-none' : 'bg-[#1f2937] text-white border border-[#374151] rounded-tl-none'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-[#1f2937]">
                  <div className="relative mb-4 group">
                    <textarea 
                      placeholder="Olá"
                      className="w-full h-[120px] bg-[#1a2233] border border-[#374151] rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none resize-none transition-all placeholder:text-[#4b5563]"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 bg-primary rounded-full size-6 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[16px] filled">check</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button className="px-5 h-10 border border-[#374151] text-white text-xs font-bold rounded-lg hover:bg-[#1f2937] transition-all">
                      Anexar
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      className="px-6 h-10 bg-[#135bec] text-white text-xs font-bold rounded-lg hover:bg-[#0f48bd] shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      Enviar Resposta
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Sidebar Details */}
              <div className="flex flex-col h-full bg-[#111827] p-6 gap-8 overflow-y-auto">
                
                {/* Details Section */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Detalhes do Ticket</h4>
                  <div className="bg-[#1a2233]/40 border border-[#374151] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#9ca3af] text-[11px]">Prioridade:</span>
                      <span className="text-[#3b82f6] text-[11px] bg-[#3b82f6]/10 px-2 py-0.5 rounded font-medium border border-[#3b82f6]/20">Baixa</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9ca3af] text-[11px]">Status:</span>
                      <span className="text-[#3b82f6] text-[11px] bg-[#3b82f6]/10 px-2 py-0.5 rounded font-medium border border-[#3b82f6]/20">Aberto</span>
                    </div>
                    <div className="flex justify-between items-center relative">
                      <span className="text-[#9ca3af] text-[11px]">Atribuído:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-white text-[11px] font-bold">{selectedTicket.technician || 'Ninguém'}</span>
                        <button 
                          onClick={() => setShowTransferList(!showTransferList)}
                          className="text-primary hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                        </button>
                      </div>

                      {/* Transfer Dropdown */}
                      {showTransferList && (
                        <div className="absolute right-0 top-6 w-48 bg-[#1f2937] border border-[#374151] rounded-xl shadow-2xl z-10 py-2">
                          <p className="px-4 py-1 text-[9px] font-bold text-text-muted uppercase">Transferir para:</p>
                          {technicians.map(tech => (
                            <button 
                              key={tech.id}
                              onClick={() => handleTransfer(tech)}
                              className="w-full text-left px-4 py-2 text-xs text-white hover:bg-primary transition-colors flex items-center gap-2"
                            >
                              <div className="size-4 rounded-full overflow-hidden bg-background-dark">
                                <img src={tech.avatar} alt="" />
                              </div>
                              {tech.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Equipment Section */}
                <div className="flex flex-col gap-4">
                  <h4 className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Equipamento</h4>
                  <div className="bg-[#1a2233]/40 border border-[#374151] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#6b7280] text-[9px] uppercase font-bold tracking-wider">Modelo</span>
                      <span className="text-white text-[11px] font-bold">{selectedTicket.equipmentDetails?.model || selectedTicket.equipment}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#6b7280] text-[9px] uppercase font-bold tracking-wider">S/N</span>
                      <span className="text-white text-[11px] font-mono">{selectedTicket.equipmentDetails?.serialNumber || 'VNC - 998877'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[#6b7280] text-[9px] uppercase font-bold tracking-wider">Garantia</span>
                      <span className="text-[#10b981] text-[11px] font-bold">Ativa</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <button 
                    onClick={() => {
                      onUpdate({ ...selectedTicket, status: TicketStatus.RESOLVED });
                      setSelectedTicket(null);
                    }}
                    className="w-full h-11 border border-[#10b981]/30 bg-[#10b981]/5 text-[#10b981] text-[11px] font-bold rounded-xl hover:bg-[#10b981] hover:text-white transition-all active:scale-95"
                  >
                    Marcar como Resolvido
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
