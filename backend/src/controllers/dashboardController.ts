import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { period, status, userId } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    // Period Filter
    if (period === 'today') {
      dateFilter = `AND t.created_at >= CURRENT_DATE`;
    } else if (period === 'week') {
      dateFilter = `AND t.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'month') {
      dateFilter = `AND t.created_at >= NOW() - INTERVAL '30 days'`;
    }

    // Base query conditions based on Role
    let roleCondition = '';
    if (user.role === 'Cliente') {
        roleCondition = `AND t.client_name = $${paramIndex}`;
        params.push(user.name);
        paramIndex++;
    } else if (user.role === 'Suporte Técnico') {
        roleCondition = `AND t.technician_id = $${paramIndex}`;
        params.push(user.id);
        paramIndex++;
    }

    // Stats Query
    // 1. Total Tickets
    const totalTicketsQuery = `SELECT COUNT(*) FROM tickets t WHERE 1=1 ${roleCondition} ${dateFilter}`;
    const totalTicketsRes = await pool.query(totalTicketsQuery, params);

    // 2. Tickets by Status
    const statusQuery = `
        SELECT status, COUNT(*) as count 
        FROM tickets t 
        WHERE 1=1 ${roleCondition} ${dateFilter}
        GROUP BY status
    `;
    const statusRes = await pool.query(statusQuery, params);

    // 3. Tickets by Day (Last 7 days) for Chart
    const chartQuery = `
        SELECT TO_CHAR(created_at, 'Dy') as name, COUNT(*) as chamados
        FROM tickets t
        WHERE created_at >= NOW() - INTERVAL '7 days' ${roleCondition}
        GROUP BY TO_CHAR(created_at, 'Dy'), DATE(created_at)
        ORDER BY DATE(created_at)
    `;
    const chartRes = await pool.query(chartQuery, params); // Note: params might need adjustment if roleCondition used

    // 4. SLA (Mock logic or based on resolved time if available)
    // We don't have resolved_at, but we have updated_at and status='Resolvido'
    const resolvedQuery = `SELECT COUNT(*) FROM tickets t WHERE status = 'Resolvido' ${roleCondition} ${dateFilter}`;
    const resolvedRes = await pool.query(resolvedQuery, params);

    // 5. Recent Activity (Latest tickets)
    const recentQuery = `
        SELECT t.id, t.code, t.subject, t.status, t.created_at, u.name as technician_name
        FROM tickets t
        LEFT JOIN users u ON t.technician_id = u.id
        WHERE 1=1 ${roleCondition} ${dateFilter}
        ORDER BY t.created_at DESC
        LIMIT 5
    `;
    const recentRes = await pool.query(recentQuery, params);

    const stats = {
        totalTickets: parseInt(totalTicketsRes.rows[0].count),
        byStatus: statusRes.rows,
        chartData: chartRes.rows,
        resolvedCount: parseInt(resolvedRes.rows[0].count),
        recentActivity: recentRes.rows
    };

    res.json(stats);

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Erro ao carregar estatísticas' });
  }
};
