import { Router } from 'express';
import { sendMessage, getMessages } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', sendMessage);
router.get('/:otherUserId', getMessages);

export default router;
