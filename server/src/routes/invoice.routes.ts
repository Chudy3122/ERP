import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/', invoiceController.getAllInvoices.bind(invoiceController));
router.get('/statistics', invoiceController.getStatistics.bind(invoiceController));

// Report routes (available to all authenticated users)
router.get('/reports/revenue-over-time', invoiceController.getRevenueOverTime.bind(invoiceController));
router.get('/reports/revenue-by-client', invoiceController.getRevenueByClient.bind(invoiceController));
router.get('/reports/status-distribution', invoiceController.getStatusDistribution.bind(invoiceController));
router.get('/reports/payment-overview', invoiceController.getPaymentOverview.bind(invoiceController));

// Export routes (ADMIN, KSIEGOWOSC only)
router.get(
  '/reports/export/excel',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.exportExcel.bind(invoiceController)
);
router.get(
  '/reports/export/pdf',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.exportPdf.bind(invoiceController)
);

router.get('/:id', invoiceController.getInvoiceById.bind(invoiceController));
router.get('/:id/pdf', invoiceController.downloadPdf.bind(invoiceController));
router.get('/:id/items', invoiceController.getInvoiceItems.bind(invoiceController));

// Write routes (ADMIN, KSIEGOWOSC only)
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.createInvoice.bind(invoiceController)
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.updateInvoice.bind(invoiceController)
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.deleteInvoice.bind(invoiceController)
);

// Status management (ADMIN, KSIEGOWOSC only)
router.patch(
  '/:id/status',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.updateStatus.bind(invoiceController)
);
router.post(
  '/:id/mark-paid',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.markAsPaid.bind(invoiceController)
);

// Invoice items (ADMIN, KSIEGOWOSC only)
router.post(
  '/:id/items',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.addItem.bind(invoiceController)
);
router.put(
  '/:id/items/:itemId',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.updateItem.bind(invoiceController)
);
router.delete(
  '/:id/items/:itemId',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC]),
  invoiceController.removeItem.bind(invoiceController)
);

export default router;
