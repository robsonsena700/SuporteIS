
import React from 'react';
import { User } from '../types';

interface UsersProps {
  users: User[];
}

const Users: React.FC<UsersProps> = ({ users }) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-white text-3xl font-black">Gerenciamento de Usuários</h1>
          <p className="text-text-secondary">Administre o acesso, perfis e status dos usuários do sistema.</p>
        </div>
        <button className="flex items-center gap-2 h-11 px-6 bg-primary text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Adicionar Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Usuários', value: '1,248', trend: '+12%', trendType: 'up' },
          { label: 'Ativos', value: '1,100', trend: '+5%', trendType: 'up' },
          { label: 'Suporte Técnico', value: '45', trend: 'Estável', trendType: 'neutral' },
          { label: 'Clientes', value: '1,203', trend: '+8%', trendType: 'up' },
        ].map((stat, i) => (
          <div key={i} className="bg-background-card border border-border-dark p-5 rounded-xl">
            <p className="text-text-secondary text-xs font-bold uppercase tracking-wider mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <p className="text-white text-3xl font-black">{stat.value}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trendType === 'up' ? 'text-success bg-success/10' : 'text-text-muted bg-background-input'}`}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-background-card rounded-xl border border-border-dark overflow-hidden shadow-2xl">
        <div className="p-4 bg-background-surface/50 border-b border-border-dark flex flex-wrap gap-4 items-center justify-between">
           <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Buscar por nome, e-mail ou ID..."
              className="w-full h-10 pl-10 pr-4 bg-background-input border border-border-dark rounded-lg text-sm text-white focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select className="bg-background-input border border-border-dark rounded-lg text-xs font-bold text-white px-4 h-10 focus:ring-1 focus:ring-primary">
              <option>Todos os Perfis</option>
              <option>Administrador</option>
              <option>Suporte</option>
              <option>Cliente</option>
            </select>
            <button className="flex items-center gap-2 h-10 px-4 bg-background-input border border-border-dark rounded-lg text-xs font-bold text-white">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-background-surface/30">
              <tr>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Usuário</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Perfil</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Status</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase">Último Acesso</th>
                <th className="p-4 text-[10px] font-bold text-text-secondary uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-background-input/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} className="size-10 rounded-full border border-border-dark" alt="" />
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-bold">{u.name}</span>
                        <span className="text-text-muted text-xs">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${u.profile === 'Administrador' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : u.profile === 'Suporte Técnico' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-text-muted bg-background-input border-border-dark'}`}>
                      {u.profile}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`size-1.5 rounded-full ${u.status === 'Ativo' ? 'bg-success' : 'bg-red-400'}`}></div>
                      <span className={`text-xs font-bold ${u.status === 'Ativo' ? 'text-success' : 'text-red-400'}`}>{u.status}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-text-muted text-xs font-medium">{u.lastAccess}</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="text-text-muted hover:text-white p-1.5 transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button className="text-text-muted hover:text-white p-1.5 transition-colors"><span className="material-symbols-outlined text-[18px]">more_vert</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Users;
