import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getDuels,
  createDuel,
  acceptDuel,
  submitDuelCode,
  cancelDuel,
  getDuelLeaderboard,
} from '../controllers/duelController';

const router = Router();

router.use(requireAuth);

router.get('/',              getDuels);
router.get('/leaderboard',   getDuelLeaderboard);
router.post('/',             createDuel);
router.post('/:id/accept',  acceptDuel);
router.post('/:id/submit',  submitDuelCode);
router.post('/:id/cancel',  cancelDuel);

export default router;