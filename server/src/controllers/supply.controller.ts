import { Request, Response } from 'express';
import supplyService from '../services/supply.service';
import { SupplyRequestStatus } from '../models/SupplyRequest.model';
import { User, UserRole } from '../models/User.model';
import { AppDataSource } from '../config/database';
import notificationService from '../services/notification.service';

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

      // Notify sekretariat + admins (except the creator)
      try {
        const userRepo = AppDataSource.getRepository(User);
        const recipients = await userRepo.find({
          where: [
            { role: UserRole.SEKRETARIAT, is_active: true },
            { role: UserRole.ADMIN, is_active: true },
          ],
        });
        const requester = await userRepo.findOne({ where: { id: req.user!.userId }, select: ['id', 'first_name', 'last_name'] });
        const requesterName = requester ? `${requester.first_name} ${requester.last_name}` : 'Pracownik';
        for (const r of recipients) {
          if (r.id === req.user!.userId) continue;
          await notificationService.notifyNewSupplyRequest(
            r.id, requesterName, request.item_name, request.quantity, request.id, req.user!.userId,
          );
        }
      } catch (e) {
        console.error('Supply notify error:', e);
      }

      res.status(201).json(request);
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Błąd tworzenia zgłoszenia' });
    }
  };

  /** PUT /api/supply/:id — owner can edit own PENDING; admin can edit any */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const isAdmin = req.user!.role === UserRole.ADMIN;
      const request = await supplyService.update(req.params.id, req.body, req.user!.userId, isAdmin);
      res.json(request);
    } catch (error: any) {
      const code = /uprawnie/i.test(error.message || '') ? 403 : 400;
      res.status(code).json({ message: error.message || 'Błąd edycji zgłoszenia' });
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

  /** GET /api/supply/:id/comments — owner or manager */
  getComments = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await supplyService.getComments(req.params.id, req.user!.userId, req.user!.role);
      res.json(data);
    } catch (error: any) {
      const code = /uprawnie/i.test(error.message || '') ? 403 : 400;
      res.status(code).json({ message: error.message || 'Błąd pobierania komentarzy' });
    }
  };

  /** POST /api/supply/:id/comments — owner or manager; notifies the other party */
  addComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const commenterId = req.user!.userId;
      const { comment, request } = await supplyService.addComment(
        req.params.id, commenterId, req.user!.role, req.body?.content,
      );

      // Notify the other party: the request owner + managers (except the commenter).
      try {
        const userRepo = AppDataSource.getRepository(User);
        const commenter = await userRepo.findOne({ where: { id: commenterId }, select: ['id', 'first_name', 'last_name'] });
        const commenterName = commenter ? `${commenter.first_name} ${commenter.last_name}` : 'Pracownik';

        const recipients = new Set<string>();
        if (request.user_id !== commenterId) recipients.add(request.user_id);
        const managers = await userRepo.find({
          where: [
            { role: UserRole.SEKRETARIAT, is_active: true },
            { role: UserRole.ADMIN, is_active: true },
          ],
          select: ['id'],
        });
        managers.forEach((m) => { if (m.id !== commenterId) recipients.add(m.id); });

        for (const recipientId of recipients) {
          await notificationService.notifySupplyComment(
            recipientId, commenterName, request.item_name, request.id, commenterId,
          );
        }
      } catch (e) {
        console.error('Supply comment notify error:', e);
      }

      res.status(201).json(comment);
    } catch (error: any) {
      const code = /uprawnie/i.test(error.message || '') ? 403 : 400;
      res.status(code).json({ message: error.message || 'Błąd dodawania komentarza' });
    }
  };
}

export default new SupplyController();
