import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import contractController from '../controllers/contract.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// Configure multer for contract attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/contracts');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Niedozwolony typ pliku'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/', contractController.getAllContracts.bind(contractController));
router.get('/statistics', contractController.getStatistics.bind(contractController));
router.get('/expiring', contractController.getExpiringContracts.bind(contractController));
router.get('/:id', contractController.getContractById.bind(contractController));
router.get('/:id/pdf', contractController.downloadPdf.bind(contractController));
router.get('/:id/attachments', contractController.getAttachments.bind(contractController));

// Write routes (ADMIN, KSIEGOWOSC only)
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  contractController.createContract.bind(contractController)
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  contractController.updateContract.bind(contractController)
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  contractController.deleteContract.bind(contractController)
);

// Status management (ADMIN, KSIEGOWOSC only)
router.patch(
  '/:id/status',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  contractController.updateStatus.bind(contractController)
);

// Attachment management (ADMIN, KSIEGOWOSC only)
router.post(
  '/:id/attachments',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  upload.single('file'),
  contractController.uploadAttachment.bind(contractController)
);
router.delete(
  '/:id/attachments/:attachmentId',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  contractController.deleteAttachment.bind(contractController)
);

// Admin actions
router.post(
  '/send-expiring-notifications',
  requireRole([UserRole.ADMIN]),
  contractController.sendExpiringNotifications.bind(contractController)
);

export default router;
