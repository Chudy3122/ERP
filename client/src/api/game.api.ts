import apiClient from './axios-config';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
}

export interface Leaderboard {
  top: LeaderboardEntry[];
  me: { rank: number | null; score: number } | null;
}

export const submitScore = async (game: string, score: number): Promise<number> => {
  const res = await apiClient.post('/games/scores', { game, score });
  return res.data.best;
};

export const getLeaderboard = async (game = 'dodge'): Promise<Leaderboard> => {
  const res = await apiClient.get('/games/leaderboard', { params: { game } });
  return res.data;
};
