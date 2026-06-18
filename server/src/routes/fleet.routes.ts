import { Router } from 'express';
import fleetController from '../controllers/fleet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);
// TESTING: whole fleet module is admin-only for now. To open it to all users,
// remove this guard (per-action manager checks already live in the controller).
router.use(requireRole([UserRole.ADMIN]));

router.get('/context', fleetController.getContext);

router.get('/requests', fleetController.listRequests);
router.post('/requests', fleetController.createRequest);
router.post('/requests/:id/assign', fleetController.assign);
router.post('/requests/:id/reject', fleetController.reject);
router.delete('/requests/:id', fleetController.deleteRequest);

router.post('/vehicles', fleetController.createVehicle);
router.delete('/vehicles/:id', fleetController.deleteVehicle);

export default router;
