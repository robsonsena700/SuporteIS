import React, { useState, useEffect } from 'react';
import { TicketService, AuthService } from '../services/api';
import { Ticket, User } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        setCurrentUser(user);
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            // Ideally backend should support date range filters.
            // For now, fetching all and filtering client-side or we can enhance backend later.
            // Assuming getTickets returns all tickets.
            const allTickets = await TicketService.getAll();
            
            let filtered = allTickets;

            // Client Isolation: Only show tickets where clientName matches current user
            if (currentUser?.profile === 'Cliente') {
                filtered = filtered.filter(t => t.clientName === currentUser.name);
            }

            if (startDate) {
                const [y, m, d] = startDate.split('-').map(Number);
                const start = new Date(y, m - 1, d); // Local midnight
                filtered = filtered.filter(t => {
                    // Use ISO date if available, otherwise fallback to parsing (risky but fallback)
                    // If t.createdAt is "DD/MM/YYYY HH:mm:ss", new Date() might fail.
                    // But we added createdAtIso to API and Types, so it should be there for new fetches.
                    const dateStr = t.createdAtIso || t.createdAt;
                    // If dateStr is "DD/MM/YYYY...", new Date() might still be invalid.
                    // But we assume createdAtIso is present now.
                    return new Date(dateStr) >= start;
                });
            }

            if (endDate) {
                const [y, m, d] = endDate.split('-').map(Number);
                const end = new Date(y, m - 1, d, 23, 59, 59, 999); // Local end of day
                filtered = filtered.filter(t => {
                    const dateStr = t.createdAtIso || t.createdAt;
                    return new Date(dateStr) <= end;
                });
            }

            if (filterStatus) {
                filtered = filtered.filter(t => t.status === filterStatus);
            }

            if (filterPriority) {
                filtered = filtered.filter(t => t.priority === filterPriority);
            }

            setTickets(filtered);
        } catch (error) {
            console.error('Failed to fetch report', error);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text("Relatório de Chamados", 14, 16);
        
        const isClient = currentUser?.profile === 'Cliente';

        const tableHeaders = isClient 
            ? [['Código', 'Assunto', 'Equipamento', 'Prioridade', 'Status', 'Data', 'Técnico']]
            : [['Código', 'Assunto', 'Equipamento', 'Cliente', 'Prioridade', 'Status', 'Data', 'Técnico']];

        const tableData = tickets.map(t => {
            const row = [
                t.code || t.id.slice(0, 8),
                t.subject,
                t.equipment,
                // Client Name only if not client
                ...(isClient ? [] : [t.clientName]),
                t.priority,
                t.status,
                t.createdAt,
                t.technician || '-'
            ];
            return row;
        });

        autoTable(doc, {
            head: tableHeaders,
            body: tableData,
            startY: 20,
            styles: { fontSize: 7 },
            headStyles: { fillColor: [19, 91, 236] }
        });

        doc.save(`relatorio_chamados_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    const exportExcel = () => {
        const isClient = currentUser?.profile === 'Cliente';
        
        // Simple CSV Export
        const headers = isClient
            ? ['Código', 'Assunto', 'Equipamento', 'Prioridade', 'Status', 'Data', 'Técnico']
            : ['Código', 'Assunto', 'Equipamento', 'Cliente', 'Prioridade', 'Status', 'Data', 'Técnico'];

        const csvContent = [
            headers.join(','),
            ...tickets.map(t => {
                const row = [
                    t.code || t.id.slice(0, 8),
                    `"${t.subject}"`,
                    `"${t.equipment}"`,
                    // Client Name only if not client
                    ...(isClient ? [] : [`"${t.clientName}"`]),
                    t.priority,
                    t.status,
                    t.createdAt,
                    t.technician || '-'
                ];
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `relatorio_chamados_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-white text-3xl font-black">Relatórios</h1>
                <p className="text-text-secondary">Exportação e análise de chamados</p>
            </div>

            <div className="bg-background-card p-6 rounded-xl border border-border-dark flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-white text-sm font-bold">Data Inicial</label>
                        <input 
                            type="date" 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-white focus:ring-1 focus:ring-primary outline-none"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-white text-sm font-bold">Data Final</label>
                        <input 
                            type="date" 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-white focus:ring-1 focus:ring-primary outline-none"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-white text-sm font-bold">Status</label>
                        <select 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-white focus:ring-1 focus:ring-primary outline-none"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="Aberto">Aberto</option>
                            <option value="Em Andamento">Em Andamento</option>
                            <option value="Em Análise">Em Análise</option>
                            <option value="Resolvido">Resolvido</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-white text-sm font-bold">Prioridade</label>
                        <select 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-white focus:ring-1 focus:ring-primary outline-none"
                            value={filterPriority}
                            onChange={e => setFilterPriority(e.target.value)}
                        >
                            <option value="">Todas</option>
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                        </select>
                    </div>
                    <button 
                        onClick={fetchReport}
                        className="h-10 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-all"
                    >
                        Gerar Relatório
                    </button>
                </div>

                {loading ? (
                    <div className="text-center text-text-muted py-10">Carregando dados...</div>
                ) : (
                    <>
                        <div className="flex flex-wrap justify-end gap-3">
                            <button 
                                onClick={exportExcel}
                                disabled={tickets.length === 0}
                                className="flex items-center gap-2 px-4 py-2 border border-green-600/50 text-green-500 hover:bg-green-600/10 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined">table_view</span>
                                Exportar Excel
                            </button>
                            <button 
                                onClick={exportPDF}
                                disabled={tickets.length === 0}
                                className="flex items-center gap-2 px-4 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/10 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined">picture_as_pdf</span>
                                Exportar PDF
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-border-dark rounded-lg">
                            <table className="w-full text-left border-collapse block md:table">
                                <thead className="hidden md:table-header-group bg-background-surface border-b border-border-dark">
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Código</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Assunto</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Equipamento</th>
                                        {currentUser?.profile !== 'Cliente' && (
                                            <th className="p-3 text-xs font-bold text-text-secondary uppercase">Cliente</th>
                                        )}
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Prioridade</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Status</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Data</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Técnico</th>
                                    </tr>
                                </thead>
                                <tbody className="block md:table-row-group divide-y divide-border-dark">
                                    {tickets.length > 0 ? tickets.map(t => (
                                        <tr key={t.id} className="block md:table-row mb-4 md:mb-0 border border-border-dark md:border-0 rounded-lg md:rounded-none bg-background-input/10 hover:bg-background-input/30">
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Código</span>
                                                <span className="text-white text-xs font-mono">{t.code || `CH-${t.id.slice(0,4)}`}</span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Assunto</span>
                                                <span className="text-white text-sm text-right md:text-left">{t.subject}</span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Equipamento</span>
                                                <span className="text-text-muted text-xs text-right md:text-left">{t.equipment}</span>
                                            </td>
                                            {currentUser?.profile !== 'Cliente' && (
                                                <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                    <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Cliente</span>
                                                    <span className="text-text-muted text-xs text-right md:text-left">{t.clientName}</span>
                                                </td>
                                            )}
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Prioridade</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                                                    ${t.priority === 'Alta' ? 'border-red-500/30 text-red-500 bg-red-500/10' : 
                                                      t.priority === 'Média' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' : 
                                                      'border-green-500/30 text-green-500 bg-green-500/10'}`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Status</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                                                    ${t.status === 'Resolvido' ? 'border-success/30 text-success bg-success/10' : 
                                                      t.status === 'Aberto' ? 'border-primary/30 text-primary bg-primary/10' : 
                                                      'border-warning/30 text-warning bg-warning/10'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Data</span>
                                                <span className="text-text-muted text-xs text-right md:text-left">{t.createdAt}</span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Técnico</span>
                                                <span className="text-text-muted text-xs text-right md:text-left">{t.technician || '-'}</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={currentUser?.profile !== 'Cliente' ? 8 : 7} className="p-8 text-center text-text-muted text-sm">Nenhum registro encontrado para o período selecionado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Reports;
