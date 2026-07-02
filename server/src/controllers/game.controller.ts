import { Request, Response } from 'express';
import gameService from '../services/game.service';

export const submitScore = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const game = String(req.body?.game || '').trim();
    const score = Number(req.body?.score);
    if (!game || !Number.isFinite(score)) {
      return res.status(400).json({ message: 'Brak gry lub wyniku' });
    }
    const best = await gameService.submitScore(req.user.userId, game, score);
    return res.json({ success: true, best });
  } catch (error) {
    console.error('Submit score error:', error);
    return res.status(500).json({ message: 'Nie udało się zapisać wyniku' });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const game = String(req.query.game || 'dodge');
    const data = await gameService.getLeaderboard(game, req.user.userId);
    return res.json(data);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ message: 'Nie udało się pobrać rankingu' });
  }
};
