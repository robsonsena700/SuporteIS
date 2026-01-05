import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Ticket, Stat, User, DashboardStats } from '../types';
import { DashboardService, AuthService } from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await DashboardService.getStats(period);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!stats) return;
    
    // Simple CSV Export
    const headers = ['Métrica', 'Valor'];
    const rows = [
      ['Total Chamados', stats.totalTickets],
      ['Resolvidos', stats.resolvedCount],
      ...stats.byStatus.map(s => [`Status: ${s.status}`, s.count]),
      ...stats.chartData.map(d => [`Dia: ${d.name}`, d.chamados])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_dashboard_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !stats) return <div className="text-white p-8">Carregando dashboard...</div>;

  const statCards: Stat[] = stats ? [
    { 
      label: 'Total de Chamados', 
      value: stats.totalTickets, 
      trend: 'No período', 
      trendType: 'neutral', 
      icon: 'inbox', 
      color: 'text-primary' 
    },
    { 
      label: 'Chamados Resolvidos', 
      value: stats.resolvedCount, 
      trend: `${((stats.resolvedCount / (stats.totalTickets || 1)) * 100).toFixed(1)}% taxa`, 
      trendType: 'up', 
      icon: 'check_circle', 
      color: 'text-success' 
    },
    { 
      label: 'Em Aberto', 
      value: stats.byStatus.find(s => s.status === 'Aberto')?.count || 0, 
      trend: 'Aguardando', 
      trendType: 'down', 
      icon: 'pending', 
      color: 'text-warning' 
    },
    { 
      label: 'Em Andamento', 
      value: stats.byStatus.find(s => s.status === 'Em Andamento')?.count || 0, 
      trend: 'Em tratativa', 
      trendType: 'neutral', 
      icon: 'trending_up', 
      color: 'text-blue-400' 
    },
  ] : [];

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* User Info & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Olá, {user?.name || 'Usuário'}</h1>
          <p className="text-text-secondary">
            {user?.role} | {user?.department || 'Geral'} | Último acesso: {user?.lastAccess ? new Date(user.lastAccess).toLocaleString() : 'Hoje'}
          </p>
        </div>
        <div className="flex gap-3">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-10 px-4 bg-background-card border border-border-dark rounded-lg text-sm font-bold text-white hover:bg-background-input transition-all outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Últimos 30 dias</option>
          </select>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-hover transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
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
        {/* Volume Chart */}
        <div className="bg-background-card border border-border-dark p-6 rounded-xl flex flex-col gap-4">
          <div>
            <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Volume de Chamados</p>
            <h3 className="text-white text-2xl font-bold">{stats?.totalTickets} <span className="text-sm font-normal text-text-muted">chamados no período</span></h3>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData || []}>
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

        {/* Recent Activity List (Replaces SLA Chart for now as requested 'Recent Activity') */}
        <div className="bg-background-card border border-border-dark p-6 rounded-xl flex flex-col gap-4">
          <div>
            <p className="text-text-secondary text-sm font-medium uppercase tracking-wider">Atividade Recente</p>
            <h3 className="text-white text-2xl font-bold">Últimos Registros</h3>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[240px] pr-2 custom-scrollbar">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-background-input/30 hover:bg-background-input/50 transition-colors border border-border-dark/50">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-white font-bold text-sm truncate max-w-[200px]">{ticket.subject}</span>
                      <span className="text-xs text-text-muted">{ticket.code} • {new Date(ticket.created_at).toLocaleDateString()}</span>
                   </div>
                   <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                       ticket.status === 'Resolvido' ? 'text-success bg-success/10 border-success/20' : 
                       ticket.status === 'Aberto' ? 'text-primary bg-primary/10 border-primary/20' : 
                       'text-warning bg-warning/10 border-warning/20'
                   }`}>
                     {ticket.status}
                   </span>
                </div>
              ))
            ) : (
                <p className="text-text-muted text-sm">Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
