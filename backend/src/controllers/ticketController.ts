import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

const logTicketHistory = async (
  ticketId: string,
  userId: string | undefined,
  changeType: string,
  oldValue: string | null,
  newValue: string | null,
  details: string | null
) => {
  try {
    await pool.query(
      `INSERT INTO ticket_history (ticket_id, user_id, change_type, old_value, new_value, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ticketId, userId || null, changeType, oldValue, newValue, details]
    );
  } catch (error) {
    console.error('Failed to log ticket history:', error);
  }
};

export const getTicketHistory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Resolve ID if code provided (handle CH- prefix)
    let ticketId = id;
    if (id.startsWith('CH-')) {
       const t = await pool.query('SELECT id FROM tickets WHERE code = $1', [id]);
       if (t.rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });
       ticketId = t.rows[0].id;
    } else {
       // Verify existence if UUID
       const t = await pool.query('SELECT id FROM tickets WHERE id = $1', [id]);
       if (t.rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });
    }

    const result = await pool.query(`
      SELECT h.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role
      FROM ticket_history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE h.ticket_id = $1
      ORDER BY h.created_at DESC
    `, [ticketId]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar histórico' });
  }
};

export const getTickets = async (req: AuthRequest, res: Response) => {
  console.log('GET /tickets called with query:', req.query);
  try {
    const { startDate, endDate, status, priority, search, category } = req.query;

    let queryText = `
      SELECT t.*, 
             tech.name as technician_name, tech.avatar as technician_avatar,
             creator.name as creator_name
      FROM tickets t
      LEFT JOIN users tech ON t.technician_id = tech.id
      LEFT JOIN users creator ON t.user_id = creator.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Role-based filtering
    if (req.user?.role === 'Cliente') {
        queryText += ` AND t.user_id = $${paramIndex}`;
        queryParams.push(req.user.id);
        paramIndex++;
    }

    // Date Range Filtering
    if (startDate) {
        queryText += ` AND t.created_at >= $${paramIndex}`;
        queryParams.push(startDate); // Expecting YYYY-MM-DD or ISO
        paramIndex++;
    }
    if (endDate) {
        queryText += ` AND t.created_at <= $${paramIndex}`;
        // Add time to end date to be inclusive of the day
        queryParams.push(`${endDate} 23:59:59.999`);
        paramIndex++;
    }

    // Status Filtering
    if (status) {
        queryText += ` AND t.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
    }

    // Priority Filtering
    if (priority) {
        queryText += ` AND t.priority = $${paramIndex}`;
        queryParams.push(priority);
        paramIndex++;
    }

    // Search Filter (Subject, Description, ID, Code, Technician, Creator)
    if (search) {
        queryText += ` AND (
            t.subject ILIKE $${paramIndex} OR 
            t.description ILIKE $${paramIndex} OR
            t.id::text ILIKE $${paramIndex} OR
            t.code ILIKE $${paramIndex} OR
            tech.name ILIKE $${paramIndex} OR
            creator.name ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
    }

    // Category Filter (Sistema vs Equipamento)
    if (category && (category === 'Sistema' || category === 'Equipamento')) {
        const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro'];
        const regexPattern = keywords.join('|');
        
        if (category === 'Sistema') {
            queryText += ` AND (COALESCE(t.equipment, '') || ' ' || t.subject) ~* $${paramIndex}`;
            queryParams.push(regexPattern);
            paramIndex++;
        } else if (category === 'Equipamento') {
             queryText += ` AND (COALESCE(t.equipment, '') || ' ' || t.subject) !~* $${paramIndex}`;
            queryParams.push(regexPattern);
            paramIndex++;
        }
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

    // Log History
    await logTicketHistory(newTicket.rows[0].id, req.user?.id, 'CREATE', null, null, 'Chamado criado');

    res.status(201).json(newTicket.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar chamado' });
  }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, priority, technician_id, rating, feedback } = req.body;

  try {
    // Fetch current ticket to validate rules
    const currentTicketRes = await pool.query('SELECT * FROM tickets WHERE id::text = $1 OR code = $1', [id]);
    if (currentTicketRes.rows.length === 0) {
        return res.status(404).json({ message: 'Chamado não encontrado' });
    }
    const currentTicket = currentTicketRes.rows[0];

    // Permission Check: Clients cannot update tickets directly (Except Reopen)
    if (req.user?.role === 'Cliente') {
        // Allow if adding rating (Client is Creator)
        const isRating = currentTicket.status === 'Resolvido' && rating;

        if (!isRating) {
            return res.status(403).json({ message: 'Permissão negada. Apenas Responsável ou Admin podem reabrir chamados.' });
        }
    }

    // Reopening Logic
    if (currentTicket.status === 'Resolvido' && status && status !== 'Resolvido') {
        const resolvedAt = new Date(currentTicket.resolved_at || currentTicket.updated_at);
        const now = new Date();
        const diffHours = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60);
        
        const REOPEN_WINDOW_HOURS = 24; 

        if (diffHours > REOPEN_WINDOW_HOURS) {
            // Log rejected attempt
            await logTicketHistory(currentTicket.id, req.user?.id, 'REOPEN_ATTEMPT', 'Resolvido', status, `Tentativa de reabertura rejeitada (> ${REOPEN_WINDOW_HOURS}h)`);
            return res.status(400).json({ message: 'Este chamado foi resolvido há mais de 24 horas. Por favor, abra um novo chamado.' });
        }
        
        // Log successful reopen
        await logTicketHistory(currentTicket.id, req.user?.id, 'REOPEN', 'Resolvido', status, 'Chamado reaberto');
    }

    // Prepare dynamic update parts
    let additionalUpdates = '';
    if (technician_id) additionalUpdates += ', assigned_at = NOW()';
    if (status === 'Resolvido' && currentTicket.status !== 'Resolvido') {
        additionalUpdates += ', resolved_at = NOW()';
        
        // Notify Creator if resolved by someone else
        if (req.user?.id !== currentTicket.user_id) {
             try {
                 await pool.query(
                     'INSERT INTO notifications (user_id, type, reference_id, content) VALUES ($1, $2, $3, $4)',
                     [currentTicket.user_id, 'status_change', currentTicket.id, 'Seu chamado foi resolvido. Por favor, avalie o atendimento.']
                 );
             } catch (e) { console.warn('Notification failed', e); }
        }
    }

    // Rating Logic: Only Creator can rate
    const canRate = req.user?.id === currentTicket.user_id;
    const ratingToUpdate = canRate ? rating : null;
    const feedbackToUpdate = canRate ? feedback : null;

    const params = [
        status ?? null, 
        priority ?? null, 
        technician_id ?? null, 
        ratingToUpdate ?? null,
        feedbackToUpdate ?? null,
        id
    ];
    
    let query = `
        UPDATE tickets 
        SET 
            status = COALESCE($1, status), 
            priority = COALESCE($2, priority), 
            technician_id = COALESCE($3, technician_id), 
            rating = COALESCE($4, rating),
            feedback = COALESCE($5, feedback),
            updated_at = NOW()
            ${additionalUpdates}
        WHERE id::text = $6 OR code = $6 
        RETURNING *
    `;

    console.log(`[Ticket] Updating ticket ${id}:`, { status, priority, technician_id, rating: ratingToUpdate });

    const updatedTicket = await pool.query(query, params);
    const newTicketData = updatedTicket.rows[0];

    // --- Log History for Changes ---
    
    // Status Change
    if (status && status !== currentTicket.status) {
        await logTicketHistory(newTicketData.id, req.user?.id, 'STATUS', currentTicket.status, status, `Status alterado para ${status}`);
    }

    // Priority Change
    if (priority && priority !== currentTicket.priority) {
        await logTicketHistory(newTicketData.id, req.user?.id, 'PRIORITY', currentTicket.priority, priority, `Prioridade alterada para ${priority}`);
    }

    // Technician Assignment
    if (technician_id && technician_id !== currentTicket.technician_id) {
        // Fetch tech name for better details
        let techName = technician_id;
        try {
            const techRes = await pool.query('SELECT name FROM users WHERE id = $1', [technician_id]);
            if (techRes.rows.length > 0) techName = techRes.rows[0].name;
        } catch (e) {}
        
        await logTicketHistory(newTicketData.id, req.user?.id, 'ASSIGNMENT', currentTicket.technician_id, technician_id, `Atribuído a ${techName}`);
    }

    // Rating
    if (ratingToUpdate && (!currentTicket.rating || ratingToUpdate !== currentTicket.rating)) {
        await logTicketHistory(newTicketData.id, req.user?.id, 'RATING', currentTicket.rating ? String(currentTicket.rating) : null, String(ratingToUpdate), `Avaliação: ${ratingToUpdate} estrelas`);
        // Keep audit log for backward compatibility if needed, or just rely on history.
        // The previous code had audit log, we can keep it or replace it. I'll replace it with history as it serves the same purpose but better.
    }
    
    // Feedback
    if (feedbackToUpdate && (!currentTicket.feedback || feedbackToUpdate !== currentTicket.feedback)) {
         await logTicketHistory(newTicketData.id, req.user?.id, 'FEEDBACK', currentTicket.feedback, feedbackToUpdate, 'Feedback de avaliação atualizado');
    }

    res.json(newTicketData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar chamado' });
  }
};

export const addMessage = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // Ticket ID or Code
  const { content, is_internal, attachment } = req.body;
  
  try {
      // Resolve ID if code provided
      let ticketId = id;
      let ticketResult;
      
      if (id.startsWith('CH-')) {
          ticketResult = await pool.query('SELECT id, technician_id, user_id, code, status FROM tickets WHERE code = $1', [id]);
      } else {
          ticketResult = await pool.query('SELECT id, technician_id, user_id, code, status FROM tickets WHERE id = $1', [id]);
      }

      if (ticketResult.rows.length === 0) return res.status(404).json({message: 'Ticket not found'});
      
      const ticketStatus = ticketResult.rows[0].status;
      if (req.user?.role === 'Cliente' && ticketStatus === 'Resolvido') {
          return res.status(403).json({ message: 'Apenas o Responsável pelo atendimento ou Administrador podem realizar esta função!' });
      }

      ticketId = ticketResult.rows[0].id;
      const currentTechnicianId = ticketResult.rows[0].technician_id;
      const ticketOwnerId = ticketResult.rows[0].user_id;
      const ticketCode = ticketResult.rows[0].code || 'CH-???';

      // Insert Message
      const newMessage = await pool.query(
          'INSERT INTO messages (ticket_id, sender_id, content, is_internal, attachment) VALUES ($1, $2, $3, $4, $5) RETURNING *, (SELECT name FROM users WHERE id = $2) as sender_name',
          [ticketId, req.user?.id, content, is_internal || false, attachment || null]
      );

      // Log History
      await logTicketHistory(ticketId, req.user?.id, 'MESSAGE', null, content, 'Nova mensagem adicionada');

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
