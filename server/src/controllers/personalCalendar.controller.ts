import { Request, Response } from 'express';
import personalCalendarService from '../services/personalCalendar.service';

class PersonalCalendarController {
  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const now = new Date();
      const from = req.query.from ? new Date(req.query.from as string) : new Date(now.getFullYear(), now.getMonth(), 1);
      const to = req.query.to ? new Date(req.query.to as string) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const data = await personalCalendarService.list(req.user!.userId, from, to);
      res.json(data);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Błąd pobierania wydarzeń' });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const event = await personalCalendarService.create(req.user!.userId, req.body);
      res.status(201).json(event);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Nie udało się dodać wydarzenia' });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const event = await personalCalendarService.update(req.params.id, req.user!.userId, req.body);
      res.json(event);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Nie udało się zapisać wydarzenia' });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      await personalCalendarService.delete(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };
}

export default new PersonalCalendarController();
