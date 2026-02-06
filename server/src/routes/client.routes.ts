import { Router } from 'express';
import clientController from '../controllers/client.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/', clientController.getAllClients.bind(clientController));
router.get('/active', clientController.getActiveClients.bind(clientController));
router.get('/check-nip/:nip', clientController.checkNipExists.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));

// Write routes (ADMIN, KSIEGOWOSC only)
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  clientController.createClient.bind(clientController)
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  clientController.updateClient.bind(clientController)
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  clientController.deleteClient.bind(clientController)
);

export default router;
