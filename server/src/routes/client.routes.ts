import { Router } from 'express';
import clientController from '../controllers/client.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/', clientController.getAllClients.bind(clientController));
router.get('/active', clientController.getActiveClients.bind(clientController));
router.get('/check-nip/:nip', clientController.checkNipExists.bind(clientController));
router.get('/:id', clientController.getClientById.bind(clientController));

// Write routes — any authenticated user can add/edit/manage clients
router.post('/', clientController.createClient.bind(clientController));
router.put('/:id', clientController.updateClient.bind(clientController));
router.delete('/:id', clientController.deleteClient.bind(clientController));

export default router;
