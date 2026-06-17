import { Request, Response } from 'express';
import emailService from '../services/email.service';

export class EmailController {
  // ── Accounts ────────────────────────────────────────────────────────────────
  listAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await emailService.listAccounts(req.user!.userId));
    } catch (e: any) {
      res.status(500).json({ message: e.message || 'Błąd pobierania kont' });
    }
  };

  addAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await emailService.addAccount(req.user!.userId, req.body);
      res.status(201).json(account);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Nie udało się dodać konta' });
    }
  };

  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      await emailService.deleteAccount(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  // ── Reading ───────────────────────────────────────────────────────────────--
  listFolders = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await emailService.listFolders(req.params.id, req.user!.userId));
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Błąd pobierania folderów' });
    }
  };

  listMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      const folder = (req.query.folder as string) || 'INBOX';
      const page = parseInt((req.query.page as string) || '1', 10);
      const pageSize = Math.min(parseInt((req.query.pageSize as string) || '30', 10), 100);
      res.json(await emailService.listMessages(req.params.id, req.user!.userId, folder, page, pageSize));
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Błąd pobierania wiadomości' });
    }
  };

  getMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const folder = (req.query.folder as string) || 'INBOX';
      const uid = parseInt(req.params.uid, 10);
      res.json(await emailService.getMessage(req.params.id, req.user!.userId, folder, uid));
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Błąd pobierania wiadomości' });
    }
  };

  getAttachment = async (req: Request, res: Response): Promise<void> => {
    try {
      const folder = (req.query.folder as string) || 'INBOX';
      const uid = parseInt(req.params.uid, 10);
      const index = parseInt(req.params.index, 10);
      const att = await emailService.getAttachment(req.params.id, req.user!.userId, folder, uid, index);
      res.setHeader('Content-Type', att.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`);
      res.send(att.content);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Błąd pobierania załącznika' });
    }
  };

  setFlags = async (req: Request, res: Response): Promise<void> => {
    try {
      const folder = (req.query.folder as string) || 'INBOX';
      const uid = parseInt(req.params.uid, 10);
      res.json(await emailService.setFlags(req.params.id, req.user!.userId, folder, uid, req.body.action));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const folder = (req.query.folder as string) || 'INBOX';
      const uid = parseInt(req.params.uid, 10);
      res.json(await emailService.deleteMessage(req.params.id, req.user!.userId, folder, uid));
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  // ── Sending ───────────────────────────────────────────────────────────────--
  sendMail = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const result = await emailService.sendMail(req.params.id, req.user!.userId, req.body, files);
      res.status(200).json(result);
    } catch (e: any) {
      res.status(400).json({ message: e.message || 'Nie udało się wysłać wiadomości' });
    }
  };
}

export default new EmailController();
