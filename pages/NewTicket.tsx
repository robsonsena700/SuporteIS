import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, TicketStatus, TicketPriority, User } from '../types';
import { TicketService, UserService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface NewTicketProps {
  onAdd: (ticket: Ticket) => void;
}

const EQUIPMENT_OPTIONS = [
  'CPU', 'Memória', 'HD (disco rígido)', 'Fonte / Carregador', 'Placa mãe', 
  'Monitor', 'Teclado', 'Mouse', 'Rede', 'Tablet', 'Celular', 
  'Rede (Wi-fi / Roteador / Switch, etc)', 'Roteador', 
  'Impressora Zebra / Laser / Tinta', 'Impressora Reposição / Troca de tonner ou tinta', 
  'TV Painel', 'Cabo de força', 'Formatação', 'Instalação', 'SO', 
  'Virus / Malware', 'Recuperação de dados', 'Outros'
];

const NewTicket: React.FC<NewTicketProps> = ({ onAdd }) => {
  const navigate = useNavigate();
  const { success, error, warning } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [ticketType, setTicketType] = useState<'Sistema' | 'Equipamento'>('Sistema');
  const [clientUsers, setClientUsers] = useState<User[]>([]);
  
  // Attachments state (up to 3)
  const [attachments, setAttachments] = useState<{data: string, name: string}[]>([]);
  
  const [formData, setFormData] = useState({
    subject: '',
    equipment: '',
    otherEquipment: '', // For "Outros"
    clientName: '',
    unit: '',
    municipality: '',
    uf: '',
    priority: TicketPriority.MEDIUM,
    description: '',
  });

  useEffect(() => {
    if (user) {
      if (user.profile === 'Cliente') {
        // Se for cliente, preenche automaticamente e bloqueia edição (via UI condicional)
        setFormData(prev => ({
          ...prev,
          clientName: user.name,
          unit: user.company || prev.unit
        }));
      } else if (user.profile === 'Suporte Técnico' || user.profile === 'Administrador') {
        // Se for suporte/admin, carrega lista de clientes
        UserService.getAll()
          .then(users => {
            const clients = users.filter(u => u.profile === 'Cliente');
            setClientUsers(clients);
          })
          .catch(err => console.error('Failed to load users', err));
      }
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'uf') {
        // Limit to 2 chars and uppercase
        const formatted = value.slice(0, 2).toUpperCase();
        setFormData(prev => ({ ...prev, [name]: formatted }));
        return;
    }

    if (name === 'clientName' && (user?.profile === 'Suporte Técnico' || user?.profile === 'Administrador')) {
        // Ao selecionar um cliente, tentar preencher outros dados se disponíveis
        const selectedUser = clientUsers.find(u => u.name === value);
        if (selectedUser) {
             setFormData(prev => ({
                 ...prev,
                 [name]: value,
                 unit: selectedUser.company || prev.unit
             }));
             return;
        }
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDescriptionChange = (content: string) => {
    setFormData(prev => ({ ...prev, description: content }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (attachments.length + files.length > 3) {
        warning('Máximo de 3 anexos permitidos.');
        return;
    }

    Array.from(files).forEach((file: File) => {
            if (file.size > 5 * 1024 * 1024) { // 5MB
            warning(`O arquivo ${file.name} excede 5MB.`);
            return;
        }

        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            warning(`Formato inválido para ${file.name}. Apenas Imagens (PNG, JPG) e PDF.`);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
             setAttachments(prev => [...prev, { data: reader.result as string, name: file.name }]);
        };
        reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
      setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description) {
      warning('Por favor, descreva o problema.');
      return;
    }

    setLoading(true);

    try {
      // Validation
      if (!formData.clientName || !formData.unit || !formData.municipality || !formData.uf) {
          warning('Preencha todos os campos obrigatórios de localização/cliente.');
          setLoading(false);
          return;
      }
      
      if (attachments.length === 0) {
          warning('É obrigatório incluir pelo menos 1 anexo.');
          setLoading(false);
          return;
      }

      let finalEquipment = formData.equipment;
      if (ticketType === 'Equipamento') {
          if (formData.equipment === 'Outros') {
              if (!formData.otherEquipment) {
                  warning('Por favor, especifique o equipamento.');
                  setLoading(false);
                  return;
              }
              finalEquipment = `Outros: ${formData.otherEquipment}`;
          }
      } else {
          finalEquipment = 'Sistema';
      }

      const attachmentPayload = JSON.stringify(attachments);

      const apiPayload: any = {
                subject: formData.subject,
                description: formData.description,
                equipment: finalEquipment,
                clientName: formData.clientName,
                unit: formData.unit,
                municipality: formData.municipality,
                uf: formData.uf,
                priority: formData.priority,
                status: 'Aberto',
                attachment: attachmentPayload,
                equipmentDetails: {
                    model: finalEquipment,
                    serialNumber: '',
                    warranty: ''
                }
            };

      const createdTicket = await TicketService.create(apiPayload);
      onAdd(createdTicket);
      success('Chamado criado com sucesso!');
      navigate('/tickets');
    } catch (err: any) {
      console.error('Failed to create ticket', err);
      const msg = err.response?.data?.message || err.message || 'Erro ao criar chamado.';
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSelectClient = user?.profile === 'Administrador' || user?.profile === 'Suporte Técnico';

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/tickets')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>
        <h1 className="text-2xl font-bold text-white">Novo Chamado</h1>
      </div>

      <div className="bg-background-card border border-border-light rounded-xl p-1 mb-8 flex">
        <button
          onClick={() => setTicketType('Sistema')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${ticketType === 'Sistema' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
        >
          Chamado de Sistema
        </button>
        <button
          onClick={() => setTicketType('Equipamento')}
          className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${ticketType === 'Equipamento' ? 'bg-primary text-white shadow-lg' : 'text-text-secondary hover:text-white'}`}
        >
          Chamado de Equipamento
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Common Fields: Client Location */}
        <div className="bg-background-card border border-border-light rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span>
                Localização e Contato
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">Cliente *</label>
                    {canSelectClient ? (
                        <select
                            name="clientName"
                            value={formData.clientName}
                            onChange={handleChange}
                            className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            required
                        >
                            <option value="">Selecione um cliente...</option>
                            {clientUsers.map(u => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            name="clientName"
                            value={formData.clientName}
                            onChange={handleChange}
                            className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all opacity-70 cursor-not-allowed"
                            placeholder="Nome do Cliente"
                            required
                            readOnly
                        />
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">Unidade *</label>
                    <input
                        type="text"
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Unidade"
                        required
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">Município *</label>
                    <input
                        type="text"
                        name="municipality"
                        value={formData.municipality}
                        onChange={handleChange}
                        className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Município"
                        required
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">UF *</label>
                    <input
                        type="text"
                        name="uf"
                        value={formData.uf}
                        onChange={handleChange}
                        maxLength={2}
                        className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all uppercase"
                        placeholder="UF"
                        required
                    />
                </div>
            </div>
        </div>

        {/* Specific Fields */}
        <div className="bg-background-card border border-border-light rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                Detalhes do Chamado
            </h2>

            <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Assunto *</label>
                <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Resumo do problema"
                    required
                />
            </div>

            {ticketType === 'Equipamento' && (
                <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">Equipamento, infra ou hardware *</label>
                    <select
                        name="equipment"
                        value={formData.equipment}
                        onChange={handleChange}
                        className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        required
                    >
                        <option value="">Selecione...</option>
                        {EQUIPMENT_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            )}

            {ticketType === 'Equipamento' && formData.equipment === 'Outros' && (
                 <div className="flex flex-col gap-1 animate-fade-in">
                    <label className="text-white text-sm font-medium">Especifique o equipamento (Outros) *</label>
                    <input
                        type="text"
                        name="otherEquipment"
                        value={formData.otherEquipment}
                        onChange={handleChange}
                        className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="Digite o nome do equipamento..."
                        required
                    />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <label className="text-white text-sm font-medium">Urgência *</label>
                <div className="flex flex-wrap gap-4">
                    {[
                        { label: 'Baixa', value: TicketPriority.LOW, color: 'bg-green-500/20 text-green-500 border-green-500/30' },
                        { label: 'Média', value: TicketPriority.MEDIUM, color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
                        { label: 'Alta', value: TicketPriority.HIGH, color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
                        { label: 'Crítica', value: TicketPriority.CRITICAL, color: 'bg-red-500/20 text-red-500 border-red-500/30' }
                    ].map(priority => (
                        <label key={priority.value} className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all
                            ${formData.priority === priority.value ? priority.color + ' ring-1 ring-offset-1 ring-offset-[#1f2937]' : 'border-border-dark text-text-secondary hover:bg-white/5'}
                        `}>
                            <input
                                type="radio"
                                name="priority"
                                value={priority.value}
                                checked={formData.priority === priority.value}
                                onChange={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                                className="hidden"
                            />
                            <span className={`w-3 h-3 rounded-full ${formData.priority === priority.value ? 'bg-current' : 'bg-gray-600'}`}></span>
                            <span className="font-medium">{priority.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-white text-sm font-medium">Descrição Detalhada *</label>
                <textarea
                    value={formData.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="w-full h-[200px] bg-white text-black p-4 rounded-lg outline-none focus:ring-2 focus:ring-primary resize-y"
                    placeholder="Descreva o problema detalhadamente..."
                    required
                />
            </div>
        </div>

        {/* Attachments */}
        <div className="bg-background-card border border-border-light rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">attach_file</span>
                    Anexos (Obrigatório)
                </h2>
                <span className="text-xs text-text-muted">{attachments.length}/3 arquivos</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                 {/* Upload Button */}
                 {attachments.length < 3 && (
                    <div className="relative group">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            accept="image/png,image/jpeg,image/jpg,application/pdf"
                            multiple
                        />
                        <div className="h-24 border-2 border-dashed border-border-dark rounded-lg flex flex-col items-center justify-center gap-2 group-hover:border-primary group-hover:bg-primary/5 transition-all">
                            <span className="material-symbols-outlined text-2xl text-text-muted group-hover:text-primary">add_circle</span>
                            <span className="text-xs text-text-muted font-medium">Adicionar</span>
                        </div>
                    </div>
                 )}

                 {/* File List */}
                 {attachments.map((file, idx) => (
                     <div key={idx} className="relative group h-24 bg-background-input border border-border-dark rounded-lg p-2 flex flex-col items-center justify-center gap-1 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-red-600"
                        >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                        
                        {file.data.startsWith('data:image') ? (
                            <img src={file.data} alt="preview" className="h-12 object-contain" />
                        ) : (
                            <span className="material-symbols-outlined text-3xl text-text-secondary">description</span>
                        )}
                        <span className="text-xs text-text-muted truncate w-full text-center" title={file.name}>{file.name}</span>
                     </div>
                 ))}
            </div>
        </div>

        <div className="flex justify-end pt-4">
            <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading ? (
                    <>
                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        Enviando...
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined">send</span>
                        Abrir Chamado
                    </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default NewTicket;
