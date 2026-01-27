import React, { useRef, useState, useEffect } from 'react';
import { User } from '../types';
import { AuthService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface ProfileProps {
  user: User | null;
  onUpdate: (updatedUser: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { theme, setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    role: '',
    avatar: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        department: user.department || '',
        role: user.role || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedUser = await AuthService.updateProfile({
        name: formData.name,
        phone: formData.phone,
        department: formData.department,
        avatar: formData.avatar
      });
      
      onUpdate(updatedUser);
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-white text-3xl font-black">Ajustes de Perfil</h1>
        <p className="text-text-secondary">Gerencie suas informações pessoais e preferências de conta.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl text-sm">
          {success}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-background-card border border-border-dark p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div 
            className="size-32 rounded-full bg-cover bg-center border-4 border-background-surface ring-4 ring-primary/20 bg-background-input" 
            style={{ backgroundImage: formData.avatar ? `url(${formData.avatar})` : 'none' }} 
          >
             {!formData.avatar && (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <span className="material-symbols-outlined text-4xl">person</span>
                </div>
             )}
          </div>
          <button 
            onClick={triggerFileInput}
            className="absolute bottom-1 right-1 size-9 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-hover transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h2 className="text-white text-2xl font-bold">{formData.name || user?.name}</h2>
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{user?.role}</span>
            </div>
            <p className="text-text-muted text-sm">{user?.email} • ID: #{user?.id?.substring(0, 5)}</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <button 
              onClick={triggerFileInput}
              className="px-4 h-9 bg-background-input border border-border-dark rounded-lg text-xs font-bold text-white hover:bg-background-input/50 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              Alterar Foto
            </button>
            {formData.avatar && (
              <button 
                onClick={handleRemovePhoto}
                className="px-4 h-9 bg-transparent border border-red-500/30 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Remover
              </button>
            )}
          </div>
        </div>
      </div>

      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <div className="bg-background-card rounded-2xl border border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-dark flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">person</span>
            <h3 className="text-white text-lg font-bold">Informações Pessoais</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Nome Completo</label>
              <input 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Email Corporativo</label>
              <input 
                readOnly 
                value={user?.email || ''} 
                className="h-12 bg-background-surface border border-border-dark rounded-lg px-4 text-text-muted cursor-not-allowed" 
              />
              <p className="text-[10px] text-text-muted italic">Para alterar seu email, contate o administrador.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Telefone / Celular</label>
              <input 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="(xx) xxxxx-xxxx"
                className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Empresa</label>
              <input 
                readOnly
                value={user?.company || ''}
                className="h-12 bg-background-surface border border-border-dark rounded-lg px-4 text-text-muted cursor-not-allowed" 
              />
            </div>
          </div>
        </div>

        {user?.profile !== 'Cliente' && (
          <div className="bg-background-card rounded-2xl border border-border-dark overflow-hidden">
            <div className="p-6 border-b border-border-dark flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">badge</span>
              <h3 className="text-white text-lg font-bold">Dados do Sistema</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-text-secondary text-sm font-medium">Cargo / Função</label>
                <input 
                  readOnly
                  value={formData.role} 
                  className="h-12 bg-background-surface border border-border-dark rounded-lg px-4 text-text-muted cursor-not-allowed" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-text-secondary text-sm font-medium">Departamento</label>
                <select 
                  value={formData.department}
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Suporte Técnico TI">Suporte Técnico TI</option>
                  <option value="Cliente">Cliente</option>
                  <option value="Manutenção Geral">Manutenção Geral</option>
                  <option value="Operações">Operações</option>
                  <option value="Administrativo">Administrativo</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-text-secondary text-sm font-medium">Perfil de Acesso</label>
                <input 
                  readOnly 
                  value={user?.profile || ''} 
                  className="h-12 bg-background-surface border border-border-dark rounded-lg px-4 text-text-muted cursor-not-allowed" 
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-background-card rounded-2xl border border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-dark flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">settings_brightness</span>
            <h3 className="text-white text-lg font-bold">Preferências</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Aparência</label>
              <div className="flex items-center justify-between p-4 bg-background-input border border-border-dark rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-text-primary text-sm font-bold">Modo Escuro</span>
                    <span className="text-text-secondary text-xs">
                      {theme === 'dark' ? 'O tema escuro está ativado' : 'O tema escuro está desativado'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                    theme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${
                      theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-4 mt-2">
           <button 
             type="button" 
             onClick={() => window.history.back()}
             className="px-6 h-12 border border-border-dark text-text-primary font-bold rounded-lg hover:bg-background-input transition-all"
           >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="px-10 h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-xl shadow-primary/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              'Salvando...'
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">save</span>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
