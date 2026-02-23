import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/overdue', paymentController.getOverdueInvoices.bind(paymentController));
router.get('/statistics', paymentController.getStatistics.bind(paymentController));
router.get('/invoice/:invoiceId', paymentController.getPaymentsByInvoice.bind(paymentController));
router.get('/:id', paymentController.getPaymentById.bind(paymentController));

// Write routes (ADMIN, KSIEGOWOSC only)
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  paymentController.createPayment.bind(paymentController)
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  paymentController.updatePayment.bind(paymentController)
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  paymentController.deletePayment.bind(paymentController)
);

// Send reminders (ADMIN, KSIEGOWOSC only)
router.post(
  '/send-reminders',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  paymentController.sendOverdueReminders.bind(paymentController)
);

export default router;
