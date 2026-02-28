import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { generateHint } from '../services/aiHintService';
import { HintRequest } from '../types';

export const requestHint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      checkpoint_id,
      code,
      error_output,
      challenge_description,  // ← now received from frontend
    } = req.body as HintRequest;

    if (!checkpoint_id || !code) {
      res.status(400).json({ error: 'checkpoint_id and code are required.' });
      return;
    }

    // Get current attempt count from DB
    const { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('attempt_count')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint_id)
      .single();

    const attempt_count = progress?.attempt_count ?? 1;

    const hintResponse = await generateHint({
      checkpoint_id,
      code,
      error_output,
      attempt_count,
      challenge_description,  // ← passed to AI for specific hints
    });

    res.json(hintResponse);
  } catch (err) {
    next(err);
  }
};