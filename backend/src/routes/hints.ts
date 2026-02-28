import { Router, Request, Response } from 'express';
import { generateHint } from '../services/aiHintService';

const router = Router();

router.post('/request', async (req: Request, res: Response) => {
  try {
    const {
      checkpoint_id,
      code,
      error_output,
      attempt_count,
      challenge_description,
    } = req.body;

    if (!checkpoint_id || !code) {
      return res.status(400).json({ error: 'checkpoint_id and code are required' });
    }

    const result = await generateHint({
      checkpoint_id,
      code,
      error_output,
      attempt_count: attempt_count ?? 1,
      challenge_description,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[HintRoute] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate hint' });
  }
});

export default router;