import { Router } from 'express';
import crmController from '../controllers/crm.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);

// ── Pipelines ──
router.get('/pipelines', crmController.getAllPipelines.bind(crmController));
router.get('/pipelines/:id', crmController.getPipelineById.bind(crmController));
router.post('/pipelines', requireRole([UserRole.ADMIN]), crmController.createPipeline.bind(crmController));
router.put('/pipelines/:id', requireRole([UserRole.ADMIN]), crmController.updatePipeline.bind(crmController));
router.delete('/pipelines/:id', requireRole([UserRole.ADMIN]), crmController.deletePipeline.bind(crmController));
router.post('/pipelines/reorder', requireRole([UserRole.ADMIN]), crmController.reorderPipelines.bind(crmController));

// ── Stages ──
router.post('/pipelines/:pipelineId/stages', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), crmController.createStage.bind(crmController));
router.put('/stages/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), crmController.updateStage.bind(crmController));
router.delete('/stages/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), crmController.deleteStage.bind(crmController));
router.post('/pipelines/:pipelineId/stages/reorder', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), crmController.reorderStages.bind(crmController));

// ── Deals ──
router.get('/pipelines/:pipelineId/deals', crmController.getDealsByPipeline.bind(crmController));
router.post('/deals', crmController.createDeal.bind(crmController));
router.get('/deals/:id', crmController.getDealById.bind(crmController));
router.put('/deals/:id', crmController.updateDeal.bind(crmController));
router.patch('/deals/:id/move', crmController.moveDeal.bind(crmController));
router.patch('/deals/:id/status', crmController.updateDealStatus.bind(crmController));
router.delete('/deals/:id', crmController.deleteDeal.bind(crmController));
router.get('/clients/:clientId/deals', crmController.getDealsForClient.bind(crmController));
router.post('/deals/:id/convert-to-invoice', crmController.convertDealToInvoice.bind(crmController));

// ── Statistics ──
router.get('/statistics', crmController.getStatistics.bind(crmController));
router.get('/forecast', crmController.getForecast.bind(crmController));
router.get('/conversion-rates', crmController.getConversionRates.bind(crmController));

// ── Activities ──
router.get('/deals/:id/activities', crmController.getDealActivities.bind(crmController));
router.post('/deals/:id/activities', crmController.createDealActivity.bind(crmController));
router.put('/activities/:id', crmController.updateActivity.bind(crmController));
router.delete('/activities/:id', crmController.deleteActivity.bind(crmController));
router.patch('/activities/:id/complete', crmController.completeActivity.bind(crmController));
router.get('/follow-ups', crmController.getFollowUps.bind(crmController));

export default router;
