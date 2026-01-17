import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await pool.query(
      `
      SELECT n.*
      FROM notifications n
      LEFT JOIN tickets t ON n.reference_id = t.id
      WHERE n.user_id = $1
        AND (t.id IS NULL OR t.user_id = $1 OR t.technician_id = $1)
      ORDER BY n.created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    let ticketNotifications: { reference_id: string }[] = [];

    if (id === 'all') {
      const result = await pool.query(
        'SELECT id, type, reference_id FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [userId]
      );
      ticketNotifications = result.rows.filter(
        (n: any) => n.type === 'new_message' && n.reference_id
      );
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    } else {
      const result = await pool.query(
        'SELECT id, type, reference_id FROM notifications WHERE id = $1 AND user_id = $2 AND is_read = FALSE',
        [id, userId]
      );
      ticketNotifications = result.rows.filter(
        (n: any) => n.type === 'new_message' && n.reference_id
      );
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
    }

    if (ticketNotifications.length > 0) {
      for (const notification of ticketNotifications) {
        try {
          await pool.query(
            `INSERT INTO ticket_history (ticket_id, user_id, change_type, old_value, new_value, details)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              notification.reference_id,
              userId,
              'READ',
              null,
              null,
              'Notificação de nova mensagem marcada como lida',
            ]
          );
        } catch (historyError) {
          console.error('Failed to log read notification in ticket history:', historyError);
        }
      }
    }

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar notificação' });
  }
};
