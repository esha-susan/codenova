import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { submitCode } from '../controllers/submissionController';

const router = Router();

router.post('/', requireAuth, submitCode);

export default router;