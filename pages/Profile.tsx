
import React from 'react';
import { User } from '../types';

interface ProfileProps {
  user: User | null;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-white text-3xl font-black">Ajustes de Perfil</h1>
        <p className="text-text-secondary">Gerencie suas informações pessoais e preferências de conta.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-background-card border border-border-dark p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8">
        <div className="relative group">
          <div className="size-32 rounded-full bg-cover bg-center border-4 border-background-surface ring-4 ring-primary/20" style={{ backgroundImage: `url(${user?.avatar})` }} />
          <button className="absolute bottom-1 right-1 size-9 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary-hover transition-all">
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col gap-4 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h2 className="text-white text-2xl font-bold">{user?.name}</h2>
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{user?.role}</span>
            </div>
            <p className="text-text-muted text-sm">{user?.email} • ID: #48291</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <button className="px-4 h-9 bg-background-input border border-border-dark rounded-lg text-xs font-bold text-white hover:bg-background-input/50 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              Alterar Foto
            </button>
            <button className="px-4 h-9 bg-transparent border border-red-500/30 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Remover
            </button>
          </div>
        </div>
      </div>

      <form className="flex flex-col gap-6">
        <div className="bg-background-card rounded-2xl border border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-dark flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">person</span>
            <h3 className="text-white text-lg font-bold">Informações Pessoais</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Nome Completo</label>
              <input defaultValue={user?.name} className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Nome Social (Opcional)</label>
              <input placeholder="Como gostaria de ser chamado" className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Email Corporativo</label>
              <input readOnly defaultValue={user?.email} className="h-12 bg-background-surface border border-border-dark rounded-lg px-4 text-text-muted cursor-not-allowed" />
              <p className="text-[10px] text-text-muted italic">Para alterar seu email, contate o administrador.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Telefone / Celular</label>
              <input defaultValue="(11) 98765-4321" className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all" />
            </div>
          </div>
        </div>

        <div className="bg-background-card rounded-2xl border border-border-dark overflow-hidden">
          <div className="p-6 border-b border-border-dark flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">badge</span>
            <h3 className="text-white text-lg font-bold">Dados do Sistema</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Cargo / Função</label>
              <input defaultValue={user?.role} className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Departamento</label>
              <select className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all">
                <option>Suporte Técnico TI</option>
                <option>Manutenção Geral</option>
                <option>Operações</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Fuso Horário</label>
              <select className="h-12 bg-background-input border border-border-dark rounded-lg px-4 text-white focus:ring-1 focus:ring-primary transition-all">
                <option>(GMT-03:00) Brasília</option>
                <option>(GMT-04:00) Manaus</option>
                <option>(GMT-00:00) UTC</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-text-secondary text-sm font-medium">Perfil de Acesso</label>
              <input readOnly defaultValue={user?.profile} className="h-12 bg-background-surface border border-border-dark rounded-lg px-4 text-text-muted cursor-not-allowed" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-2">
           <button type="button" className="px-6 h-12 border border-border-dark text-white font-bold rounded-lg hover:bg-background-input transition-all">
            Cancelar
          </button>
          <button type="submit" onClick={(e) => e.preventDefault()} className="px-10 h-12 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover shadow-xl shadow-primary/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">save</span>
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
