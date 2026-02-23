import { Request, Response } from 'express';
import projectTemplateService from '../services/projectTemplate.service';

class ProjectTemplateController {
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const template = await projectTemplateService.createTemplate(req.body, userId);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getAllTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await projectTemplateService.getAllTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const template = await projectTemplateService.getTemplateById(req.params.id);
      if (!template) {
        res.status(404).json({ message: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const template = await projectTemplateService.updateTemplate(req.params.id, req.body, userId);
      if (!template) {
        res.status(404).json({ message: 'Template not found' });
        return;
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const success = await projectTemplateService.deleteTemplate(req.params.id);
      if (!success) {
        res.status(404).json({ message: 'Template not found' });
        return;
      }
      res.json({ message: 'Template deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ProjectTemplateController();
