import { Router } from 'express';
import reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All report routes require authentication and admin/team leader role
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]));

// Get time report data
router.get('/time', reportController.getTimeReport.bind(reportController));

// Export time report to Excel
router.get('/time/export/excel', reportController.exportTimeReportExcel.bind(reportController));

// Export time report to PDF
router.get('/time/export/pdf', reportController.exportTimeReportPDF.bind(reportController));

export default router;
