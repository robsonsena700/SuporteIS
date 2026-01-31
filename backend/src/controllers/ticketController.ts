import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/AuditService';

// Helper for access control on ratings
const canViewRating = (user: any) => {
    if (!user) return false;
    const profile = user.profile || user.role || '';
    return profile === 'Cliente' || profile === 'Administrador' || 
           user.role === 'Cliente' || user.role === 'Administrador';
};

// Helper to log unauthorized access attempts
const logUnauthorizedAccess = async (userId: string | undefined, action: string, details: string, entityId: string) => {
    try {
        await pool.query(
            `INSERT INTO audit_logs (action, entity_id, user_id, details) VALUES ($1, $2, $3, $4)`,
            ['UNAUTHORIZED_ACCESS', entityId, userId || null, `${action}: ${details}`]
        );
    } catch (e) {
        console.error('Failed to log unauthorized access', e);
    }
};

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
export const getNextCode = async (prefix: string) => {
    // New format requested: PREFIX-0000000001 (10 digits padding)
    // Previous format was: PREFIX-YYXXXX (Year + 4 digits)
    // To reset count and use new format, we filter by the new pattern length (14 chars)
    // This allows keeping old tickets while starting new sequence from 1
    
    const res = await pool.query(
        `SELECT code FROM tickets 
         WHERE code LIKE $1 
         AND LENGTH(code) = 14 
         ORDER BY code DESC LIMIT 1`,
        [`${prefix}-%`]
    );
    
    let sequence = 1;
    if (res.rows.length > 0) {
        const lastCode = res.rows[0].code;
        const parts = lastCode.split('-');
        if (parts.length === 2) {
            const seqStr = parts[1];
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq)) sequence = seq + 1;
        }
    }
    
    return `${prefix}-${String(sequence).padStart(10, '0')}`;
};

export const getTicketHistory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    let ticketId = id;
    let ticketRow: any;

    if (id.includes('-') && !id.match(/^[0-9a-fA-F-]{36}$/)) { // Simple UUID check
       const t = await pool.query('SELECT id, user_id FROM tickets WHERE code = $1', [id]);
       if (t.rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });
       ticketRow = t.rows[0];
       ticketId = ticketRow.id;
    } else {
       const t = await pool.query('SELECT id, user_id FROM tickets WHERE id = $1', [id]);
       if (t.rows.length === 0) return res.status(404).json({ message: 'Ticket not found' });
       ticketRow = t.rows[0];
       ticketId = ticketRow.id;
    }

    const user = req.user;
    const isClient = user && (user.role === 'Cliente' || user.profile === 'Cliente');

    if (isClient && ticketRow.user_id !== user.id) {
      return res.status(403).json({ message: 'Acesso não autorizado' });
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
    const { startDate, endDate, status, priority, search, category, myTickets } = req.query as any;

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

    const user = req.user;

    if (user) {
        const isClient = user.role === 'Cliente' || user.profile === 'Cliente';

        if (isClient) {
            queryText += ` AND t.user_id = $${paramIndex}`;
            queryParams.push(user.id);
            paramIndex++;
        } else if (myTickets === 'true') {
            const isSupport = user.profile === 'Suporte Técnico'
                || user.role === 'Suporte Técnico'
                || user.role === 'Técnico'
                || (typeof user.profile === 'string' && user.profile.includes('Suporte'))
                || (typeof user.role === 'string' && user.role.includes('Suporte'))
                || user.profile === 'Líder'
                || user.role === 'Líder';

            const isAdmin = user.role === 'Administrador' || user.profile === 'Administrador';

            if (isSupport || isAdmin) {
                queryText += ` AND (t.technician_id = $${paramIndex} OR t.user_id = $${paramIndex})`;
                queryParams.push(user.id);
                paramIndex++;
            }
        }
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

    // Category Filter (Sistema/Serviço vs Equipamento)
    if (category && (category === 'Sistema' || category === 'Serviço' || category === 'Equipamento')) {
        const keywords = ['sistema', 'software', 'site', 'app', 'aplicativo', 'erp', 'banco', 'email', 'outlook', 'office', 'windows', 'linux', 'internet', 'rede', 'vpn', 'bug', 'erro', 'serviço', 'suporte'];
        const regexPattern = keywords.join('|');
        
        if (category === 'Sistema' || category === 'Serviço') {
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
    
    // Sanitize results for ratings
    const tickets = result.rows.map(ticket => {
        if (!canViewRating(user)) {
            ticket.rating = null;
            ticket.feedback = null;
        }
        return ticket;
    });

    res.json(tickets);
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

    const user = req.user;
    const isClient = user && (user.role === 'Cliente' || user.profile === 'Cliente');

    if (isClient && ticket.user_id !== user.id) {
      await logUnauthorizedAccess(user.id, 'VIEW_TICKET', 'Tentativa de acessar chamado de outro usuário', ticket.id);
      return res.status(403).json({ message: 'Acesso não autorizado' });
    }

    // Strict Access Control for Ratings
    if (!canViewRating(user)) {
        ticket.rating = null;
        ticket.feedback = null;
    }

    const messagesResult = await pool.query(`
      SELECT m.*, u.name as sender_name, u.avatar as sender_avatar 
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = $1
      ORDER BY m.created_at ASC
    `, [ticket.id]);

    const canSeeInternalMessages = user && (
      user.profile === 'Administrador' ||
      user.profile === 'Suporte Técnico' ||
      user.profile === 'Líder' ||
      user.role === 'Administrador' ||
      user.role === 'Técnico' ||
      user.role === 'Líder' ||
      (typeof user.profile === 'string' && user.profile.includes('Suporte')) ||
      (typeof user.role === 'string' && user.role.includes('Suporte'))
    );

    const allMessages = messagesResult.rows;
    const visibleMessages = canSeeInternalMessages
      ? allMessages
      : allMessages.filter((m: any) => !m.is_internal);

    ticket.messages = visibleMessages;

    res.json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do chamado' });
  }
};

export const createTicket = async (req: AuthRequest, res: Response) => {
  const { subject, description, equipment, client_name, priority, status, attachment, equipmentDetails, unit, municipality, uf } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, name, role, profile, company, uf, municipality FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const currentUser = userResult.rows[0];
    const isClientProfile = currentUser.profile === 'Cliente' || currentUser.role === 'Cliente';

    const effectiveClientName = isClientProfile ? (currentUser.name || client_name) : client_name;
    const effectiveUnit = isClientProfile ? (currentUser.company || unit) : unit;
    const effectiveMunicipality = isClientProfile ? (currentUser.municipality || municipality) : municipality;
    const effectiveUf = isClientProfile ? (currentUser.uf || uf) : uf;

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
          `INSERT INTO tickets (code, subject, equipment, description, priority, attachment, user_id, client_name, status, unit, municipality, uf)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [code, subject, equipment, description, priority, attachment, userId, effectiveClientName, status || 'Aberto', effectiveUnit, effectiveMunicipality, effectiveUf]
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
             const msgResult = await client.query(
                'INSERT INTO messages (ticket_id, sender_id, content, is_internal) VALUES ($1, $2, $3, $4) RETURNING *',
                [ticket.id, userId, description, false]
            );

             // Audit Log Initial Message
             await AuditService.logMessage({
                original_message_id: msgResult.rows[0].id,
                source_table: 'ticket_messages',
                context_type: 'ticket',
                context_id: ticket.id,
                sender_id: userId as string,
                content: description,
                metadata: { ip: req.ip, user_agent: req.headers['user-agent'], is_initial: true },
                created_at: msgResult.rows[0].created_at
            });
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
    let historyLogs: Promise<any>[] = [];

    if ((req.user?.role === 'Cliente' || req.user?.profile === 'Cliente') && currentTicket.user_id !== userId) {
        return res.status(403).json({ message: 'Permissão negada. Apenas o solicitante do chamado pode avaliar ou reabrir este chamado.' });
    }

    if (req.user?.role === 'Cliente') {
        const isRating = currentTicket.status === 'Resolvido' && rating;
        const isReopen = currentTicket.status === 'Resolvido' && status && status !== 'Resolvido';
        const isResolveAndRate = status === 'Resolvido' && rating;

        if (!isRating && !isReopen && !isResolveAndRate) {
            return res.status(403).json({ message: 'Permissão negada. Apenas Responsável ou Admin podem modificar chamados.' });
        }
    }

    if (rating !== undefined) {
        // Access Control: Rating Permission
        // Only Administrators and Clients are allowed to rate tickets.
        // Support staff and other profiles are strictly prohibited.
        const canRate = (req.user?.profile === 'Administrador' || req.user?.role === 'Administrador') || 
                        (req.user?.profile === 'Cliente' || req.user?.role === 'Cliente');
        
        if (!canRate) {
             await logUnauthorizedAccess(userId, 'RATE_TICKET', 'Tentativa de avaliar chamado sem permissão', currentTicket.id);
             return res.status(403).json({ message: 'Permissão negada. Apenas Administradores e Clientes podem avaliar chamados.' });
        }

        const ratingNum = Number(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ message: 'Avaliação deve ser um número entre 1 e 5.' });
        }
        if (ratingNum <= 2) {
            const feedbackText = (feedback ?? currentTicket.feedback ?? '').trim();
            if (!feedbackText) {
                return res.status(400).json({ message: 'Por favor, informe o motivo da insatisfação ao registrar uma avaliação baixa.' });
            }
        }
    }

    if (currentTicket.status === 'Resolvido' && status && status !== 'Resolvido' && status !== 'Cancelado') {
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

    // Handle Cancellation
    if (status === 'Cancelado') {
         if (currentTicket.status === 'Cancelado') {
             return res.status(400).json({ message: 'Este chamado já está cancelado.' });
         }
         // Allow cancellation if not resolved (or re-thinking logic: maybe allow even if resolved? usually only open tickets)
         // Requirement: "cancelamento de chamados abertos"
         if (currentTicket.status === 'Resolvido' || currentTicket.status === 'Concluído') {
             return res.status(400).json({ message: 'Não é possível cancelar um chamado já resolvido.' });
         }

         historyLogs.push(logTicketHistory(pool, currentTicket.id, userId, 'STATUS', currentTicket.status, 'Cancelado', 'Chamado cancelado pelo usuário'));
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
    
    if (status && status !== currentTicket.status) {
      updateQuery += `, status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
      
      if (status === 'Em Andamento' && !currentTicket.assigned_at) {
          updateQuery += `, assigned_at = NOW()`;
      }
      if (status === 'Resolvido' && !currentTicket.resolved_at) {
          updateQuery += `, resolved_at = NOW()`;
          
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

export const changeTicketType = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const userProfile = req.user?.profile;
    const userRole = req.user?.role;

    if (!userId) return res.status(401).json({ message: 'Não autorizado' });

    // Validate permission (Suporte, Líder, Administrador)
    const allowedProfiles = ['Administrador', 'Suporte Técnico', 'Líder', 'Suporte'];
    const isAllowed = allowedProfiles.some(p => 
        (userProfile && userProfile.includes(p)) || (userRole && userRole.includes(p))
    );

    if (!isAllowed) {
        return res.status(403).json({ message: 'Permissão negada. Apenas Suporte, Líder ou Administrador podem alterar o tipo do chamado.' });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get current ticket
            const tRes = await client.query('SELECT * FROM tickets WHERE id = $1', [id]);
            if (tRes.rows.length === 0) {
                 await client.query('ROLLBACK');
                 return res.status(404).json({ message: 'Chamado não encontrado' });
            }
            const ticket = tRes.rows[0];

            // Validate Open status
            if (ticket.status !== 'Aberto') {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Apenas chamados com status "Aberto" podem ter o tipo alterado.' });
            }

            // Check if already EQP
            if (ticket.code && ticket.code.startsWith('EQP-')) {
                 await client.query('ROLLBACK');
                 return res.status(400).json({ message: 'Este chamado já é do tipo Equipamento.' });
            }

            // Generate new code (EQP)
            // Logic duplicated from getNextCode but using transaction client
            const prefix = 'EQP';
            const resCode = await client.query(
                `SELECT code FROM tickets 
                 WHERE code LIKE $1 
                 AND LENGTH(code) = 14 
                 ORDER BY code DESC LIMIT 1`,
                [`${prefix}-%`]
            );
            
            let sequence = 1;
            if (resCode.rows.length > 0) {
                const lastCode = resCode.rows[0].code;
                const parts = lastCode.split('-');
                if (parts.length === 2) {
                    const seqStr = parts[1];
                    const seq = parseInt(seqStr, 10);
                    if (!isNaN(seq)) sequence = seq + 1;
                }
            }
            
            const newCode = `${prefix}-${String(sequence).padStart(10, '0')}`;

            // Update ticket
            await client.query('UPDATE tickets SET code = $1 WHERE id = $2', [newCode, id]);

            // Log history
            await logTicketHistory(client, id, userId, 'TYPE_CHANGE', ticket.code, newCode, 'Tipo de chamado alterado de Sistema (SUP) para Equipamento (EQP)');

            await client.query('COMMIT');
            
            // Return updated ticket
            const updatedRes = await client.query(`
                SELECT t.*, 
                       tech.name as technician_name, tech.avatar as technician_avatar,
                       creator.name as creator_name,
                       td.model, td.serial_number, td.warranty_info
                FROM tickets t
                LEFT JOIN users tech ON t.technician_id = tech.id
                LEFT JOIN users creator ON t.user_id = creator.id
                LEFT JOIN ticket_details td ON t.id = td.ticket_id
                WHERE t.id = $1
            `, [id]);
            
            res.json(updatedRes.rows[0]);

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Change Ticket Type Error:', error);
        res.status(500).json({ message: 'Erro ao alterar tipo do chamado' });
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
      
      const row = ticketResult.rows[0];
      const currentUser = req.user;

      if (currentUser && (currentUser.role === 'Cliente' || currentUser.profile === 'Cliente') && row.user_id !== currentUser.id) {
          return res.status(403).json({ message: 'Acesso não autorizado' });
      }

      const ticketStatus = row.status;
      if (currentUser?.role === 'Cliente' && ticketStatus === 'Resolvido') {
          return res.status(403).json({ message: 'Apenas o Responsável pelo atendimento ou Administrador podem realizar esta função!' });
      }

      ticketId = row.id;
      const currentTechnicianId = row.technician_id;
      const ticketOwnerId = row.user_id;

      // Insert Message
      const newMessage = await pool.query(
          'INSERT INTO messages (ticket_id, sender_id, content, is_internal, attachment) VALUES ($1, $2, $3, $4, $5) RETURNING *, (SELECT name FROM users WHERE id = $2) as sender_name, (SELECT avatar FROM users WHERE id = $2) as sender_avatar',
          [ticketId, req.user?.id, content, is_internal || false, attachment || null]
      );

      // Audit Log
      await AuditService.logMessage({
          original_message_id: newMessage.rows[0].id,
          source_table: 'ticket_messages',
          context_type: 'ticket',
          context_id: ticketId,
          sender_id: req.user?.id as string,
          content: content,
          metadata: { ip: req.ip, user_agent: req.headers['user-agent'], is_internal },
          created_at: newMessage.rows[0].created_at
      });

      // Log History
      await logTicketHistory(pool, ticketId, req.user?.id, 'MESSAGE', null, content, 'Nova mensagem adicionada');

      // Notification Logic (Non-blocking)
      try {
        const senderId = req.user?.id;
        if (senderId && !is_internal) {
            const senderRes = await pool.query('SELECT name FROM users WHERE id = $1', [senderId]);
            const senderName = senderRes.rows[0]?.name || 'Usuário';
            
            const messagePayload = JSON.stringify({
                ...newMessage.rows[0],
                sender_name: senderName,
                context_type: 'ticket'
            });

            if (senderId === ticketOwnerId) {
                if (currentTechnicianId) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, type, reference_id, content, message_data) VALUES ($1, $2, $3, $4, $5)',
                        [currentTechnicianId, 'new_message', ticketId, `Nova mensagem de ${senderName}`, messagePayload]
                    );
                } else {
                    // Notify all Admins if ticket is unassigned
                    const admins = await pool.query("SELECT id FROM users WHERE role = 'Administrador' OR profile = 'Administrador'");
                    for (const admin of admins.rows) {
                         // Avoid duplicate notifications if admin is also the sender (unlikely here but good practice)
                         if (admin.id !== senderId) {
                            await pool.query(
                                'INSERT INTO notifications (user_id, type, reference_id, content, message_data) VALUES ($1, $2, $3, $4, $5)',
                                [admin.id, 'new_message', ticketId, `Nova mensagem de ${senderName} em chamado não atribuído`, messagePayload]
                            );
                         }
                    }
                }
            } else {
                if (ticketOwnerId) {
                    await pool.query(
                        'INSERT INTO notifications (user_id, type, reference_id, content, message_data) VALUES ($1, $2, $3, $4, $5)',
                        [ticketOwnerId, 'new_message', ticketId, `Nova mensagem de ${senderName}`, messagePayload]
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
