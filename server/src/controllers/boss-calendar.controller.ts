import { Request, Response } from 'express';
import { BossCalendarService } from '../services/boss-calendar.service';

class BossCalendarController {
  private service = new BossCalendarService();

  async getByRange(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query as { from: string; to: string };
      if (!from || !to) {
        res.status(400).json({ message: 'Parametry from i to są wymagane' });
        return;
      }
      const entries = await this.service.getByDateRange(from, to);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas pobierania kalendarza' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const entry = await this.service.create({ ...req.body, created_by: userId });
      res.status(201).json(entry);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas tworzenia wpisu' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const entry = await this.service.update(req.params.id, { ...req.body, updated_by: userId });
      if (!entry) {
        res.status(404).json({ message: 'Wpis nie znaleziony' });
        return;
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas aktualizacji wpisu' });
    }
  }

  async setCompleted(req: Request, res: Response): Promise<void> {
    try {
      const completed = !!req.body.completed;
      const entry = await this.service.setCompleted(req.params.id, completed);
      if (!entry) {
        res.status(404).json({ message: 'Wpis nie znaleziony' });
        return;
      }
      res.json(entry);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas oznaczania spotkania' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.service.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: 'Wpis nie znaleziony' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas usuwania wpisu' });
    }
  }
}

export default new BossCalendarController();
