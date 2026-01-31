import { Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/AuditService';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, content } = req.body;

    if (!senderId) return res.status(401).json({ message: 'Unauthorized' });

    if (!receiverId || !content) {
        return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    // Validate permission (Client <-> Client block)
    const sender = await pool.query('SELECT profile FROM users WHERE id = $1', [senderId]);
    const receiver = await pool.query('SELECT profile FROM users WHERE id = $1', [receiverId]);
    
    if (receiver.rows.length === 0) {
        return res.status(404).json({ message: 'Destinatário não encontrado' });
    }

    if (sender.rows[0].profile === 'Cliente' && receiver.rows[0].profile === 'Cliente') {
        return res.status(403).json({ message: 'Comunicação entre clientes não permitida' });
    }

    const result = await pool.query(
      'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *',
      [senderId, receiverId, content]
    );

    const newMessage = result.rows[0];

    // Audit Log
    await AuditService.logMessage({
        original_message_id: newMessage.id,
        source_table: 'direct_messages',
        context_type: 'direct',
        context_id: receiverId, // In direct chat context, usually we track the "chat partner" or a thread ID. Here using receiver.
        sender_id: senderId,
        recipient_id: receiverId,
        content: content,
        metadata: { ip: req.ip, user_agent: req.headers['user-agent'] },
        created_at: newMessage.created_at
    });

    // Fetch sender name for notification
    const senderNameRes = await pool.query('SELECT name FROM users WHERE id = $1', [senderId]);
    const senderName = senderNameRes.rows[0]?.name || 'Usuário';

    // Notify receiver (create notification)
    await pool.query(
        'INSERT INTO notifications (user_id, type, reference_id, content, message_data) VALUES ($1, $2, $3, $4, $5)',
        [
            receiverId, 
            'new_dm', 
            senderId, 
            `Nova mensagem de ${senderName}`,
            JSON.stringify({
                ...newMessage,
                sender_name: senderName,
                context_type: 'direct'
            })
        ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { otherUserId } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await pool.query(
      `SELECT * FROM direct_messages 
       WHERE (sender_id = $1 AND receiver_id = $2) 
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [userId, otherUserId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar mensagens' });
  }
};

export const getConversations = async (req: AuthRequest, res: Response) => {
    // List users with whom the current user has exchanged messages, or all potential contacts?
    // For now, let's return list of users with last message info?
    // Or just rely on User List in Frontend and fetch messages when clicked.
    // Let's implement 'getRecentContacts' if needed, but for now Frontend has User List.
    res.json({ message: 'Not implemented yet, use User List' });
};
