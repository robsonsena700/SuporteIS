import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserService, AuthService } from '../services/api';
import { useLocationIBGE } from '../src/hooks/useLocationIBGE';

interface UsersProps {
  users?: User[]; // Optional to support initial load from App or self-fetch
}

const Users: React.FC<UsersProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    userId: '',
    newPassword: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Técnico',
    profile: 'Suporte Técnico',
    status: 'Ativo',
    department: '',
    phone: '',
    uf: '',
    municipality: ''
  });

  const { estados, municipios, loadingEstados, loadingMunicipios, fetchMunicipios, clearMunicipios } = useLocationIBGE();

  useEffect(() => {
    fetchUsers();
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await UserService.getAll();
      // Map API fields if necessary, assuming backend returns matching User type
      // Backend returns: id, name, email, role, profile, status, last_access, avatar, department, company, phone, created_at
      const mappedUsers = data.map((u: any) => ({
        ...u,
        lastAccess: u.last_access ? new Date(u.last_access).toLocaleString() : 'Nunca',
        createdAt: new Date(u.created_at).toLocaleString()
      }));
      setUsers(mappedUsers);
    } catch (err: any) {
      console.error(err);
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        setError('Falha ao carregar usuários. Verifique se você possui permissões de Administrador.');
      } else {
        setError('Falha ao carregar lista de usuários.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await UserService.delete(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert('Erro ao excluir usuário');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      status: user.status,
      department: user.department || '',
      phone: user.phone || '',
      uf: user.uf || '',
      municipality: user.municipality || ''
    });
    clearMunicipios();
    if (user.uf) {
      fetchMunicipios(user.uf);
    }
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setFormData({
        name: '',
        email: '',
        role: 'Técnico',
        profile: 'Suporte Técnico',
        status: 'Ativo',
        department: '',
        phone: '',
        uf: '',
        municipality: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((formData.uf && !formData.municipality) || (!formData.uf && formData.municipality)) {
      alert('UF e Município devem ser preenchidos em conjunto.');
      return;
    }
    try {
      if (selectedUser) {
        // Update
        const updated = await UserService.update(selectedUser.id, formData);
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...updated, lastAccess: u.lastAccess } : u));
      } else {
        // Create (Need password for new users, hardcoded for now or add to form)
        const password = prompt('Defina uma senha para o novo usuário:');
        if (!password) return;
        
        const created = await UserService.create({ ...formData, password });
        setUsers([created, ...users]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar usuário');
    }
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    if (!window.confirm(`Deseja alterar o status de ${user.name} para ${newStatus}?`)) return;
    
    try {
      await UserService.update(user.id, { status: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch (err) {
      alert('Erro ao atualizar status');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordForm.newPassword.length < 6) {
          alert('A senha deve ter pelo menos 6 caracteres');
          return;
      }
      
      try {
          await UserService.updatePassword(passwordForm.userId, passwordForm.newPassword);
          alert('Senha atualizada com sucesso!');
          setIsPasswordModalOpen(false);
          setPasswordForm({ userId: '', newPassword: '' });
      } catch (err) {
          alert('Erro ao atualizar senha');
      }
  };

  const openPasswordModal = (user: User) => {
      setPasswordForm({ userId: user.id, newPassword: '' });
      setIsPasswordModalOpen(true);
  };

  const canManageUsers = currentUser?.profile === 'Administrador' || currentUser?.profile === 'Líder' || currentUser?.role === 'Administrador' || currentUser?.role === 'Líder';

  if (loading) return <div className="text-white p-8">Carregando usuários...</div>;
  if (error) return <div className="text-red-400 p-8">{error}</div>;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-white text-3xl font-black">Gerenciamento de Usuários</h1>
          <p className="text-text-secondary">Administre o acesso, perfis e status dos usuários do sistema.</p>
        </div>
        {canManageUsers && (
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 h-11 px-6 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Adicionar Usuário
            </button>
        )}
      </div>

      <div className="bg-background-card rounded-xl border border-border-dark overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse block md:table">
            <thead className="hidden md:table-header-group bg-background-surface/30">
              <tr>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Usuário</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Perfil</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Status</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Depto</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group divide-y divide-border-dark">
              {users.map((u) => (
                <tr key={u.id} className="block md:table-row mb-4 md:mb-0 border border-border-dark md:border-0 rounded-lg md:rounded-none bg-background-input/10 md:bg-transparent hover:bg-background-input/40 transition-colors">
                  <td className="p-4 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                    <span className="md:hidden text-xs font-bold text-text-secondary uppercase self-center">Usuário</span>
                    <div className="flex items-center gap-3 justify-end md:justify-start">
                      <div className="size-10 rounded-full border border-border-dark bg-background-dark flex items-center justify-center text-text-secondary shrink-0">
                        {u.avatar ? <img src={u.avatar} className="size-10 rounded-full" alt="" /> : <span className="material-symbols-outlined">person</span>}
                      </div>
                      <div className="flex flex-col text-right md:text-left">
                        <span className="text-white text-sm font-bold">{u.name}</span>
                        <span className="text-text-muted text-xs break-all">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                    <span className="md:hidden text-xs font-bold text-text-secondary uppercase self-center">Perfil</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${u.role === 'Administrador' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'}`}>
                      {u.role} ({u.profile})
                    </span>
                  </td>
                  <td className="p-4 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                    <span className="md:hidden text-xs font-bold text-text-secondary uppercase self-center">Status</span>
                    <button onClick={() => toggleStatus(u)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                      <div className={`size-1.5 rounded-full ${u.status === 'Ativo' ? 'bg-success' : 'bg-red-400'}`}></div>
                      <span className={`text-xs font-bold ${u.status === 'Ativo' ? 'text-success' : 'text-red-400'}`}>{u.status}</span>
                    </button>
                  </td>
                  <td className="p-4 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                    <span className="md:hidden text-xs font-bold text-text-secondary uppercase self-center">Depto</span>
                    <span className="text-text-muted text-xs font-medium">{u.department || '-'}</span>
                  </td>
                  <td className="p-4 flex justify-between md:table-cell md:border-0">
                    <span className="md:hidden text-xs font-bold text-text-secondary uppercase self-center">Ações</span>
                    <div className="text-right w-full md:w-auto">
                    {canManageUsers && (
                        <div className="flex justify-end gap-2">
                        <button onClick={() => openPasswordModal(u)} className="text-text-muted hover:text-white p-1.5 transition-colors" title="Alterar Senha">
                            <span className="material-symbols-outlined text-[18px]">key</span>
                        </button>
                        <button onClick={() => handleEdit(u)} className="text-text-muted hover:text-white p-1.5 transition-colors" title="Editar">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="text-text-muted hover:text-red-400 p-1.5 transition-colors" title="Excluir">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        </div>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição/Criação */}
      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-card border border-border-dark w-full max-w-md rounded-2xl p-6 shadow-2xl animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6">Alterar Senha</h2>
            <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-text-secondary uppercase">Nova Senha</label>
                  <input 
                    type="password" 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="h-10 px-4 bg-background-input border border-border-dark rounded-lg text-white focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-hover transition-colors"
                  >
                    Salvar Senha
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* User Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background-card w-full max-w-lg rounded-2xl border border-border-dark shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border-dark flex justify-between items-center">
              <h3 className="text-xl font-black text-white">{selectedUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Nome</label>
                    <input 
                    required
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none" 
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Departamento</label>
                    <input 
                    value={formData.department} 
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none" 
                    />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Email</label>
                <input 
                  required
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">UF</label>
                  <select
                    value={formData.uf}
                    onChange={(e) => {
                      const uf = e.target.value;
                      setFormData(prev => ({ ...prev, uf, municipality: '' }));
                      clearMunicipios();
                      if (uf) fetchMunicipios(uf);
                    }}
                    className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                    disabled={loadingEstados}
                  >
                    <option value="">Selecione...</option>
                    {estados.map(estado => (
                      <option key={estado.id} value={estado.sigla}>{estado.sigla} - {estado.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-text-secondary uppercase">Município</label>
                  <select
                    value={formData.municipality}
                    onChange={(e) => setFormData(prev => ({ ...prev, municipality: e.target.value }))}
                    className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                    disabled={!formData.uf || loadingMunicipios}
                  >
                    <option value="">{loadingMunicipios ? 'Carregando...' : 'Selecione...'}</option>
                    {municipios.map(municipio => (
                      <option key={municipio.id} value={municipio.nome}>{municipio.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Perfil (Role)</label>
                    <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                    >
                    <option value="Cliente">Cliente</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Administrador">Administrador</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Cargo / Função</label>
                    <input 
                    value={formData.profile} 
                    onChange={e => setFormData({...formData, profile: e.target.value})}
                    className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none" 
                    />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-secondary uppercase">Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="h-10 px-3 bg-background-input border border-border-dark rounded-lg text-white text-sm focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Pendente">Pendente</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-text-secondary hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/30 transition-all">
                  {selectedUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
