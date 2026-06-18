import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import fleetController from '../controllers/fleet.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// Vehicle photos: store to a temp dir on disk, then the controller uploads to
// Cloudinary (so images persist across Render redeploys) and deletes the temp file.
const tmpDir = path.join(__dirname, '../../uploads/tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

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

router.post('/vehicles', upload.single('image'), fleetController.createVehicle);
router.put('/vehicles/:id', upload.single('image'), fleetController.updateVehicle);
router.delete('/vehicles/:id', fleetController.deleteVehicle);

export default router;
