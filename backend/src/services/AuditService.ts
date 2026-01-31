import { pool } from '../config/database';

interface LogMessageParams {
    original_message_id?: string;
    source_table: 'ticket_messages' | 'direct_messages' | 'team_messages';
    context_type: 'ticket' | 'direct' | 'team';
    context_id: string; // TicketID, ReceiverID, or TeamID
    sender_id: string;
    recipient_id?: string | null;
    content: string;
    metadata?: any;
    created_at?: Date;
}

interface LogAccessParams {
    user_id: string;
    action: 'SEARCH' | 'VIEW' | 'EXPORT';
    query_details: string;
    ip_address?: string;
}

export class AuditService {
    /**
     * Registra uma mensagem no armazenamento de auditoria imutável
     */
    static async logMessage(params: LogMessageParams) {
        const {
            original_message_id,
            source_table,
            context_type,
            context_id,
            sender_id,
            recipient_id,
            content,
            metadata,
            created_at
        } = params;

        try {
            await pool.query(
                `INSERT INTO message_audit_store 
                (original_message_id, source_table, context_type, context_id, sender_id, recipient_id, content, metadata, message_created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    original_message_id || null,
                    source_table,
                    context_type,
                    context_id,
                    sender_id,
                    recipient_id || null,
                    content,
                    metadata ? JSON.stringify(metadata) : null,
                    created_at || new Date()
                ]
            );
            // console.log(`[Audit] Message logged from ${source_table}`);
        } catch (error) {
            console.error('[Audit] Failed to log message:', error);
            // Em um sistema crítico, poderíamos lançar o erro ou colocar em uma fila de retry
            // Aqui apenas logamos o erro para não bloquear o fluxo principal, mas em auditoria rigorosa, deveria falhar a transação original
        }
    }

    /**
     * Registra o acesso aos logs de auditoria
     */
    static async logAccess(params: LogAccessParams) {
        const { user_id, action, query_details, ip_address } = params;
        
        try {
            await pool.query(
                `INSERT INTO audit_access_logs (user_id, action, query_details, ip_address) 
                 VALUES ($1, $2, $3, $4)`,
                [user_id, action, query_details, ip_address || null]
            );
        } catch (error) {
            console.error('[Audit] Failed to log access:', error);
        }
    }

    /**
     * Busca logs de auditoria (para admin/compliance)
     * Deve ser usado com cautela e sempre gera um log de acesso
     */
    static async searchLogs(adminUserId: string, filters: any, ip?: string) {
        // 1. Log this access attempt first
        await this.logAccess({
            user_id: adminUserId,
            action: 'SEARCH',
            query_details: JSON.stringify(filters),
            ip_address: ip
        });

        // 2. Perform search
        let query = `
            SELECT m.*, s.name as sender_name, r.name as recipient_name 
            FROM message_audit_store m
            LEFT JOIN users s ON m.sender_id = s.id
            LEFT JOIN users r ON m.recipient_id = r.id
            WHERE 1=1
        `;
        const params: any[] = [];
        let pIndex = 1;

        if (filters.startDate) {
            query += ` AND m.message_created_at >= $${pIndex}`;
            params.push(filters.startDate);
            pIndex++;
        }
        if (filters.endDate) {
            query += ` AND m.message_created_at <= $${pIndex}`;
            params.push(filters.endDate);
            pIndex++;
        }
        if (filters.senderId) {
            query += ` AND m.sender_id = $${pIndex}`;
            params.push(filters.senderId);
            pIndex++;
        }
        if (filters.contextType) {
            query += ` AND m.context_type = $${pIndex}`;
            params.push(filters.contextType);
            pIndex++;
        }
        if (filters.content) {
            query += ` AND m.content ILIKE $${pIndex}`;
            params.push(`%${filters.content}%`);
            pIndex++;
        }

        query += ` ORDER BY m.message_created_at DESC LIMIT 1000`; // Limite de segurança

        const result = await pool.query(query, params);
        return result.rows;
    }
}
