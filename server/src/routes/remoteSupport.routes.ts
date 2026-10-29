import { Router } from 'express';
import remoteSupportController from '../controllers/remoteSupport.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Who am I? (lets the frontend show the IT view or the employee view)
router.get('/context', remoteSupportController.getContext);

// Devices registry (IT only, gated in the controller)
router.get('/devices', remoteSupportController.listDevices);
router.post('/devices', remoteSupportController.createDevice);
router.put('/devices/:id', remoteSupportController.updateDevice);
router.delete('/devices/:id', remoteSupportController.deleteDevice);

// Sessions
router.get('/sessions', remoteSupportController.listSessions); // IT: all
router.get('/sessions/mine', remoteSupportController.mySessions); // employee: own
router.post('/sessions/request', remoteSupportController.requestHelp); // employee
router.post('/sessions', remoteSupportController.startSession); // IT: start directly
router.post('/sessions/:id/accept', remoteSupportController.acceptSession); // IT
router.post('/sessions/:id/close', remoteSupportController.closeSession); // IT
router.post('/sessions/:id/cancel', remoteSupportController.cancelSession); // requester/IT

export default router;
