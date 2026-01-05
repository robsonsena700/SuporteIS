import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

export const getTickets = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as technician_name, u.avatar as technician_avatar 
      FROM tickets t
      LEFT JOIN users u ON t.technician_id = u.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar chamados' });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ticketResult = await pool.query(`
      SELECT t.*, u.name as technician_name, u.avatar as technician_avatar 
      FROM tickets t
      LEFT JOIN users u ON t.technician_id = u.id
      WHERE t.id::text = $1 OR t.code = $1
    `, [id]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ message: 'Chamado não encontrado' });
    }

    const ticket = ticketResult.rows[0];

    // Fetch messages
    const messagesResult = await pool.query(`
      SELECT m.*, u.name as sender_name 
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `, [ticket.id]);

    ticket.messages = messagesResult.rows;

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do chamado' });
  }
};

export const createTicket = async (req: AuthRequest, res: Response) => {
  const { subject, description, equipment, client_name, priority, status } = req.body;
  const code = 'CH-' + Math.floor(Math.random() * 10000); // Simple code generation

  try {
    const newTicket = await pool.query(
      'INSERT INTO tickets (code, subject, description, equipment, client_name, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [code, subject, description, equipment, client_name, priority, status || 'Aberto']
    );
    
    // Create initial message
    if (description && req.user) {
        // Need to ensure req.user.id is available. AuthMiddleware should provide it.
        // Assuming current user is the creator (or client). 
        // If client is creating, sender_id is req.user.id.
        await pool.query(
            'INSERT INTO messages (ticket_id, sender_id, content, is_internal) VALUES ($1, $2, $3, $4)',
            [newTicket.rows[0].id, req.user.id, description, false]
        );
    }

    res.status(201).json(newTicket.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar chamado' });
  }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, priority, technician_id } = req.body;

  try {
    const updatedTicket = await pool.query(
      'UPDATE tickets SET status = COALESCE($1, status), priority = COALESCE($2, priority), technician_id = COALESCE($3, technician_id), updated_at = NOW() WHERE id = $4 OR code = $4 RETURNING *',
      [status, priority, technician_id, id]
    );
    
    if (updatedTicket.rows.length === 0) {
      return res.status(404).json({ message: 'Chamado não encontrado' });
    }

    res.json(updatedTicket.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar chamado' });
  }
};

export const addMessage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // Ticket ID or Code
  const { content, is_internal } = req.body;
  
  try {
      // Resolve ID if code provided
      let ticketId = id;
      if (id.startsWith('CH-')) {
          const t = await pool.query('SELECT id FROM tickets WHERE code = $1', [id]);
          if (t.rows.length === 0) return res.status(404).json({message: 'Ticket not found'});
          ticketId = t.rows[0].id;
      }

      const newMessage = await pool.query(
          'INSERT INTO messages (ticket_id, sender_id, content, is_internal) VALUES ($1, $2, $3, $4) RETURNING *, (SELECT name FROM users WHERE id = $2) as sender_name',
          [ticketId, req.user?.id, content, is_internal || false]
      );
      
      res.status(201).json(newMessage.rows[0]);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao adicionar mensagem' });
  }
};
