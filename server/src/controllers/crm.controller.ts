import { Request, Response } from 'express';
import crmPipelineService from '../services/crmPipeline.service';
import crmPipelineStageService from '../services/crmPipelineStage.service';
import crmDealService from '../services/crmDeal.service';
import crmDealActivityService from '../services/crmDealActivity.service';

class CrmController {
  // ── Pipelines ──

  async getAllPipelines(req: Request, res: Response): Promise<void> {
    try {
      const pipelines = await crmPipelineService.getAllPipelines();
      res.json(pipelines);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async createPipeline(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const pipeline = await crmPipelineService.createPipeline(req.body, userId);
      res.status(201).json(pipeline);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getPipelineById(req: Request, res: Response): Promise<void> {
    try {
      const pipeline = await crmPipelineService.getPipelineById(req.params.id);
      if (!pipeline) { res.status(404).json({ message: 'Pipeline not found' }); return; }
      res.json(pipeline);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePipeline(req: Request, res: Response): Promise<void> {
    try {
      const pipeline = await crmPipelineService.updatePipeline(req.params.id, req.body);
      if (!pipeline) { res.status(404).json({ message: 'Pipeline not found' }); return; }
      res.json(pipeline);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deletePipeline(req: Request, res: Response): Promise<void> {
    try {
      const success = await crmPipelineService.deletePipeline(req.params.id);
      if (!success) { res.status(404).json({ message: 'Pipeline not found' }); return; }
      res.json({ message: 'Pipeline deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async reorderPipelines(req: Request, res: Response): Promise<void> {
    try {
      await crmPipelineService.reorderPipelines(req.body.ids);
      res.json({ message: 'Pipelines reordered' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // ── Stages ──

  async createStage(req: Request, res: Response): Promise<void> {
    try {
      const stage = await crmPipelineStageService.createStage(req.params.pipelineId, req.body);
      res.status(201).json(stage);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateStage(req: Request, res: Response): Promise<void> {
    try {
      const stage = await crmPipelineStageService.updateStage(req.params.id, req.body);
      if (!stage) { res.status(404).json({ message: 'Stage not found' }); return; }
      res.json(stage);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteStage(req: Request, res: Response): Promise<void> {
    try {
      const success = await crmPipelineStageService.deleteStage(req.params.id, req.body.moveDealsToStageId);
      if (!success) { res.status(404).json({ message: 'Stage not found' }); return; }
      res.json({ message: 'Stage deleted' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async reorderStages(req: Request, res: Response): Promise<void> {
    try {
      await crmPipelineStageService.reorderStages(req.params.pipelineId, req.body.ids);
      res.json({ message: 'Stages reordered' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // ── Deals ──

  async getDealsByPipeline(req: Request, res: Response): Promise<void> {
    try {
      const deals = await crmDealService.getDealsByPipeline(req.params.pipelineId, req.query as any);
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async createDeal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const deal = await crmDealService.createDeal(req.body, userId);
      res.status(201).json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getDealById(req: Request, res: Response): Promise<void> {
    try {
      const deal = await crmDealService.getDealById(req.params.id);
      if (!deal) { res.status(404).json({ message: 'Deal not found' }); return; }
      res.json(deal);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateDeal(req: Request, res: Response): Promise<void> {
    try {
      const deal = await crmDealService.updateDeal(req.params.id, req.body);
      if (!deal) { res.status(404).json({ message: 'Deal not found' }); return; }
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async moveDeal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { stage_id, position } = req.body;
      const deal = await crmDealService.moveDeal(req.params.id, stage_id, position, userId);
      if (!deal) { res.status(404).json({ message: 'Deal not found' }); return; }
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateDealStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, lost_reason } = req.body;
      const deal = await crmDealService.updateDealStatus(req.params.id, status, lost_reason, userId);
      if (!deal) { res.status(404).json({ message: 'Deal not found' }); return; }
      res.json(deal);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteDeal(req: Request, res: Response): Promise<void> {
    try {
      const success = await crmDealService.deleteDeal(req.params.id);
      if (!success) { res.status(404).json({ message: 'Deal not found' }); return; }
      res.json({ message: 'Deal deleted' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getDealsForClient(req: Request, res: Response): Promise<void> {
    try {
      const deals = await crmDealService.getDealsForClient(req.params.clientId);
      res.json(deals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async convertDealToInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const invoice = await crmDealService.convertWonDealToInvoice(req.params.id, userId);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // ── Statistics ──

  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await crmDealService.getDealStatistics(req.query.pipeline_id as string);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getForecast(req: Request, res: Response): Promise<void> {
    try {
      const forecast = await crmDealService.getRevenueForecast(req.query.pipeline_id as string);
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getConversionRates(req: Request, res: Response): Promise<void> {
    try {
      const pipelineId = req.query.pipeline_id as string;
      if (!pipelineId) { res.status(400).json({ message: 'pipeline_id is required' }); return; }
      const rates = await crmDealService.getConversionRates(pipelineId);
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // ── Activities ──

  async getDealActivities(req: Request, res: Response): Promise<void> {
    try {
      const activities = await crmDealActivityService.getDealActivities(req.params.id);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async createDealActivity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const activity = await crmDealActivityService.createActivity(req.params.id, req.body, userId);
      res.status(201).json(activity);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateActivity(req: Request, res: Response): Promise<void> {
    try {
      const activity = await crmDealActivityService.updateActivity(req.params.id, req.body);
      if (!activity) { res.status(404).json({ message: 'Activity not found' }); return; }
      res.json(activity);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteActivity(req: Request, res: Response): Promise<void> {
    try {
      const success = await crmDealActivityService.deleteActivity(req.params.id);
      if (!success) { res.status(404).json({ message: 'Activity not found' }); return; }
      res.json({ message: 'Activity deleted' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async completeActivity(req: Request, res: Response): Promise<void> {
    try {
      const activity = await crmDealActivityService.markCompleted(req.params.id);
      if (!activity) { res.status(404).json({ message: 'Activity not found' }); return; }
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getFollowUps(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.user_id as string || req.user!.userId;
      const daysAhead = parseInt(req.query.days as string) || 7;
      const activities = await crmDealActivityService.getScheduledActivities(userId, daysAhead);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new CrmController();
