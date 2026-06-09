import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Invoices are hidden from regular employees entirely (read + write)
router.use(requireRole([UserRole.ADMIN, UserRole.SZEF, UserRole.KIEROWNIK, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]));

// Read routes (available to all roles above)
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
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.exportExcel.bind(invoiceController)
);
router.get(
  '/reports/export/pdf',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.exportPdf.bind(invoiceController)
);

router.get('/:id', invoiceController.getInvoiceById.bind(invoiceController));
router.get('/:id/pdf', invoiceController.downloadPdf.bind(invoiceController));
router.get('/:id/items', invoiceController.getInvoiceItems.bind(invoiceController));

// Write routes (ADMIN, KSIEGOWOSC only)
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.createInvoice.bind(invoiceController)
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.updateInvoice.bind(invoiceController)
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.deleteInvoice.bind(invoiceController)
);

// Status management (ADMIN, KSIEGOWOSC only)
router.patch(
  '/:id/status',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.updateStatus.bind(invoiceController)
);
router.post(
  '/:id/mark-paid',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.markAsPaid.bind(invoiceController)
);

// Invoice items (ADMIN, KSIEGOWOSC only)
router.post(
  '/:id/items',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.addItem.bind(invoiceController)
);
router.put(
  '/:id/items/:itemId',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.updateItem.bind(invoiceController)
);
router.delete(
  '/:id/items/:itemId',
  requireRole([UserRole.ADMIN, UserRole.KSIEGOWOSC, UserRole.SEKRETARIAT]),
  invoiceController.removeItem.bind(invoiceController)
);

export default router;
