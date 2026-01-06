
import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, Message } from '../types';
import { TicketService } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TicketDetailModalProps {
  ticket: Ticket;
  technicians: User[];
  onClose: () => void;
  onUpdate: (updatedTicket: Ticket) => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, technicians, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [replyText, setReplyText] = useState('');
  const [showTransferList, setShowTransferList] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localTicket, setLocalTicket] = useState<Ticket>(ticket);

  // Sync with prop updates
  useEffect(() => {
    setLocalTicket(ticket);
  }, [ticket]);

  // Auto-assign logic
  const handleInteractionStart = async () => {
    // Check if ticket has no technician and user is tech support/admin
    if (!localTicket.technicianId && user && (user.profile === 'Suporte Técnico' || user.profile === 'Administrador')) {
        try {
            // Assign to current user
            const updated = await TicketService.update(localTicket.id, { technicianId: user.id });
            const refreshed = await TicketService.getById(localTicket.id);
            setLocalTicket(refreshed);
            onUpdate(refreshed);
        } catch (error) {
            console.error('Failed to auto-assign ticket', error);
        }
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim()) return;

    // Ensure assignment before sending if needed
    if (!localTicket.technicianId && user && (user.profile === 'Suporte Técnico' || user.profile === 'Administrador')) {
        await handleInteractionStart();
    }

    try {
      const newMessage = await TicketService.addMessage(localTicket.id, replyText, false);
      
      const updatedTicket = { ...localTicket };
      updatedTicket.messages = [...(updatedTicket.messages || []), newMessage];
      
      onUpdate(updatedTicket); 
      setLocalTicket(updatedTicket);
      setReplyText('');
    } catch (error: any) {
      console.error('Failed to send message', error);
      const errorMessage = error.response?.data?.message || 'Erro ao enviar mensagem. Tente novamente.';
      alert(errorMessage);
    }
  };

  const handleTransfer = async (technician: User) => {
    try {
        console.log(`Transferring ticket ${localTicket.id} to technician ${technician.id} (${technician.name})`);
        await TicketService.update(localTicket.id, { technicianId: technician.id });
        const refreshed = await TicketService.getById(localTicket.id);
        setLocalTicket(refreshed);
        onUpdate(refreshed);
        setShowTransferList(false);
    } catch (error: any) {
        console.error('Failed to transfer ticket', error);
        const errorMessage = error.response?.data?.message || 'Erro ao transferir chamado.';
        alert(errorMessage);
    }
  };

  const handleResolve = async () => {
      try {
          console.log(`Resolving ticket ${localTicket.id}`);
          const updated = await TicketService.update(localTicket.id, { status: TicketStatus.RESOLVED });
          onUpdate(updated);
          setLocalTicket(updated);
      } catch (error: any) {
          console.error('Failed to resolve ticket', error);
          const errorMessage = error.response?.data?.message || 'Erro ao resolver chamado.';
          alert(errorMessage);
      }
  };

  const handleTakeTicket = async () => {
      if (!user) return;
      try {
          await TicketService.update(localTicket.id, { technicianId: user.id });
          const refreshed = await TicketService.getById(localTicket.id);
          setLocalTicket(refreshed);
          onUpdate(refreshed);
      } catch (error) {
          console.error('Error taking ticket', error);
      }
  };

  const isAssignedToOthers = localTicket.technicianId && user && localTicket.technicianId !== user.id;
  const isAssignedToMe = localTicket.technicianId && user && localTicket.technicianId === user.id;
  const isCreator = user && localTicket.creatorId && user.id === localTicket.creatorId;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#111827] border border-[#1f2937] w-full max-w-[95%] lg:max-w-[1200px] h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <header className="p-4 md:p-6 border-b border-[#1f2937] flex justify-between items-start bg-[#111827] shrink-0">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-text-secondary uppercase tracking-tighter mb-1">{localTicket.code || `CH-${localTicket.id.slice(0, 4).toUpperCase()}`}</span>
              <div className={`size-2 rounded-full shadow-[0_0_8px] ${localTicket.status === TicketStatus.RESOLVED ? 'bg-success shadow-success/50' : 'bg-primary shadow-primary/80'}`}></div>
            </div>
            <div>
              <h2 className="text-white text-lg font-bold leading-tight line-clamp-1">{localTicket.subject}</h2>
              <p className="text-text-muted text-xs">{localTicket.clientName} • Criado em {localTicket.createdAt}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#4b5563] hover:text-white transition-colors p-1">
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          
          {/* Chat Section */}
          <div className="flex flex-col h-full bg-[#111827] border-r border-[#1f2937] min-h-0">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
              
              {/* Messages */}
              <div className="flex flex-col gap-5">
                {localTicket.messages && localTicket.messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.senderName === 'Você' ? 'flex-row-reverse' : ''}`}>
                    <div className={`size-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${msg.senderName === 'Você' ? 'bg-primary text-white' : 'bg-[#1f2937] text-text-secondary'}`}>
                      {msg.senderName ? msg.senderName[0] : '?'}
                    </div>
                    <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[70%] ${msg.senderName === 'Você' ? 'items-end' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-[11px] font-bold">{msg.senderName}</span>
                        <span className="text-[9px] text-[#6b7280]">{msg.timestamp}</span>
                      </div>
                      <div className={`p-3 rounded-xl text-sm leading-relaxed break-words ${msg.senderName === 'Você' ? 'bg-[#135bec] text-white rounded-tr-none' : 'bg-[#1f2937] text-white border border-[#374151] rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                {(!localTicket.messages || localTicket.messages.length === 0) && (
                    <div className="text-center text-text-muted text-xs py-10">Nenhuma mensagem ainda.</div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 border-t border-[#1f2937] bg-[#111827]">
               {isAssignedToOthers && user?.profile !== 'Cliente' && !isCreator ? (
                   <div className="flex items-center justify-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm gap-2">
                       <span className="material-symbols-outlined">lock</span>
                       <span>Este chamado está sendo atendido por <strong>{localTicket.technician}</strong>.</span>
                       <button onClick={handleTakeTicket} className="ml-2 underline hover:text-white">Assumir Chamado</button>
                   </div>
               ) : (
                  <>
                    <div className="relative mb-4 group">
                        <textarea 
                        placeholder="Digite sua resposta..."
                        className="w-full h-[100px] md:h-[120px] bg-[#1a2233] border border-[#374151] rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none resize-none transition-all placeholder:text-[#4b5563]"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onFocus={handleInteractionStart}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button className="px-5 h-10 border border-[#374151] text-white text-xs font-bold rounded-lg hover:bg-[#1f2937] transition-all">
                        Anexar
                        </button>
                        <button 
                        onClick={handleSendMessage}
                        disabled={!replyText.trim()}
                        className="px-6 h-10 bg-[#135bec] text-white text-xs font-bold rounded-lg hover:bg-[#0f48bd] shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        Enviar Resposta
                        </button>
                    </div>
                  </>
               )}
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="hidden lg:flex flex-col h-full bg-[#111827] p-6 gap-6 overflow-y-auto border-l border-[#1f2937]">
            
            {/* Status Card */}
            <div className="bg-[#1a2233]/40 border border-[#374151] rounded-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <span className="text-[#9ca3af] text-[11px]">Prioridade</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${localTicket.priority === TicketPriority.HIGH ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                        {localTicket.priority}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[#9ca3af] text-[11px]">Status</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${localTicket.status === TicketStatus.RESOLVED ? 'text-green-400 bg-green-400/10' : 'text-primary bg-primary/10'}`}>
                        {localTicket.status}
                    </span>
                </div>
                
                <div className="h-px bg-[#374151] my-1"></div>

                <div className="flex flex-col gap-2">
                    <span className="text-[#9ca3af] text-[11px]">Responsável Técnico</span>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        {localTicket.technicianAvatar ? (
                            <img src={localTicket.technicianAvatar} className="size-6 rounded-full" />
                        ) : (
                            <div className="size-6 rounded-full bg-[#374151] flex items-center justify-center text-[10px] text-white">?</div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-white text-xs font-bold">{localTicket.technician || 'Não atribuído'}</span>
                            {localTicket.assignedAt && <span className="text-[9px] text-text-muted">Desde {localTicket.assignedAt}</span>}
                        </div>
                    </div>
                        <div className="relative">
                            <button 
                                onClick={() => setShowTransferList(!showTransferList)}
                                className="text-primary hover:text-white transition-colors"
                                title="Transferir Chamado"
                            >
                                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                            </button>
                             {/* Transfer Dropdown */}
                            {showTransferList && (
                                <div className="absolute right-0 top-8 w-56 bg-[#1f2937] border border-[#374151] rounded-xl shadow-2xl z-20 py-2 max-h-60 overflow-y-auto">
                                <p className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase border-b border-[#374151] mb-1">Transferir para:</p>
                                {technicians.map(tech => (
                                    <button 
                                    key={tech.id}
                                    onClick={() => handleTransfer(tech)}
                                    className="w-full text-left px-4 py-2 text-xs text-white hover:bg-primary transition-colors flex items-center gap-2"
                                    >
                                    <div className="size-5 rounded-full overflow-hidden bg-background-dark shrink-0">
                                        <img src={tech.avatar} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="truncate">{tech.name}</span>
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Equipment Info */}
            <div className="flex flex-col gap-3">
                <h4 className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Equipamento</h4>
                <div className="bg-[#1a2233]/40 border border-[#374151] rounded-xl p-4 flex flex-col gap-3">
                    <div>
                        <span className="text-[#6b7280] text-[9px] uppercase font-bold tracking-wider block mb-1">Equipamento</span>
                        <span className="text-white text-[11px] font-bold">{localTicket.equipmentDetails?.model || localTicket.equipment}</span>
                    </div>
                     <div>
                        <span className="text-[#6b7280] text-[9px] uppercase font-bold tracking-wider block mb-1">Serial Number</span>
                        <span className="text-white text-[11px] font-mono">{localTicket.equipmentDetails?.serialNumber || 'N/A'}</span>
                    </div>
                </div>
            </div>

             {/* Attachments */}
             {localTicket.attachment && (
                <div className="flex flex-col gap-3">
                    <h4 className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Anexos</h4>
                    
                    {/* Image Preview / Download Link */}
                    {localTicket.attachment.startsWith('data:image') || localTicket.attachment.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                        <div 
                            className="relative group rounded-xl overflow-hidden border border-[#374151] cursor-pointer"
                            onClick={() => setSelectedImage(localTicket.attachment || '')}
                        >
                            <img src={localTicket.attachment} alt="Anexo" className="w-full h-32 object-cover hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="material-symbols-outlined text-white">zoom_in</span>
                            </div>
                        </div>
                    ) : (
                         <a 
                            href={localTicket.attachment} 
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-[#1a2233]/40 border border-[#374151] p-3 rounded-xl hover:bg-[#1f2937] transition-colors group"
                        >
                            <div className="size-10 rounded-lg bg-[#1f2937] group-hover:bg-[#374151] flex items-center justify-center border border-[#374151]">
                                <span className="material-symbols-outlined text-primary">description</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white text-xs font-bold">Documento Anexo</span>
                                <span className="text-[#6b7280] text-[10px]">Clique para baixar</span>
                            </div>
                        </a>
                    )}
                </div>
            )}

             <div className="mt-auto pt-4">
                  <button 
                    onClick={handleResolve}
                    className="w-full h-11 border border-[#10b981]/30 bg-[#10b981]/5 text-[#10b981] text-[11px] font-bold rounded-xl hover:bg-[#10b981] hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Marcar como Resolvido
                  </button>
            </div>

          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
          <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
              <button className="absolute top-6 right-6 text-white hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-4xl">close</span>
              </button>
              <img src={selectedImage} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
      )}
    </div>
  );
};

export default TicketDetailModal;
