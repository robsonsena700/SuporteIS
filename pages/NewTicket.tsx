
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, TicketStatus, TicketPriority } from '../types';

interface NewTicketProps {
  onAdd: (ticket: Ticket) => void;
}

const NewTicket: React.FC<NewTicketProps> = ({ onAdd }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    equipment: '',
    unit: '',
    priority: TicketPriority.MEDIUM,
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTicket: Ticket = {
      id: `#CH-${Math.floor(Math.random() * 9000) + 1000}`,
      subject: formData.subject,
      equipment: formData.equipment,
      clientName: formData.unit,
      priority: formData.priority,
      status: TicketStatus.OPEN,
      description: formData.description,
      createdAt: 'Agora mesmo',
      lastInteraction: 'Agora mesmo',
      messages: [
        {
          id: 'initial',
          senderId: 'client-current',
          senderName: 'Você',
          content: formData.description,
          timestamp: 'Agora mesmo'
        }
      ]
    };
    onAdd(newTicket);
    navigate('/tickets');
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-white text-4xl font-black tracking-tight mb-2">Abertura de Chamado</h1>
        <p className="text-text-secondary">Preencha os campos abaixo para solicitar manutenção corretiva ou preventiva.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-background-card border border-border-dark rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">
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
          <label className="text-white text-sm font-medium">Anexos (Opcional)</label>
          <div className="border-2 border-dashed border-border-dark rounded-xl p-8 flex flex-col items-center justify-center gap-2 hover:bg-background-input transition-all cursor-pointer group">
            <span className="material-symbols-outlined text-4xl text-text-muted group-hover:text-primary transition-colors">cloud_upload</span>
            <p className="text-sm text-white"><span className="text-primary font-bold">Clique para enviar</span> ou arraste e solte</p>
            <p className="text-xs text-text-muted">SVG, PNG, JPG ou PDF (MAX. 10MB)</p>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button type="button" onClick={() => navigate('/tickets')} className="px-6 h-12 border border-border-dark text-white font-bold rounded-lg hover:bg-background-input transition-all">
            Cancelar
          </button>
          <button type="submit" className="px-10 h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-xl shadow-primary/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">send</span>
            Enviar Chamado
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewTicket;
