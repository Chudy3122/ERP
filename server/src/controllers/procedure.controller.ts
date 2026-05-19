import { Request, Response } from 'express';
import procedureService from '../services/procedure.service';

export class ProcedureController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { category, status } = req.query;
      const procedures = await procedureService.getAll(
        category as string | undefined,
        status as string | undefined,
      );
      res.json(procedures);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas pobierania procedur' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const procedure = await procedureService.getById(req.params.id);
      if (!procedure) {
        res.status(404).json({ message: 'Procedura nie znaleziona' });
        return;
      }
      res.json(procedure);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas pobierania procedury' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const procedure = await procedureService.create(req.body, userId);
      res.status(201).json(procedure);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas tworzenia procedury' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const procedure = await procedureService.update(req.params.id, req.body, userId);
      if (!procedure) {
        res.status(404).json({ message: 'Procedura nie znaleziona' });
        return;
      }
      res.json(procedure);
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas aktualizacji procedury' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await procedureService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: 'Procedura nie znaleziona' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Błąd podczas usuwania procedury' });
    }
  }
}

export default new ProcedureController();
