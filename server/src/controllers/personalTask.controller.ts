import { Request, Response } from 'express';
import personalTaskService from '../services/personalTask.service';

export class PersonalTaskController {
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const tasks = await personalTaskService.getForUser(req.user!.userId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = await personalTaskService.create(req.user!.userId, req.body);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = await personalTaskService.update(req.params.id, req.user!.userId, req.body);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      await personalTaskService.delete(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    try {
      await personalTaskService.reorder(req.user!.userId, req.body.orderedIds || []);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}

export default new PersonalTaskController();
