import { Router } from 'express';
import { getTickets, createTicket, updateTicket, getTicketById, addMessage, getTicketHistory } from '../controllers/ticketController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Lista todos os chamados
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de chamados
 */
router.get('/', authenticateToken, getTickets);

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Obtém detalhes de um chamado
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalhes do chamado
 */
router.get('/:id', authenticateToken, getTicketById);

/**
 * @swagger
 * /api/tickets/{id}/history:
 *   get:
 *     summary: Obtém histórico de alterações do chamado
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Histórico do chamado
 */
router.get('/:id/history', authenticateToken, getTicketHistory);

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Cria um novo chamado
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - description
 *               - equipment
 *               - client_name
 *               - priority
 *             properties:
 *               subject:
 *                 type: string
 *               description:
 *                 type: string
 *               equipment:
 *                 type: string
 *               client_name:
 *                 type: string
 *               priority:
 *                 type: string
 *     responses:
 *       201:
 *         description: Chamado criado
 */
router.post('/', authenticateToken, createTicket);

/**
 * @swagger
 * /api/tickets/{id}/messages:
 *   post:
 *     summary: Adiciona uma mensagem ao chamado
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               is_internal:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Mensagem adicionada
 */
router.post('/:id/messages', authenticateToken, addMessage);

/**
 * @swagger
 * /api/tickets/{id}:
 *   put:
 *     summary: Atualiza um chamado
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               technician_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chamado atualizado
 */
router.put('/:id', authenticateToken, updateTicket);

export default router;
