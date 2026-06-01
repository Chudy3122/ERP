import { Request, Response } from 'express';
import supplyService from '../services/supply.service';
import { SupplyRequestStatus } from '../models/SupplyRequest.model';
import { UserRole } from '../models/User.model';

const MANAGER_ROLES = [UserRole.SEKRETARIAT, UserRole.ADMIN];

export class SupplyController {
  private isManager(role?: string): boolean {
    return MANAGER_ROLES.includes(role as UserRole);
  }

  /** GET /api/supply — managers: all; others: own */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const role = req.user!.role;
      const status = req.query.status as string | undefined;
      const data = this.isManager(role)
        ? await supplyService.getAll(status)
        : await supplyService.getMine(req.user!.userId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Błąd pobierania zgłoszeń' });
    }
  };

  /** GET /api/supply/mine — always own requests */
  getMine = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await supplyService.getMine(req.user!.userId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const request = await supplyService.create(req.body, req.user!.userId);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd tworzenia zgłoszenia' });
    }
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    try {
      const request = await supplyService.review(req.params.id, SupplyRequestStatus.APPROVED, req.user!.userId, req.body?.notes);
      res.json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    try {
      const request = await supplyService.review(req.params.id, SupplyRequestStatus.REJECTED, req.user!.userId, req.body?.notes);
      res.json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      await supplyService.delete(req.params.id, req.user!.userId, this.isManager(req.user!.role));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}

export default new SupplyController();
