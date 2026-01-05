import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Obtém estatísticas do dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: Período de filtro (today, week, month)
 *     responses:
 *       200:
 *         description: Estatísticas recuperadas
 */
router.get('/', authenticateToken, getDashboardStats);

export default router;
