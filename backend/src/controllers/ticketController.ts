import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

export const getTickets = async (req: AuthRequest, res: Response) => {
  try {
    let queryText = `
      SELECT t.*, 
             tech.name as technician_name, tech.avatar as technician_avatar,
             creator.name as creator_name
      FROM tickets t
      LEFT JOIN users tech ON t.technician_id = tech.id
      LEFT JOIN users creator ON t.user_id = creator.id
    `;
    
    const queryParams: any[] = [];

    if (req.user?.role === 'Cliente') {
        queryText += ` WHERE t.user_id = $1`;
        queryParams.push(req.user.id);
    }

    queryText += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar chamados' });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ticketResult = await pool.query(`
      SELECT t.*, 
             tech.name as technician_name, tech.avatar as technician_avatar,
             creator.name as creator_name
      FROM tickets t
      LEFT JOIN users tech ON t.technician_id = tech.id
      LEFT JOIN users creator ON t.user_id = creator.id
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
  const { subject, description, equipment, client_name, priority, status, attachment } = req.body;
  const code = 'CH-' + Math.floor(Math.random() * 10000); // Simple code generation

  try {
    const newTicket = await pool.query(
      'INSERT INTO tickets (code, subject, description, equipment, client_name, priority, status, attachment, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [code, subject, description, equipment, client_name, priority, status || 'Aberto', attachment || null, req.user?.id]
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

  // Permission Check: Clients cannot update tickets directly
  if (req.user?.role === 'Cliente') {
      return res.status(403).json({ message: 'Permissão negada. Clientes não podem atualizar chamados diretamente.' });
  }

  try {
    // If assigning a technician, record the timestamp
    let assignedAtUpdate = '';
    // Ensure undefined values are converted to null for the database driver
    const params = [
        status ?? null, 
        priority ?? null, 
        technician_id ?? null, 
        id
    ];
    
    // Dynamic query construction is safer, but for now fixed params with COALESCE is used.
    // To inject assigned_at logic cleanly with existing query structure:
    
    let query = `
        UPDATE tickets 
        SET 
            status = COALESCE($1, status), 
            priority = COALESCE($2, priority), 
            technician_id = COALESCE($3, technician_id), 
            updated_at = NOW()
            ${technician_id ? ', assigned_at = NOW()' : ''}
        WHERE id::text = $4 OR code = $4 
        RETURNING *
    `;

    console.log(`[Ticket] Updating ticket ${id}:`, { status, priority, technician_id });

    const updatedTicket = await pool.query(query, params);
    
    if (updatedTicket.rows.length === 0) {
      return res.status(404).json({ message: 'Chamado não encontrado' });
    }

    // Log transfer if technician changed
    if (technician_id) {
        try {
            await pool.query(
                'INSERT INTO audit_logs (action, entity_id, user_id, details) VALUES ($1, $2, $3, $4)',
                ['TRANSFER', updatedTicket.rows[0].id, req.user?.id, `Chamado transferido para técnico ID ${technician_id}`]
            );
        } catch (logError) {
            console.warn('Failed to create audit log for transfer', logError);
        }
    }

    res.json(updatedTicket.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar chamado' });
  }
};

export const addMessage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // Ticket ID or Code
  const { content, is_internal } = req.body;
  
  try {
      // Resolve ID if code provided
      let ticketId = id;
      let ticketResult;
      
      if (id.startsWith('CH-')) {
          ticketResult = await pool.query('SELECT id, technician_id, user_id, code FROM tickets WHERE code = $1', [id]);
      } else {
          ticketResult = await pool.query('SELECT id, technician_id, user_id, code FROM tickets WHERE id = $1', [id]);
      }

      if (ticketResult.rows.length === 0) return res.status(404).json({message: 'Ticket not found'});
      
      ticketId = ticketResult.rows[0].id;
      const currentTechnicianId = ticketResult.rows[0].technician_id;
      const ticketOwnerId = ticketResult.rows[0].user_id;
      const ticketCode = ticketResult.rows[0].code || 'CH-???';

      // Insert Message
      const newMessage = await pool.query(
          'INSERT INTO messages (ticket_id, sender_id, content, is_internal) VALUES ($1, $2, $3, $4) RETURNING *, (SELECT name FROM users WHERE id = $2) as sender_name',
          [ticketId, req.user?.id, content, is_internal || false]
      );

      // Notification Logic (Non-blocking)
      try {
        const senderId = req.user?.id;
        if (senderId && !is_internal) {
            // Fetch sender name
            const senderRes = await pool.query('SELECT name FROM users WHERE id = $1', [senderId]);
            const senderName = senderRes.rows[0]?.name || 'Usuário';

            if (senderId === ticketOwnerId) {
                // Client sent message -> Notify Technician
                if (currentTechnicianId) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, type, reference_id, content) VALUES ($1, $2, $3, $4)',
                        [currentTechnicianId, 'new_message', ticketId, `Nova mensagem de ${senderName}`]
                    );
                }
            } else {
                // Technician/Admin sent message -> Notify Client
                if (ticketOwnerId) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, type, reference_id, content) VALUES ($1, $2, $3, $4)',
                        [ticketOwnerId, 'new_message', ticketId, `Nova mensagem de ${senderName}`]
                    );
                }
            }
        }
      } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Do not fail the request
      }

      // Auto-assign Logic (Non-blocking)
      try {
        if (
            (currentTechnicianId === null || currentTechnicianId === undefined) && 
            req.user && 
            (req.user.role === 'Técnico' || req.user.role === 'Administrador')
        ) {
            console.log(`Auto-assigning ticket ${ticketId} to user ${req.user.id} (${req.user.role})`);
            await pool.query(
                'UPDATE tickets SET technician_id = $1, assigned_at = NOW(), updated_at = NOW(), last_interaction = NOW(), status = $3 WHERE id = $2',
                [req.user.id, ticketId, 'Em Andamento']
            );

            // Audit Log (Optional)
            try {
                await pool.query(
                    'INSERT INTO audit_logs (action, entity_id, user_id, details) VALUES ($1, $2, $3, $4)',
                    ['AUTO_ASSIGN', ticketId, req.user.id, 'Técnico atribuído automaticamente na primeira resposta']
                );
            } catch (auditError) {
                console.warn('Audit log failed (table might be missing):', auditError);
            }
        } else {
            // Just update last_interaction
            await pool.query('UPDATE tickets SET updated_at = NOW(), last_interaction = NOW() WHERE id = $1', [ticketId]);
        }
      } catch (assignError) {
          console.error('Error in auto-assign logic:', assignError);
          // Do not fail the request
      }
      
      res.status(201).json(newMessage.rows[0]);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao adicionar mensagem' });
  }
};
