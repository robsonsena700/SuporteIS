
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, TicketStatus, TicketPriority } from '../types';
import { TicketService } from '../services/api';

interface NewTicketProps {
  onAdd: (ticket: Ticket) => void;
}

const NewTicket: React.FC<NewTicketProps> = ({ onAdd }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ticketType, setTicketType] = useState<'Sistema' | 'Equipamento'>('Sistema');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    equipment: '',
    unit: '',
    priority: TicketPriority.MEDIUM,
    description: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB
      alert('O arquivo deve ter no máximo 1MB.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
        alert('Formato de arquivo inválido. Apenas Imagens (PNG, JPG) e PDF.');
        return;
    }

    if (file.type === 'application/pdf') {
       const reader = new FileReader();
       reader.onloadend = () => {
           setAttachment(reader.result as string);
           setAttachmentName(file.name);
       };
       reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
        // Resize/Compress logic
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress to 70% quality
                setAttachment(dataUrl);
                setAttachmentName(file.name);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!attachment) {
        alert('Por favor, adicione um anexo (Obrigatório).');
        return;
    }

    setLoading(true);

    try {
      const newTicketData: Partial<Ticket> & { attachment?: string } = {
        subject: formData.subject,
        equipment: ticketType === 'Equipamento' ? formData.equipment : 'Sistema',
        clientName: formData.unit,
        priority: formData.priority,
        status: TicketStatus.OPEN,
        description: formData.description,
        attachment: attachment || undefined
      };

      const createdTicket = await TicketService.create(newTicketData);
      onAdd(createdTicket); // Update parent state (trigger reload)
      navigate('/tickets');
    } catch (error) {
      console.error('Failed to create ticket', error);
      alert('Erro ao criar chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-white text-4xl font-black tracking-tight mb-2">Abertura de Chamado</h1>
        <p className="text-text-secondary">Preencha os campos abaixo para solicitar manutenção corretiva ou preventiva.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-background-card border border-border-dark rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">
        
        {/* Type Selection Tabs */}
        <div className="flex gap-4 border-b border-border-dark mb-2">
            <button 
                type="button" 
                className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all ${ticketType === 'Sistema' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}
                onClick={() => setTicketType('Sistema')}
            >
                Sistema
            </button>
            <button 
                type="button" 
                className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all ${ticketType === 'Equipamento' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-white'}`}
                onClick={() => setTicketType('Equipamento')}
            >
                Equipamento
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-white text-sm font-medium">Nome da Unidade/UF</label>
            <input 
              required
              className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted"
              placeholder="Ex: Matriz Administrativa / SP"
              value={formData.unit}
              onChange={e => setFormData({...formData, unit: e.target.value})}
            />
          </div>
          
          {ticketType === 'Equipamento' && (
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm font-medium">Equipamento Afetado</label>
              <select 
                required
                className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all"
                value={formData.equipment}
                onChange={e => setFormData({...formData, equipment: e.target.value})}
              >
                <option value="" disabled>Selecione o equipamento...</option>
                <option value="Desktop">Desktop</option>
                <option value="Notebook">Notebook</option>
                <option value="Impressora">Impressora</option>
                <option value="Servidor">Servidor</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-medium">Resumo do Problema</label>
          <input 
            required
            className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all placeholder:text-text-muted"
            placeholder="Ex: Falha no carregamento do sistema"
            value={formData.subject}
            onChange={e => setFormData({...formData, subject: e.target.value})}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-medium">Nível de Prioridade</label>
          <div className="grid grid-cols-3 gap-3">
            {[TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setFormData({...formData, priority: p})}
                className={`h-12 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2
                  ${formData.priority === p 
                    ? 'bg-primary/20 border-primary text-white' 
                    : 'bg-background-input border-border-dark text-text-muted hover:border-border-light'
                  }
                `}
              >
                <span className={`material-symbols-outlined text-[18px] ${p === TicketPriority.HIGH ? 'text-red-500' : p === TicketPriority.MEDIUM ? 'text-warning' : 'text-success'}`}>
                  {p === TicketPriority.HIGH ? 'error' : p === TicketPriority.MEDIUM ? 'warning' : 'info'}
                </span>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-medium">Descrição Detalhada</label>
          <textarea 
            required
            className="h-40 bg-background-input border border-border-dark rounded-lg p-4 text-white focus:ring-1 focus:ring-primary resize-none placeholder:text-text-muted"
            placeholder="Descreva o problema com o máximo de detalhes possível, incluindo códigos de erro..."
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-medium">Anexos (Obrigatório)</label>
          <div className="border-2 border-dashed border-border-dark rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-background-input transition-all cursor-pointer group relative">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />
            {attachmentName ? (
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-primary">check_circle</span>
                    <p className="text-sm text-white font-bold">{attachmentName}</p>
                    <p className="text-xs text-text-muted">Arquivo selecionado (Clique para alterar)</p>
                </div>
            ) : (
                <>
                    <span className="material-symbols-outlined text-4xl text-text-muted group-hover:text-primary transition-colors">cloud_upload</span>
                    <p className="text-sm text-white"><span className="text-primary font-bold">Clique para enviar</span> ou arraste e solte</p>
                    <p className="text-xs text-text-muted">JPG, PNG ou PDF (MAX. 1MB)</p>
                </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button type="button" onClick={() => navigate('/tickets')} className="px-6 h-12 border border-border-dark text-white font-bold rounded-lg hover:bg-background-input transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-10 h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-xl shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50">
            {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined text-[20px]">send</span>}
            {loading ? 'Enviando...' : 'Enviar Chamado'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTicket;
