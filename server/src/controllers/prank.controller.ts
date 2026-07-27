import { Request, Response } from 'express';
import { getIO } from '../config/socket';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';

// Harmless, in-app-only prank effects an admin can fire at a colleague.
const PRANK_TYPES = [
  'confetti',
  'rickroll',
  'fake_notification',
  'shake',
  'meme',
  'nyancat',
  'troll',
  'dramatic',
  'surprise',
] as const;
type PrankType = (typeof PRANK_TYPES)[number];

class PrankController {
  /**
   * Send a prank to a specific user (admin only).
   * The prank is delivered live over the socket — nothing is persisted,
   * so an offline target simply misses it.
   * POST /api/admin/prank  { target_user_id, prank_type }
   */
  async sendPrank(req: Request, res: Response): Promise<Response> {
    try {
      const { target_user_id, prank_type } = req.body as {
        target_user_id?: string;
        prank_type?: string;
      };

      if (!target_user_id || !prank_type) {
        return res.status(400).json({ message: 'target_user_id i prank_type są wymagane' });
      }
      if (!PRANK_TYPES.includes(prank_type as PrankType)) {
        return res.status(400).json({ message: 'Nieznany typ pranku' });
      }

      // Friendly sender label so the victim knows who to blame.
      let fromName = req.user?.email || 'Administrator';
      try {
        const sender = await AppDataSource.getRepository(User).findOne({
          where: { id: req.user!.userId },
          select: ['id', 'first_name', 'last_name'],
        });
        if (sender) fromName = `${sender.first_name} ${sender.last_name}`.trim() || fromName;
      } catch {
        /* fall back to email */
      }

      const io = getIO();
      const room = io.sockets.adapter.rooms.get(`user:${target_user_id}`);
      const delivered = !!room && room.size > 0;

      io.to(`user:${target_user_id}`).emit('prank:receive', {
        type: prank_type,
        from: fromName,
        at: new Date().toISOString(),
      });

      return res.json({ delivered });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export default new PrankController();
