import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requestHint } from '../controllers/aiHintController';

const router = Router();

router.post('/', requireAuth, requestHint);

export default router;