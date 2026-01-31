import React, { useState, useEffect } from 'react';
import { TicketService, AuthService } from '../services/api';
import { Ticket, User } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Reports: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterText, setFilterText] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        setCurrentUser(user);
    }, []);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const filters = {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                status: filterStatus || undefined,
                priority: filterPriority || undefined,
                search: filterText || undefined,
                category: filterCategory || undefined
            };

            // Fetch filtered data directly from backend
            const data = await TicketService.getAll(filters);
            setTickets(data);
        } catch (error) {
            console.error('Failed to fetch report', error);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(19, 91, 236); // Primary Color
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text("Relatório de Chamados", 14, 13);
        
        // Metadata
        doc.setTextColor(100);
        doc.setFontSize(10);
        let filterDesc = `Gerado em: ${new Date().toLocaleString()}`;
        if (startDate || endDate) {
            filterDesc += ` | Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`;
        }
        if (filterCategory) filterDesc += ` | Categoria: ${filterCategory}`;
        if (filterStatus) filterDesc += ` | Status: ${filterStatus}`;
        if (filterPriority) filterDesc += ` | Prioridade: ${filterPriority}`;
        if (filterText) filterDesc += ` | Busca: "${filterText}"`;
        
        // Split long text
        const splitFilterText = doc.splitTextToSize(filterDesc, 180);
        doc.text(splitFilterText, 14, 28);
        
        const isClient = currentUser?.profile === 'Cliente';

        const tableHeaders = isClient 
            ? [['Código', 'Assunto', 'Equipamento', 'Prioridade', 'Status', 'Data', 'Técnico', 'Avaliação']]
            : [['Código', 'Assunto', 'Equipamento', 'Cliente', 'Prioridade', 'Status', 'Data', 'Técnico', 'Avaliação']];

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
                t.technician || '-',
                t.rating ? `${t.rating} ★` : '-'
            ];
            return row;
        });

        autoTable(doc, {
            head: tableHeaders,
            body: tableData,
            startY: 35,
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [19, 91, 236], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            margin: { top: 35 }
        });

        doc.save(`relatorio_chamados_${new Date().toISOString().slice(0,10)}.pdf`);
    };

    const exportExcel = () => {
        const isClient = currentUser?.profile === 'Cliente';

        // Metadata rows
        const metadata = [
            ['Relatório de Chamados'],
            [`Gerado em: ${new Date().toLocaleString()}`]
        ];
        
        if (startDate || endDate) {
            metadata.push([`Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Início'} até ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`]);
        }
        if (filterCategory) metadata.push([`Categoria: ${filterCategory}`]);
        if (filterStatus) metadata.push([`Status: ${filterStatus}`]);
        if (filterPriority) metadata.push([`Prioridade: ${filterPriority}`]);
        if (filterText) metadata.push([`Busca: "${filterText}"`]);
        metadata.push([]); // Empty row spacing

        // Headers
        const headers = [
            'Código', 
            'Assunto', 
            'Equipamento', 
            ...(!isClient ? ['Cliente'] : []), 
            'Prioridade', 
            'Status', 
            'Data Criação', 
            'Técnico', 
            'Avaliação', 
            'Descrição'
        ];

        // Data rows
        const rows = tickets.map(t => [
            t.code || t.id.slice(0, 8),
            t.subject,
            t.equipment,
            ...(!isClient ? [t.clientName] : []),
            t.priority,
            t.status,
            t.createdAt,
            t.technician || '-',
            t.rating || '-',
            t.description
        ]);

        const wsData = [...metadata, headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Adjust column widths
        const wscols = [
            {wch: 10}, // Code
            {wch: 30}, // Subject
            {wch: 20}, // Equipment
            ...(!isClient ? [{wch: 20}] : []), // Client
            {wch: 10}, // Priority
            {wch: 15}, // Status
            {wch: 20}, // Date
            {wch: 20}, // Technician
            {wch: 10}, // Rating
            {wch: 50}  // Description
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório");
        XLSX.writeFile(wb, `relatorio_chamados_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-text-primary text-3xl font-black">Relatórios</h1>
                <p className="text-text-secondary">Exportação e análise de chamados</p>
            </div>

            <div className="bg-background-card p-6 rounded-xl border border-border-dark flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-text-secondary text-sm font-bold">Busca</label>
                        <input 
                            type="text" 
                            placeholder="Buscar por assunto, ID, técnico..."
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-text-primary focus:ring-1 focus:ring-primary outline-none"
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-text-secondary text-sm font-bold">Categoria</label>
                        <select 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-text-primary focus:ring-1 focus:ring-primary outline-none"
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="">Todas</option>
                            <option value="Serviço">Serviço</option>
                            <option value="Equipamento">Equipamento</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-text-secondary text-sm font-bold">Data Inicial</label>
                        <input 
                            type="date" 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-text-primary focus:ring-1 focus:ring-primary outline-none"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-text-secondary text-sm font-bold">Data Final</label>
                        <input 
                            type="date" 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-text-primary focus:ring-1 focus:ring-primary outline-none"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-text-secondary text-sm font-bold">Status</label>
                        <select 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-text-primary focus:ring-1 focus:ring-primary outline-none"
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
                        <label className="text-text-secondary text-sm font-bold">Prioridade</label>
                        <select 
                            className="h-10 bg-background-input border border-border-dark rounded-lg px-3 text-text-primary focus:ring-1 focus:ring-primary outline-none"
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
                        <div className="flex flex-wrap justify-between items-center gap-3">
                            <div className="text-text-primary font-bold">
                                Total de chamados encontrados: <span className="text-primary">{tickets.length}</span>
                            </div>
                            <div className="flex gap-3">
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
                                        <th className="p-3 text-xs font-bold text-text-secondary uppercase">Avaliação</th>
                                    </tr>
                                </thead>
                                <tbody className="block md:table-row-group divide-y divide-border-dark">
                                    {tickets.length > 0 ? tickets.map(t => (
                                        <tr key={t.id} className="block md:table-row mb-4 md:mb-0 border border-border-dark md:border-0 rounded-lg md:rounded-none bg-background-input/10 hover:bg-background-input/30">
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Código</span>
                                                <span className="text-text-primary text-xs font-mono">{t.code || `CH-${t.id.slice(0,4)}`}</span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Assunto</span>
                                                <span className="text-text-primary text-sm text-right md:text-left">{t.subject}</span>
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
                                            <td className="p-3 flex justify-between md:table-cell border-b border-border-dark md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Técnico</span>
                                                <span className="text-text-muted text-xs text-right md:text-left">{t.technician || '-'}</span>
                                            </td>
                                            <td className="p-3 flex justify-between md:table-cell md:border-0">
                                                <span className="md:hidden text-xs font-bold text-text-secondary uppercase">Avaliação</span>
                                                <span className="text-text-muted text-xs text-right md:text-left flex items-center justify-end md:justify-start gap-1">
                                                    {t.rating ? (
                                                        <>
                                                            <span className="text-yellow-500 material-symbols-outlined text-[14px]">star</span>
                                                            {t.rating}
                                                        </>
                                                    ) : '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={currentUser?.profile !== 'Cliente' ? 9 : 8} className="p-8 text-center text-text-muted text-sm">Nenhum registro encontrado para o período selecionado.</td>
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
