import { MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { GameScore } from '../models/GameScore.model';

export class GameService {
  private repo = AppDataSource.getRepository(GameScore);

  /** Save a score, keeping only the player's best per game. Returns the best score. */
  async submitScore(userId: string, game: string, score: number): Promise<number> {
    const s = Math.max(0, Math.floor(Number(score) || 0));
    let entry = await this.repo.findOne({ where: { user_id: userId, game } });
    if (!entry) {
      entry = this.repo.create({ user_id: userId, game, score: s });
    } else if (s > entry.score) {
      entry.score = s;
    } else {
      return entry.score; // not a new best — nothing to update
    }
    await this.repo.save(entry);
    return entry.score;
  }

  async getLeaderboard(game: string, userId: string, limit = 10) {
    const top = await this.repo.find({
      where: { game },
      order: { score: 'DESC', updated_at: 'ASC' },
      take: limit,
    });

    const mine = await this.repo.findOne({ where: { user_id: userId, game } });
    let myRank: number | null = null;
    if (mine) {
      const better = await this.repo.count({ where: { game, score: MoreThan(mine.score) } });
      myRank = better + 1;
    }

    return {
      top: top.map((e, i) => ({
        rank: i + 1,
        userId: e.user_id,
        name: e.user ? `${e.user.first_name} ${e.user.last_name}` : '—',
        avatarUrl: (e.user as any)?.avatar_url || null,
        score: e.score,
      })),
      me: mine ? { rank: myRank, score: mine.score } : null,
    };
  }
}

export default new GameService();
