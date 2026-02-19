import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getProfile, createOrUpdateProfile, getProgress, getAchievements } from '../controllers/profileController';

const router = Router();

router.get('/', requireAuth, getProfile);
router.post('/', requireAuth, createOrUpdateProfile);
router.get('/progress', requireAuth, getProgress);
router.get('/achievements', requireAuth, getAchievements);

export default router;