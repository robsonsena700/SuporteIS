import { Router } from 'express';
import { getAllUsers, updateUser, deleteUser, createUser, updateUserStatus, pingUser, getUserById, updateUserPassword } from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllUsers); // Removed authorizeRole to allow all auth users to see list for chat
router.get('/:id', getUserById);
router.post('/ping', pingUser);
router.post('/', authorizeRole(['Administrador']), createUser);
router.put('/:id', authorizeRole(['Administrador']), updateUser);
router.put('/:id/password', authorizeRole(['Administrador']), updateUserPassword);
router.delete('/:id', authorizeRole(['Administrador']), deleteUser);
router.put('/:id/status', updateUserStatus);

export default router;