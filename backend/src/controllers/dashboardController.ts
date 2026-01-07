import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { period, status, userId, myTickets } = req.query;

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
    if (user.role === 'Cliente' || user.profile === 'Cliente') {
        // Use user_id for robust client filtering (instead of client_name)
        roleCondition = `AND t.user_id = $${paramIndex}`;
        params.push(user.id);
        paramIndex++;
    } else {
        // For Admin and Support, filter if myTickets is true
        // Frontend sends myTickets=true (string)
        if (myTickets === 'true') {
             // Support Technician logic
             // Check profile OR role to be safe (profile is in JWT now, role is DB column)
             if (user.profile === 'Suporte Técnico' || user.role === 'Suporte Técnico' || user.role === 'Técnico') {
                 roleCondition = `AND t.technician_id = $${paramIndex}`;
                 params.push(user.id);
                 paramIndex++;
             } 
             // Admin logic - if they want to see "My Tickets", assume assigned to them
             else if (user.role === 'Administrador' || user.profile === 'Administrador') {
                 roleCondition = `AND t.technician_id = $${paramIndex}`;
                 params.push(user.id);
                 paramIndex++;
             }
        }
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
        SELECT EXTRACT(DOW FROM created_at) as day_num, COUNT(*) as chamados
        FROM tickets t
        WHERE created_at >= NOW() - INTERVAL '7 days' ${roleCondition}
        GROUP BY EXTRACT(DOW FROM created_at), DATE(created_at)
        ORDER BY DATE(created_at)
    `;
    const chartRes = await pool.query(chartQuery, params);

    const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const chartData = chartRes.rows.map(row => ({
        name: daysMap[parseInt(row.day_num)],
        chamados: parseInt(row.chamados)
    }));

    // 4. SLA (Mock logic or based on resolved time if available)
    // We don't have resolved_at, but we have updated_at and status='Resolvido'
    const resolvedQuery = `SELECT COUNT(*) FROM tickets t WHERE status = 'Resolvido' ${roleCondition} ${dateFilter}`;
    const resolvedRes = await pool.query(resolvedQuery, params);

    // 5. Average Rating
    const ratingQuery = `SELECT AVG(rating) as avg_rating FROM tickets t WHERE rating IS NOT NULL ${roleCondition} ${dateFilter}`;
    const ratingRes = await pool.query(ratingQuery, params);

    // 6. Recent Activity (Latest tickets)
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
        chartData: chartData,
        resolvedCount: parseInt(resolvedRes.rows[0].count),
        averageRating: parseFloat(ratingRes.rows[0].avg_rating || '0').toFixed(1),
        recentActivity: recentRes.rows
    };

    res.json(stats);

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Erro ao carregar estatísticas' });
  }
};
