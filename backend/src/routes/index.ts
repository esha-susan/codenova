import { Router } from 'express';
import profileRoutes from './profileRoutes';
import submissionRoutes from './submissionRoutes';
import hintRoutes from './hintRoutes';
import checkpointRoutes from './checkpointRoutes';

const router = Router();

router.use('/profile', profileRoutes);
router.use('/submissions', submissionRoutes);
router.use('/hints', hintRoutes);
router.use('/checkpoints', checkpointRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'alive',
    message: 'The Grid of Emberwood hums with stability.',
    timestamp: new Date().toISOString(),
  });
});

export default router;