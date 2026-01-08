import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';

// Helper to log ticket history
const logTicketHistory = async (
  dbClient: any,
  ticketId: string,
  userId: string | undefined,
  changeType: string,
  oldValue: string | null,
  newValue: string | null,
  details: string | null
) => {
  try {
    await dbClient.query(
      `INSERT INTO ticket_history (ticket_id, user_id, change_type, old_value, new_value, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ticketId, userId || null, changeType, oldValue, newValue, details]
    );
  } catch (error) {
    console.error('Failed to log ticket history:', error);
  }
};

// Helper to generate next code
const getNextCode = async (prefix: string) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const pattern = `${prefix}-${year}%`;
    
    // Order by created_at desc to find the last one created
    const res = await pool.query(
        `SELECT code FROM tickets WHERE code LIKE $1 ORDER BY created_at DESC LIMIT 1`,
        [pattern]
    );
    
    let sequence = 1;
    if (res.rows.length > 0) {
        const lastCode = res.rows[0].code; // e.g., SUP-260005
        const parts = lastCode.split('-');
        if (parts.length === 2) {
            const numPart = parts[1]; // 260005
            if (numPart.startsWith(year)) {
                const seqStr = numPart.substring(2);
                const seq = parseInt(seqStr, 10);
                if (!isNaN(seq)) sequence = seq + 1;
            }
        }
    }
    
    return `${prefix}-${year}${String(sequence).padStart(4, '0')}`;
};

export const getTicketHistory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // Resolve ID if code provided (handle CH- prefix or new prefixes)
    let ticketId = id;
    if (id.includes('-') && !id.match(/^[0-9a-fA-F-]{36}$/)) { // Simple UUID check
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
  // console.log('GET /tickets called with query:', req.query);
  try {
    const { startDate, endDate, status, priority, search, category } = req.query;

    let queryText = `
      SELECT t.*, 
             tech.name as technician_name, tech.avatar as technician_avatar,
             creator.name as creator_name,
             td.model, td.serial_number, td.warranty_info
      FROM tickets t
      LEFT JOIN users tech ON t.technician_id = tech.id
      LEFT JOIN users creator ON t.user_id = creator.id
      LEFT JOIN ticket_details td ON t.id = td.ticket_id
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

    // Search Filter (Subject, Description, ID, Code, Technician, Creator, Equipment, Serial)
    if (search) {
        queryText += ` AND (
            t.subject ILIKE $${paramIndex} OR 
            t.description ILIKE $${paramIndex} OR
            t.id::text ILIKE $${paramIndex} OR
            t.code ILIKE $${paramIndex} OR
            tech.name ILIKE $${paramIndex} OR
            creator.name ILIKE $${paramIndex} OR
            td.serial_number ILIKE $${paramIndex}
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
    console.error('Get Tickets Error:', error);
    res.status(500).json({ message: 'Erro ao buscar chamados' });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ticketResult = await pool.query(`
      SELECT t.*, 
             tech.name as technician_name, tech.avatar as technician_avatar,
             creator.name as creator_name,
             td.model, td.serial_number, td.warranty_info
      FROM tickets t
      LEFT JOIN users tech ON t.technician_id = tech.id
      LEFT JOIN users creator ON t.user_id = creator.id
      LEFT JOIN ticket_details td ON t.id = td.ticket_id
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
  const { subject, description, equipment, client_name, priority, status, attachment, equipmentDetails } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  try {
    // Determine prefix
    const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro'];
    const isSystem = keywords.some(k => (equipment || '').toLowerCase().includes(k) || (subject || '').toLowerCase().includes(k));
    const prefix = isSystem ? 'SUP' : 'EQP';
    
    console.log(`Generating code for ticket. Subject: "${subject}", Equipment: "${equipment}". Detected Prefix: ${prefix}`);

    const code = await getNextCode(prefix);

    // Start transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
          `INSERT INTO tickets (code, subject, equipment, description, priority, attachment, user_id, client_name, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [code, subject, equipment, description, priority, attachment, userId, client_name, status || 'Aberto']
        );
        
        const ticket = result.rows[0];

        // Insert details if provided or basic equipment info
        if (equipment || equipmentDetails) {
            await client.query(
                `INSERT INTO ticket_details (ticket_id, model, serial_number, warranty_info)
                 VALUES ($1, $2, $3, $4)`,
                [
                    ticket.id, 
                    equipmentDetails?.model || equipment, 
                    equipmentDetails?.serialNumber || null, 
                    equipmentDetails?.warranty || null
                ]
            );
        }

        // Create initial message if description is provided
        if (description) {
             await client.query(
                'INSERT INTO messages (ticket_id, sender_id, content, is_internal) VALUES ($1, $2, $3, $4)',
                [ticket.id, userId, description, false]
            );
        }

        // Log creation
        await logTicketHistory(client, ticket.id, userId, 'CREATE', null, 'Aberto', 'Chamado criado');

        await client.query('COMMIT');
        
        // Return full ticket with mixed details
        const fullTicket = {
            ...ticket,
            model: equipmentDetails?.model || equipment,
            serial_number: equipmentDetails?.serialNumber || null,
            warranty_info: equipmentDetails?.warranty || null
        };
        
        res.status(201).json(fullTicket);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('Create Ticket Error:', error);
    res.status(500).json({ message: 'Erro ao criar chamado' });
  }
};

export const updateTicket = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, priority, technician_id, rating, feedback, equipment, serial_number, description } = req.body;
  const userId = req.user?.id;

  try {
    // Get current ticket
    const currentRes = await pool.query(`
        SELECT t.*, td.serial_number 
        FROM tickets t 
        LEFT JOIN ticket_details td ON t.id = td.ticket_id 
        WHERE t.id::text = $1 OR t.code = $1`, [id]);
        
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ message: 'Chamado não encontrado' });
    }
    const currentTicket = currentRes.rows[0];

    // Permission Check: Clients cannot update tickets directly (Except Reopen/Rating)
    if (req.user?.role === 'Cliente') {
        const isRating = currentTicket.status === 'Resolvido' && rating;
        const isReopen = currentTicket.status === 'Resolvido' && status && status !== 'Resolvido';

        if (!isRating && !isReopen) {
            return res.status(403).json({ message: 'Permissão negada. Apenas Responsável ou Admin podem modificar chamados.' });
        }
    }

    // Reopening Logic
    if (currentTicket.status === 'Resolvido' && status && status !== 'Resolvido') {
        const resolvedAt = new Date(currentTicket.resolved_at || currentTicket.updated_at);
        const now = new Date();
        const diffHours = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60);
        const REOPEN_WINDOW_HOURS = 24; 

        if (diffHours > REOPEN_WINDOW_HOURS) {
            await logTicketHistory(pool, currentTicket.id, userId, 'REOPEN_ATTEMPT', 'Resolvido', status, `Tentativa de reabertura rejeitada (> ${REOPEN_WINDOW_HOURS}h)`);
            return res.status(400).json({ message: 'Este chamado foi resolvido há mais de 24 horas. Por favor, abra um novo chamado.' });
        }
        await logTicketHistory(pool, currentTicket.id, userId, 'REOPEN', 'Resolvido', status, 'Chamado reaberto');
    }

    // Validate Technician on Resolve/Complete
    if ((status === 'Resolvido' || status === 'Concluído') && status !== currentTicket.status) {
        const nextTechId = technician_id !== undefined ? technician_id : currentTicket.technician_id;
        if (!nextTechId) {
             return res.status(400).json({ message: 'Não é possível encerrar o chamado sem um Responsável Técnico definido.' });
        }
    }

    // Build update query
    let updateQuery = 'UPDATE tickets SET updated_at = NOW()';
    const params = [currentTicket.id]; // Use ID for update
    let paramIndex = 2;
    let historyLogs: Promise<any>[] = [];

    if (status && status !== currentTicket.status) {
      updateQuery += `, status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
      
      if (status === 'Em Andamento' && !currentTicket.assigned_at) {
          updateQuery += `, assigned_at = NOW()`;
      }
      if (status === 'Resolvido' && !currentTicket.resolved_at) {
          updateQuery += `, resolved_at = NOW()`;
          
          // Notify Creator
          if (userId !== currentTicket.user_id) {
             try {
                 await pool.query(
                     'INSERT INTO notifications (user_id, type, reference_id, content) VALUES ($1, $2, $3, $4)',
                     [currentTicket.user_id, 'status_change', currentTicket.id, 'Seu chamado foi resolvido. Por favor, avalie o atendimento.']
                 );
             } catch (e) { console.warn('Notification failed', e); }
          }
      }
      
      historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'STATUS', currentTicket.status, status, `Status alterado para ${status}`));
    }

    if (priority && priority !== currentTicket.priority) {
      updateQuery += `, priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
      historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'PRIORITY', currentTicket.priority, priority, `Prioridade alterada para ${priority}`));
    }

    if (technician_id && technician_id !== currentTicket.technician_id) {
      updateQuery += `, technician_id = $${paramIndex}`;
      if (!currentTicket.assigned_at) {
          updateQuery += `, assigned_at = NOW()`;
      }
      params.push(technician_id);
      paramIndex++;
      
      historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'ASSIGNMENT', currentTicket.technician_id, technician_id, `Atribuído a novo técnico`));
    }
    
    if (equipment && equipment !== currentTicket.equipment) {
        updateQuery += `, equipment = $${paramIndex}`;
        params.push(equipment);
        paramIndex++;
        historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'EQUIPMENT', currentTicket.equipment, equipment, `Equipamento alterado`));
    }

    if (rating !== undefined) {
       updateQuery += `, rating = $${paramIndex}`;
       params.push(rating);
       paramIndex++;
       historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'RATING', currentTicket.rating ? String(currentTicket.rating) : null, String(rating), `Avaliação: ${rating} estrelas`));
    }
    if (feedback !== undefined) {
       updateQuery += `, feedback = $${paramIndex}`;
       params.push(feedback);
       paramIndex++;
       historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'FEEDBACK', currentTicket.feedback, feedback, 'Feedback atualizado'));
    }

    // Execute Ticket Update
    if (params.length > 1) { 
        updateQuery += ` WHERE id = $1 RETURNING *`;
        await pool.query(updateQuery, params);
    }
    
    // Update Ticket Details (Serial Number & Model)
    if (serial_number !== undefined || equipment !== undefined) {
        const newSerial = serial_number !== undefined ? serial_number : currentTicket.serial_number;
        const newModel = equipment !== undefined ? equipment : (currentTicket.model || currentTicket.equipment);

        if (newSerial !== currentTicket.serial_number || newModel !== currentTicket.model) {
            // Upsert ticket_details
            await pool.query(`
                INSERT INTO ticket_details (ticket_id, serial_number, model)
                VALUES ($1, $2, $3)
                ON CONFLICT (ticket_id) 
                DO UPDATE SET serial_number = EXCLUDED.serial_number, model = EXCLUDED.model
            `, [currentTicket.id, newSerial, newModel]);
            
            if (serial_number !== undefined && serial_number !== currentTicket.serial_number) {
                historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'SERIAL_NUMBER', currentTicket.serial_number, serial_number, 'Serial Number / Tombamento atualizado'));
            }
        }
    }

    await Promise.all(historyLogs);

    // Fetch updated ticket to return
    const result = await pool.query(`
      SELECT t.*, 
             tech.name as technician_name, tech.avatar as technician_avatar,
             creator.name as creator_name,
             td.model, td.serial_number, td.warranty_info
      FROM tickets t
      LEFT JOIN users tech ON t.technician_id = tech.id
      LEFT JOIN users creator ON t.user_id = creator.id
      LEFT JOIN ticket_details td ON t.id = td.ticket_id
      WHERE t.id = $1
    `, [currentTicket.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update Ticket Error:', error);
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
      
      if (id.startsWith('CH-') || id.startsWith('SUP-') || id.startsWith('EQP-')) { // Updated prefix check
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

      // Insert Message
      const newMessage = await pool.query(
          'INSERT INTO messages (ticket_id, sender_id, content, is_internal, attachment) VALUES ($1, $2, $3, $4, $5) RETURNING *, (SELECT name FROM users WHERE id = $2) as sender_name',
          [ticketId, req.user?.id, content, is_internal || false, attachment || null]
      );

      // Log History
      await logTicketHistory(pool, ticketId, req.user?.id, 'MESSAGE', null, content, 'Nova mensagem adicionada');

      // Notification Logic (Non-blocking)
      try {
        const senderId = req.user?.id;
        if (senderId && !is_internal) {
            const senderRes = await pool.query('SELECT name FROM users WHERE id = $1', [senderId]);
            const senderName = senderRes.rows[0]?.name || 'Usuário';

            if (senderId === ticketOwnerId) {
                if (currentTechnicianId) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, type, reference_id, content) VALUES ($1, $2, $3, $4)',
                        [currentTechnicianId, 'new_message', ticketId, `Nova mensagem de ${senderName}`]
                    );
                }
            } else {
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
      }

      // Auto-assign Logic
      try {
        if (
            (currentTechnicianId === null || currentTechnicianId === undefined) && 
            req.user && 
            (req.user.role === 'Técnico' || req.user.role === 'Administrador')
        ) {
            await pool.query(
                'UPDATE tickets SET technician_id = $1, assigned_at = NOW(), updated_at = NOW(), last_interaction = NOW(), status = $3 WHERE id = $2',
                [req.user.id, ticketId, 'Em Andamento']
            );
        } else {
            await pool.query('UPDATE tickets SET updated_at = NOW(), last_interaction = NOW() WHERE id = $1', [ticketId]);
        }
      } catch (assignError) {
          console.error('Error in auto-assign logic:', assignError);
      }
      
      res.status(201).json(newMessage.rows[0]);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao adicionar mensagem' });
  }
};
