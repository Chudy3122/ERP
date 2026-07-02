import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { submitScore, getLeaderboard } from '../controllers/game.controller';

const router = Router();

router.use(authenticate);

router.post('/scores', submitScore);
router.get('/leaderboard', getLeaderboard);

export default router;
