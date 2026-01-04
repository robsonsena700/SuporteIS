
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Ticket, Stat } from '../types';

const data = [
  { name: 'Seg', chamados: 40 },
  { name: 'Ter', chamados: 30 },
  { name: 'Qua', chamados: 20 },
  { name: 'Qui', chamados: 27 },
  { name: 'Sex', chamados: 18 },
  { name: 'Sab', chamados: 23 },
  { name: 'Dom', chamados: 34 },
];

const slaData = [
  { name: 'Sem 1', value: 95 },
  { name: 'Sem 2', value: 98 },
  { name: 'Sem 3', value: 97 },
  { name: 'Sem 4', value: 99.5 },
];

const Dashboard: React.FC<{ tickets: Ticket[] }> = ({ tickets }) => {
  const stats: Stat[] = [
    { label: 'Chamados Abertos', value: tickets.filter(t => t.status !== 'Resolvido').length, trend: '+2 vs ontem', trendType: 'up', icon: 'inbox', color: 'text-primary' },
    { label: 'Resolvidos Hoje', value: 12, trend: '+15% vs meta', trendType: 'up', icon: 'check_circle', color: 'text-success' },
    { label: 'Tempo Médio (MTTR)', value: '2h 15m', trend: '-10m vs ontem', trendType: 'down', icon: 'timer', color: 'text-warning' },
    { label: 'Alertas Críticos', value: 3, trend: 'Estável', trendType: 'neutral', icon: 'warning', color: 'text-red-500' },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Visão Geral</h1>
          <p className="text-text-secondary">Acompanhamento em tempo real da operação de suporte</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 h-10 px-4 bg-background-card border border-border-dark rounded-lg text-sm font-bold text-white hover:bg-background-input transition-all">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            Hoje
          </button>
          <button className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-hover transition-all">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-background-card border border-border-dark p-6 rounded-xl shadow-sm hover:border-primary/50 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <p className="text-text-secondary text-sm font-medium">{stat.label}</p>
              <span className={`material-symbols-outlined ${stat.color} group-hover:scale-110 transition-transform`}>{stat.icon}</span>
            </div>
            <p className="text-white text-3xl font-bold mb-2">{stat.value}</p>
            <div className="flex items-center gap-1">
              <span className={`material-symbols-outlined text-sm ${stat.trendType === 'up' ? 'text-success' : stat.trendType === 'down' ? 'text-warning' : 'text-text-muted'}`}>
                {stat.trendType === 'up' ? 'trending_up' : stat.trendType === 'down' ? 'trending_down' : 'remove'}
              </span>
              <p className={`text-xs font-bold ${stat.trendType === 'up' ? 'text-success' : stat.trendType === 'down' ? 'text-warning' : 'text-text-muted'}`}>
                {stat.trend}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background-card border border-border-dark p-6 rounded-xl flex flex-col gap-4">
          <div>
            <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Volume Semanal</p>
            <h3 className="text-white text-2xl font-bold">145 Chamados <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded ml-2">+12%</span></h3>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a3649" />
                <XAxis dataKey="name" stroke="#63748e" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#63748e" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3649', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="chamados" fill="#135bec" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-background-card border border-border-dark p-6 rounded-xl flex flex-col gap-4">
          <div>
            <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">SLA de Resolução</p>
            <h3 className="text-white text-2xl font-bold">98.5% <span className="text-xs font-bold text-success bg-success/10 px-2 py-0.5 rounded ml-2">+2.4%</span></h3>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#135bec" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#135bec" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#63748e" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#63748e" fontSize={12} tickLine={false} axisLine={false} domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #2a3649', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="value" stroke="#135bec" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
