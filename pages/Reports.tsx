import React, { useState, useEffect } from 'react';
import { TicketService } from '../services/api';
import { Ticket } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        try {
            // Ideally backend should support date range filters.
            // For now, fetching all and filtering client-side or we can enhance backend later.
            // Assuming getTickets returns all tickets.
            const allTickets = await TicketService.getAll();
            
            let filtered = allTickets;

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                filtered = filtered.filter(t => new Date(t.createdAt) >= start);
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(t => new Date(t.createdAt) <= end);
            }

            if (filterStatus) {
                filtered = filtered.filter(t => t.status === filterStatus);
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
        
        const tableData = tickets.map(t => [
            t.code || t.id.slice(0, 8),
            t.subject,
            t.clientName,
            t.status,
            t.createdAt,
            t.technician || '-'
        ]);

        autoTable(doc, {
            head: [['Código', 'Assunto', 'Cliente', 'Status', 'Data', 'Técnico']],
            body: tableData,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [19, 91, 236] }
        });

        doc.save(`relatorio_chamados_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    const exportExcel = () => {
        // Simple CSV Export
        const headers = ['Código', 'Assunto', 'Cliente', 'Status', 'Data', 'Técnico'];
        const csvContent = [
            headers.join(','),
            ...tickets.map(t => [
                t.code || t.id.slice(0, 8),
                `"${t.subject}"`,
                `"${t.clientName}"`,
                t.status,
                t.createdAt,
                t.technician || '-'
            ].join(','))
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                            <option value="Resolvido">Resolvido</option>
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
                        <div className="flex justify-end gap-3">
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
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-background-surface border-b border-border-dark">
                                    <tr>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Código</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Assunto</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Cliente</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Status</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Data</th>
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Técnico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {tickets.length > 0 ? tickets.map(t => (
                                        <tr key={t.id} className="hover:bg-background-input/30">
                                            <td className="p-3 text-white text-xs font-mono">{t.code || `CH-${t.id.slice(0,4)}`}</td>
                                            <td className="p-3 text-white text-sm">{t.subject}</td>
                                            <td className="p-3 text-text-muted text-xs">{t.clientName}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                                                    ${t.status === 'Resolvido' ? 'border-success/30 text-success bg-success/10' : 
                                                      t.status === 'Aberto' ? 'border-primary/30 text-primary bg-primary/10' : 
                                                      'border-warning/30 text-warning bg-warning/10'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-text-muted text-xs">{t.createdAt}</td>
                                            <td className="p-3 text-text-muted text-xs">{t.technician || '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-text-muted text-sm">Nenhum registro encontrado para o período selecionado.</td>
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
