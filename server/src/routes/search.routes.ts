import { Router } from 'express';
import searchController from '../controllers/search.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, (req, res) => searchController.search(req, res));

export default router;
