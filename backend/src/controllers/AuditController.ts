import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/AuditService';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        
        // Strict Access Control: Only Admins can view audit logs
        if (!user || (user.role !== 'Administrador' && user.profile !== 'Administrador')) {
             // Log unauthorized attempt
             await AuditService.logAccess({
                 user_id: user?.id || 'unknown',
                 action: 'SEARCH',
                 query_details: 'UNAUTHORIZED_ATTEMPT',
                 ip_address: req.ip
             });
             return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar logs de auditoria.' });
        }

        const { startDate, endDate, senderId, contextType, content } = req.query;

        const filters = {
            startDate,
            endDate,
            senderId,
            contextType,
            content
        };

        const logs = await AuditService.searchLogs(user.id, filters, req.ip);

        res.json(logs);
    } catch (error) {
        console.error('Audit Log Error:', error);
        res.status(500).json({ message: 'Erro ao buscar logs de auditoria' });
    }
};
