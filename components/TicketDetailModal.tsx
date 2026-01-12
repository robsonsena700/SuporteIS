
import React, { useState, useEffect } from 'react';
import { Ticket, TicketStatus, TicketPriority, User, TicketHistory } from '../types';
import { TicketService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { canReopenTicket } from '../utils/dateUtils';

interface TicketDetailModalProps {
  ticket: Ticket;
  technicians?: User[]; // Optional now as it might not be passed sometimes
  onClose: () => void;
  onUpdate: (updatedTicket: Ticket) => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ 
    ticket, 
    technicians = [], 
    onClose, 
    onUpdate,
    onNext,
    onPrev,
    hasNext,
    hasPrev
}) => {
  const { user } = useAuth();
  const toast = useToast();
  const [replyText, setReplyText] = useState('');
  const [showTransferList, setShowTransferList] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localTicket, setLocalTicket] = useState<Ticket>(ticket);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'messages' | 'history' | 'details'>('messages');
  const [historyFilter, setHistoryFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  const [selectedAttachment, setSelectedAttachment] = useState<{ name: string, content: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    priority: ticket.priority,
    status: ticket.status,
    model: ticket.equipmentDetails?.model || ticket.equipment || '',
    serialNumber: ticket.equipmentDetails?.serialNumber || ''
  });

  // Sync with prop updates
  useEffect(() => {
    setLocalTicket(ticket);
    setEditForm({
      priority: ticket.priority,
      status: ticket.status,
      model: ticket.equipmentDetails?.model || ticket.equipment || '',
      serialNumber: ticket.equipmentDetails?.serialNumber || ''
    });
  }, [ticket]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Polling for new messages
  useEffect(() => {
    if (activeTab !== 'messages') return;

    const pollMessages = async () => {
        try {
            const freshTicket = await TicketService.getById(localTicket.id);
            // Simple check: if message count differs, update. 
            // Better: Compare last message ID or timestamp.
            const currentCount = localTicket.messages?.length || 0;
            const newCount = freshTicket.messages?.length || 0;
            
            if (newCount !== currentCount) {
                 setLocalTicket(prev => ({ ...prev, messages: freshTicket.messages }));
            }
        } catch (e) {
            console.error('Polling error', e);
        }
    };

    const interval = setInterval(pollMessages, 5000); // 5 seconds
    return () => clearInterval(interval);
  }, [activeTab, localTicket.id, localTicket.messages?.length]);

  // Fetch History on Tab Change
  useEffect(() => {
    if (activeTab === 'history') {
        const fetchHistory = async () => {
            try {
                const data = await TicketService.getHistory(localTicket.id);
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch history', err);
            }
        };
        fetchHistory();
    }
  }, [activeTab, localTicket.id]);

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

  const handleSaveEdit = async () => {
      try {
          const updates: any = {};
          if (editForm.priority !== localTicket.priority) updates.priority = editForm.priority;
          if (editForm.status !== localTicket.status) updates.status = editForm.status;
          
          const currentModel = localTicket.equipmentDetails?.model || localTicket.equipment;
          const currentSerial = localTicket.equipmentDetails?.serialNumber;

          if (editForm.model !== currentModel || editForm.serialNumber !== currentSerial) {
              updates.equipmentDetails = {
                  model: editForm.model,
                  serialNumber: editForm.serialNumber
              };
              // Also update legacy equipment field if model changed
              if (editForm.model !== currentModel) {
                  updates.equipment = editForm.model;
              }
          }

          if (Object.keys(updates).length === 0) {
              setIsEditing(false);
              return;
          }

          const updated = await TicketService.update(localTicket.id, updates);
          setLocalTicket(updated);
          onUpdate(updated);
          setIsEditing(false);
          toast.success('Detalhes do chamado atualizados.');
      } catch (error: any) {
          console.error('Failed to update ticket details', error);
          toast.error('Erro ao atualizar detalhes do chamado.');
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          setSelectedAttachment({
            name: file.name,
            content: event.target.result as string
          });
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || isSubmitting) return;

    // Ensure assignment before sending if needed
    if (!localTicket.technicianId && user && (user.profile === 'Suporte Técnico' || user.profile === 'Administrador')) {
        await handleInteractionStart();
    }

    setIsSubmitting(true);
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
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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
        toast.success(`Chamado transferido para ${technician.name}.`);
    } catch (error: any) {
        console.error('Failed to transfer ticket', error);
        const errorMessage = error.response?.data?.message || 'Erro ao transferir chamado.';
        toast.error(errorMessage);
    }
  };

  const isClient = user?.profile === 'Cliente';
  const canEdit = user?.profile === 'Suporte Técnico' || user?.profile === 'Administrador';

  const filteredHistory = history.filter(h => {
      if (historyFilter && h.changeType !== historyFilter) return false;
      if (historySearch) {
          const search = historySearch.toLowerCase();
          return (
              (h.userName && h.userName.toLowerCase().includes(search)) ||
              (h.details && h.details.toLowerCase().includes(search)) ||
              (h.oldValue && h.oldValue.toLowerCase().includes(search)) ||
              (h.newValue && h.newValue.toLowerCase().includes(search))
          );
      }
      return true;
  });

  const handleReopen = async () => {
    try {
        console.log(`Reopening ticket ${localTicket.id}`);
        // Default to 'Aberto' or previous status. 'Aberto' is safe.
        const updated = await TicketService.update(localTicket.id, { status: TicketStatus.OPEN });
        onUpdate(updated);
        setLocalTicket(updated);
        toast.success('Chamado reaberto com sucesso.');
    } catch (error: any) {
        console.error('Failed to reopen ticket', error);
        const errorMessage = error.response?.data?.message || 'Erro ao reabrir chamado.';
        toast.error(errorMessage);
    }
  };

  const handleResolve = async () => {
    // Check if technician is assigned
    if (!localTicket.technicianId) {
        toast.warning('Não é possível encerrar o chamado sem um Responsável Técnico definido. Por favor, atribua um técnico antes de resolver.');
        return;
    }

    // If Creator, show rating modal
    if (isCreator) {
        setShowRatingModal(true);
        return;
    }

    // If Technician (not Creator), resolve directly
    if (window.confirm('Confirma a resolução deste chamado? O solicitante será notificado para realizar a avaliação.')) {
        try {
            const updated = await TicketService.update(localTicket.id, { status: TicketStatus.RESOLVED });
            onUpdate(updated);
            setLocalTicket(updated);
            toast.success('Chamado resolvido com sucesso.');
        } catch (error: any) {
            console.error('Failed to resolve ticket', error);
            toast.error('Erro ao resolver chamado.');
        }
    }
  };

  const submitResolution = async () => {
    if (rating === 0) return;
    if (rating <= 2 && !feedback.trim()) {
        toast.warning('Por favor, informe o motivo da insatisfação.');
        return;
    }

    try {
        console.log(`Resolving ticket ${localTicket.id} with rating ${rating}`);
        const updated = await TicketService.update(localTicket.id, { 
            status: TicketStatus.RESOLVED,
            rating,
            feedback
        });
        onUpdate(updated);
        setLocalTicket(updated);
        setShowRatingModal(false);
        toast.success('Chamado avaliado e resolvido com sucesso.');
    } catch (error: any) {
        console.error('Failed to resolve ticket', error);
        const errorMessage = error.response?.data?.message || 'Erro ao resolver chamado.';
        toast.error(errorMessage);
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
    <>
    <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-0 lg:p-4 bg-black/70 backdrop-blur-sm" 
        onClick={onClose} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-[#111827] border border-[#1f2937] w-full h-full lg:h-[90vh] lg:max-w-[1200px] lg:rounded-2xl rounded-none flex flex-col shadow-2xl overflow-hidden outline-none" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <header className="p-3 md:p-6 border-b border-[#1f2937] flex justify-between items-start bg-[#111827] shrink-0">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-text-secondary uppercase tracking-tighter mb-1">{localTicket.code || `CH-${localTicket.id.slice(0, 4).toUpperCase()}`}</span>
              <div className={`size-2 rounded-full shadow-[0_0_8px] ${localTicket.status === TicketStatus.RESOLVED ? 'bg-success shadow-success/50' : 'bg-primary shadow-primary/80'}`}></div>
            </div>
            <div>
              <h2 id="modal-title" className="text-white text-lg font-bold leading-tight line-clamp-1">{localTicket.subject}</h2>
              <p className="text-text-muted text-xs">{localTicket.clientName} • Criado em {localTicket.createdAt}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {/* Navigation */}
             {(hasPrev !== undefined || hasNext !== undefined) && (
                 <div className="hidden md:flex items-center bg-[#1f2937] rounded-lg border border-[#374151] mr-2">
                     <button 
                        onClick={onPrev} 
                        disabled={!hasPrev}
                        className="p-1.5 hover:bg-[#374151] disabled:opacity-30 disabled:hover:bg-transparent transition-colors rounded-l-lg border-r border-[#374151] flex items-center justify-center"
                        title="Chamado Anterior"
                        aria-label="Chamado Anterior"
                     >
                         <span className="material-symbols-outlined text-[20px] text-white">chevron_left</span>
                     </button>
                     <button 
                        onClick={onNext} 
                        disabled={!hasNext}
                        className="p-1.5 hover:bg-[#374151] disabled:opacity-30 disabled:hover:bg-transparent transition-colors rounded-r-lg flex items-center justify-center"
                        title="Próximo Chamado"
                        aria-label="Próximo Chamado"
                     >
                         <span className="material-symbols-outlined text-[20px] text-white">chevron_right</span>
                     </button>
                 </div>
             )}

             {localTicket.status === TicketStatus.RESOLVED && isCreator && !localTicket.rating ? (
                 <button 
                    onClick={() => setShowRatingModal(true)}
                    className="lg:hidden h-8 px-3 border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-yellow-500/20 animate-pulse"
                 >
                    <span className="material-symbols-outlined text-[16px]">star</span>
                    <span>Avaliar</span>
                 </button>
             ) : (
                 localTicket.status !== TicketStatus.RESOLVED && (
                     <button 
                        onClick={handleResolve}
                        disabled={isClient && !isCreator}
                        title={isClient && !isCreator ? 'Apenas usuários autorizados podem modificar este chamado' : ''}
                        className={`lg:hidden h-8 px-3 border rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${isClient && !isCreator ? 'bg-gray-500/10 border-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20'}`}
                     >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Resolver</span>
                     </button>
                 )
             )}
             <button onClick={onClose} className="text-[#4b5563] hover:text-white transition-colors p-1">
                <span className="material-symbols-outlined text-[24px]">close</span>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_320px]">
          
          {/* Chat/History Section */}
          <div className={`flex flex-col h-full bg-[#111827] border-r border-[#1f2937] min-h-0 ${activeTab === 'details' ? 'hidden lg:flex' : 'flex'}`}>
            
            {/* Tabs */}
            <div className="flex items-center gap-6 px-6 border-b border-[#1f2937] shrink-0 bg-[#111827]">
              <button
                onClick={() => setActiveTab('messages')}
                className={`h-12 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'messages'
                    ? 'border-primary text-white'
                    : 'border-transparent text-text-secondary hover:text-white'
                }`}
              >
                Mensagens
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`h-12 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-primary text-white'
                    : 'border-transparent text-text-secondary hover:text-white'
                }`}
              >
                Histórico
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`lg:hidden h-12 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-primary text-white'
                    : 'border-transparent text-text-secondary hover:text-white'
                }`}
              >
                Detalhes
              </button>
            </div>

            {activeTab === 'messages' ? (
                <>
                    <div className="flex-1 overflow-y-auto p-3 md:p-6 flex flex-col gap-6">
                        {/* Messages */}
                        <div className="flex flex-col gap-5">
                            {localTicket.messages && localTicket.messages.map((msg, i) => (
                            <div key={msg.id || i} className={`flex gap-3 ${msg.senderName === 'Você' ? 'flex-row-reverse' : ''}`}>
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
                    <div className="p-3 md:p-6 border-t border-[#1f2937] bg-[#111827]">
                        {isAssignedToOthers && user?.profile !== 'Cliente' && !isCreator ? (
                            <div className="flex items-center justify-center p-3 md:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm gap-2">
                                <span className="material-symbols-outlined">lock</span>
                                <span>Este chamado está sendo atendido por <strong>{localTicket.technician}</strong>.</span>
                                <button onClick={handleTakeTicket} className="ml-2 underline hover:text-white">Assumir Chamado</button>
                            </div>
                        ) : isClient && localTicket.status === TicketStatus.RESOLVED ? (
                            <div className="flex items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm gap-2">
                                <span className="material-symbols-outlined">block</span>
                                <span>Apenas o Responsável pelo atendimento ou Administrador podem realizar esta função!</span>
                            </div>
                        ) : (
                            <>
                                <div className="relative mb-4 group">
                                    {selectedAttachment && (
                                        <div className="absolute bottom-full left-0 mb-2 bg-[#1f2937] border border-[#374151] rounded-lg p-2 flex items-center gap-2 text-xs text-white animate-fade-in">
                                            <span className="material-symbols-outlined text-[16px]">attach_file</span>
                                            <span className="max-w-[200px] truncate">{selectedAttachment.name}</span>
                                            <button 
                                                onClick={() => {
                                                    setSelectedAttachment(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }}
                                                className="hover:text-red-400"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    )}
                                    <textarea 
                                    placeholder="Digite sua resposta..."
                                    className="w-full h-[80px] md:h-[120px] bg-[#1a2233] border border-[#374151] rounded-xl p-3 md:p-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none resize-none transition-all placeholder:text-[#4b5563]"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onFocus={handleInteractionStart}
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`px-3 md:px-5 h-10 border border-[#374151] text-white text-xs font-bold rounded-lg hover:bg-[#1f2937] transition-all flex items-center gap-2 ${selectedAttachment ? 'bg-primary/20 border-primary/50' : ''}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">attach_file</span>
                                        Anexar
                                    </button>
                                    <button 
                                    onClick={handleSendMessage}
                                    disabled={(!replyText.trim() && !selectedAttachment) || isSubmitting}
                                    className={`px-4 md:px-6 h-10 bg-[#135bec] text-white text-xs font-bold rounded-lg hover:bg-[#0f48bd] shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                    {isSubmitting ? 'Enviando...' : 'Enviar Resposta'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-[#1f2937] flex gap-3 shrink-0 bg-[#111827]">
                        <div className="relative flex-1">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
                            <input
                                type="text"
                                placeholder="Buscar no histórico..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="w-full h-10 bg-[#1a2233] border border-[#374151] rounded-lg pl-10 pr-3 text-xs text-white focus:outline-none focus:border-primary transition-colors placeholder:text-gray-600"
                            />
                        </div>
                        <select
                            value={historyFilter}
                            onChange={(e) => setHistoryFilter(e.target.value)}
                            className="h-10 bg-[#1a2233] border border-[#374151] rounded-lg px-3 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                        >
                            <option value="">Todos os tipos</option>
                            <option value="Criação">Criação</option>
                            <option value="Mensagem">Mensagem</option>
                            <option value="Status">Status</option>
                            <option value="Atribuição">Atribuição</option>
                            <option value="Edição">Edição</option>
                        </select>
                    </div>
                    {/* History List */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-0 relative">
                        {filteredHistory.length > 0 ? (
                            <>
                                {filteredHistory.map((h, index) => (
                                    <div key={h.id} className="flex gap-4 group">
                                        {/* Timeline Line */}
                                        <div className="flex flex-col items-center">
                                            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                                h.changeType === 'Criação' ? 'border-green-500/20 bg-green-500/10 text-green-500' :
                                                h.changeType === 'Status' ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' :
                                                h.changeType === 'Mensagem' ? 'border-purple-500/20 bg-purple-500/10 text-purple-500' :
                                                'border-[#374151] bg-[#1f2937] text-gray-400'
                                            }`}>
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {h.changeType === 'Criação' ? 'add_circle' :
                                                     h.changeType === 'Status' ? 'sync_alt' :
                                                     h.changeType === 'Mensagem' ? 'chat' :
                                                     h.changeType === 'Atribuição' ? 'person_add' : 'edit'}
                                                </span>
                                            </div>
                                            {index < filteredHistory.length - 1 && (
                                                <div className="w-px flex-1 bg-[#1f2937] group-hover:bg-[#374151] transition-colors my-1"></div>
                                            )}
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 pb-8">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white text-xs font-bold">{h.userName}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1f2937] text-text-muted border border-[#374151]">{h.changeType}</span>
                                                </div>
                                                <span className="text-[10px] text-text-muted">{h.createdAt}</span>
                                            </div>
                                            
                                            <p className="text-xs text-gray-300 leading-relaxed mb-2">{h.details}</p>
                                            
                                            {(h.oldValue || h.newValue) && (
                                                <div className="bg-[#1a2233] border border-[#374151] rounded-lg p-3 grid gap-2">
                                                    {h.oldValue && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">Anterior</span>
                                                            <span className="text-xs text-gray-400 line-through decoration-red-500/30">{h.oldValue}</span>
                                                        </div>
                                                    )}
                                                    {h.newValue && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-green-400">Novo</span>
                                                            <span className="text-xs text-white">{h.newValue}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2 opacity-50">
                                <span className="material-symbols-outlined text-4xl">history_toggle_off</span>
                                <span className="text-xs">Nenhum registro encontrado no histórico.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>

          {/* Sidebar Info */}
          <div className={`flex-col h-full bg-[#111827] p-6 gap-6 overflow-y-auto border-l border-[#1f2937] ${activeTab === 'details' ? 'flex' : 'hidden lg:flex'}`}>
            
            <div className="flex justify-between items-center">
                 <h3 className="text-white text-sm font-bold">Detalhes</h3>
                 {canEdit && (
                     !isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-primary text-xs hover:text-white transition-colors"
                        >
                            Editar
                        </button>
                     ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveEdit}
                                className="text-green-500 text-xs hover:text-white transition-colors font-bold"
                            >
                                Salvar
                            </button>
                            <button 
                                onClick={() => {
                                    setIsEditing(false);
                                    // Reset form
                                    setEditForm({
                                        priority: localTicket.priority,
                                        status: localTicket.status,
                                        model: localTicket.equipmentDetails?.model || localTicket.equipment || '',
                                        serialNumber: localTicket.equipmentDetails?.serialNumber || ''
                                    });
                                }}
                                className="text-red-500 text-xs hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                     )
                 )}
            </div>

            {/* Status Card */}
            <div className="bg-[#1a2233]/40 border border-[#374151] rounded-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <span className="text-[#9ca3af] text-[11px]">Prioridade</span>
                    {isEditing ? (
                        <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm({...editForm, priority: e.target.value as TicketPriority})}
                            className="bg-[#111827] border border-[#374151] rounded text-[10px] text-white px-1 py-0.5 outline-none focus:border-primary"
                        >
                            <option value={TicketPriority.LOW}>{TicketPriority.LOW}</option>
                            <option value={TicketPriority.MEDIUM}>{TicketPriority.MEDIUM}</option>
                            <option value={TicketPriority.HIGH}>{TicketPriority.HIGH}</option>
                        </select>
                    ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${localTicket.priority === TicketPriority.HIGH ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                            {localTicket.priority}
                        </span>
                    )}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[#9ca3af] text-[11px]">Status</span>
                    {isEditing ? (
                        <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({...editForm, status: e.target.value as TicketStatus})}
                            className="bg-[#111827] border border-[#374151] rounded text-[10px] text-white px-1 py-0.5 outline-none focus:border-primary"
                        >
                            <option value={TicketStatus.OPEN}>{TicketStatus.OPEN}</option>
                            <option value={TicketStatus.IN_ANALYSIS}>{TicketStatus.IN_ANALYSIS}</option>
                            <option value={TicketStatus.IN_PROGRESS}>{TicketStatus.IN_PROGRESS}</option>
                            <option value={TicketStatus.RESOLVED}>{TicketStatus.RESOLVED}</option>
                        </select>
                    ) : (
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${localTicket.status === TicketStatus.RESOLVED ? 'text-green-400 bg-green-400/10' : 'text-primary bg-primary/10'}`}>
                            {localTicket.status}
                        </span>
                    )}
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
                                onClick={() => !isClient && setShowTransferList(!showTransferList)}
                                disabled={isClient}
                                className={`transition-colors ${isClient ? 'text-gray-600 cursor-not-allowed' : 'text-primary hover:text-white'}`}
                                title={isClient ? 'Apenas usuários autorizados podem modificar este chamado' : 'Transferir Chamado'}
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
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.model}
                                onChange={(e) => setEditForm({...editForm, model: e.target.value})}
                                className="w-full bg-[#111827] border border-[#374151] rounded text-[10px] text-white px-2 py-1 outline-none focus:border-primary"
                                placeholder="Modelo do equipamento"
                            />
                        ) : (
                            <span className="text-white text-[11px] font-bold">{localTicket.equipmentDetails?.model || localTicket.equipment}</span>
                        )}
                    </div>
                     <div>
                        <span className="text-[#6b7280] text-[9px] uppercase font-bold tracking-wider block mb-1">Serial Number</span>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editForm.serialNumber}
                                onChange={(e) => setEditForm({...editForm, serialNumber: e.target.value})}
                                className="w-full bg-[#111827] border border-[#374151] rounded text-[10px] text-white px-2 py-1 outline-none focus:border-primary font-mono"
                                placeholder="Número de Série"
                            />
                        ) : (
                            <span className="text-white text-[11px] font-mono">{localTicket.equipmentDetails?.serialNumber || 'N/A'}</span>
                        )}
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
                {localTicket.status === TicketStatus.RESOLVED ? (
                    isCreator && !localTicket.rating ? (
                        <button 
                            onClick={() => setShowRatingModal(true)}
                            className="w-full h-11 border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-[11px] font-bold rounded-xl hover:bg-yellow-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                        >
                            <span className="material-symbols-outlined text-[18px]">star</span>
                            Avaliar Atendimento
                        </button>
                    ) : (
                        canReopenTicket(localTicket.resolvedAt || localTicket.updatedAt) ? (
                            isClient ? (
                                <div className="w-full h-11 border border-red-500/30 bg-red-500/5 text-red-400 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-center px-2 leading-tight">
                                    <span className="material-symbols-outlined text-[16px]">block</span>
                                    Apenas o Responsável ou Admin podem reabrir
                                </div>
                            ) : (
                                <button 
                                    onClick={handleReopen}
                                    className="w-full h-11 border border-yellow-500/30 bg-yellow-500/5 text-yellow-500 text-[11px] font-bold rounded-xl hover:bg-yellow-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                                    Reabrir Chamado
                                </button>
                            )
                        ) : (
                            <div className="w-full h-11 border border-gray-500/30 bg-gray-500/5 text-gray-500 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                Resolvido (Reabertura Expirada)
                            </div>
                        )
                    )
                ) : (
                  <button 
                    onClick={handleResolve}
                    disabled={isClient && !isCreator}
                    title={isClient && !isCreator ? 'Apenas usuários autorizados podem modificar este chamado' : ''}
                    className={`w-full h-11 border text-[11px] font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isClient && !isCreator ? 'border-gray-500/30 bg-gray-500/5 text-gray-500 cursor-not-allowed' : 'border-[#10b981]/30 bg-[#10b981]/5 text-[#10b981] hover:bg-[#10b981] hover:text-white'}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Marcar como Resolvido
                  </button>
                )}
            </div>

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

      {/* Rating Modal Overlay */}
      {showRatingModal && (
        <div 
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        >
            <div 
                className="bg-[#1a2233] border border-[#374151] w-full max-w-md rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col gap-6 animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start">
                    <h3 className="text-white text-xl font-bold">Avaliação de Atendimento</h3>
                    <button 
                        type="button"
                        onClick={() => setShowRatingModal(false)} 
                        className="text-[#9ca3af] hover:text-white"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                    <p className="text-text-secondary text-sm text-center">Como você avalia o atendimento recebido?</p>
                    <div className="flex gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                                key={star} 
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setRating(star);
                                }}
                                className={`text-4xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400 filled' : 'text-[#4b5563]'}`}
                            >
                                <span className="material-symbols-outlined text-[40px] pointer-events-none">{rating >= star ? 'star' : 'star_rate'}</span>
                            </button>
                        ))}
                    </div>
                    <p className={`text-sm font-bold mt-2 h-5 ${
                        rating === 1 ? 'text-red-500' : 
                        rating === 2 ? 'text-orange-500' : 
                        rating === 3 ? 'text-yellow-500' : 
                        rating === 4 ? 'text-blue-400' : 
                        rating === 5 ? 'text-green-500' : 'text-transparent'
                    }`}>
                        {rating === 1 ? 'Péssimo' : 
                         rating === 2 ? 'Ruim' : 
                         rating === 3 ? 'Bom' : 
                         rating === 4 ? 'Ótimo' : 
                         rating === 5 ? 'Excelente' : ''}
                    </p>
                </div>

                {(rating > 0 && rating <= 2) && (
                    <div className="flex flex-col gap-2 animate-fade-in">
                        <label className="text-text-secondary text-xs font-bold uppercase">Motivo da insatisfação</label>
                        <textarea 
                            value={feedback} 
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Por favor, conte-nos brevemente o que houve..."
                            className="w-full h-24 bg-[#111827] border border-[#374151] rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-primary outline-none resize-none"
                        />
                    </div>
                )}

                <button 
                    onClick={submitResolution}
                    disabled={rating === 0}
                    className="w-full h-12 bg-[#135bec] text-white font-bold rounded-xl hover:bg-[#0f48bd] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                >
                    Confirmar e Resolver
                </button>
            </div>
        </div>
      )}
    </>
  );
};

export default TicketDetailModal;
