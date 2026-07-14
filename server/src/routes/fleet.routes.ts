import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import fleetController from '../controllers/fleet.controller';
import { authenticate } from '../middleware/auth.middleware';

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

// Available to all authenticated users. Management actions (assign/reject,
// vehicle CRUD) are gated per-action in the controller via canManage.
router.use(authenticate);

router.get('/context', fleetController.getContext);

router.get('/requests', fleetController.listRequests);
router.post('/requests', fleetController.createRequest);
router.post('/requests/:id/assign', fleetController.assign);
router.post('/requests/:id/reject', fleetController.reject);
router.delete('/requests/:id', fleetController.deleteRequest);

router.post('/vehicles', upload.single('image'), fleetController.createVehicle);
router.put('/vehicles/:id', upload.single('image'), fleetController.updateVehicle);
router.delete('/vehicles/:id', fleetController.deleteVehicle);

// Vehicle reminders (przeglądy/ubezpieczenia) + service/expense log
router.get('/vehicles/:id/reminders', fleetController.listReminders);
router.post('/vehicles/:id/reminders', fleetController.addReminder);
router.delete('/reminders/:id', fleetController.deleteReminder);
router.get('/vehicles/:id/log', fleetController.listLog);
router.post('/vehicles/:id/log', fleetController.addLogEntry);
router.put('/log/:id', fleetController.updateLogEntry);
router.delete('/log/:id', fleetController.deleteLogEntry);

export default router;
