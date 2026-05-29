import { Router } from 'express';
import procedureController from '../controllers/procedure.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';
import { upload } from '../config/multer';

const router = Router();

router.use(authenticate);

router.get('/', procedureController.getAll.bind(procedureController));
router.get('/:id', procedureController.getById.bind(procedureController));
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  procedureController.create.bind(procedureController),
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  procedureController.update.bind(procedureController),
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN]),
  procedureController.delete.bind(procedureController),
);

// Attachments (PDF etc.)
router.post(
  '/:id/attachments',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  upload.array('files', 5),
  procedureController.uploadAttachments.bind(procedureController),
);
router.delete(
  '/:id/attachments',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  procedureController.deleteAttachment.bind(procedureController),
);

export default router;
