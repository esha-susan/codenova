import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const router = Router();

// Get all active checkpoints (public metadata only, no expected_output)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .select(
        'id, order_index, title, narrative_intro, challenge_description, starter_code, xp_reward, is_active'
      )
      .order('order_index');

    if (error) throw error;
    res.json({ checkpoints: data });
  } catch (err) {
    next(err);
  }
});

// Get single checkpoint by id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('checkpoints')
      .select(
        'id, order_index, title, narrative_intro, challenge_description, starter_code, xp_reward, is_active'
      )
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Checkpoint not found.' });
      return;
    }

    res.json({ checkpoint: data });
  } catch (err) {
    next(err);
  }
});

export default router;