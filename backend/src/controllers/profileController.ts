import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      res.status(404).json({
        error: 'ProfileNotFound',
        message: 'No Initiate record found. Create your profile to enter Emberwood.',
      });
      return;
    }

    res.json({ profile });
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { username, avatar_id } = req.body;

    if (!username || !avatar_id) {
      res.status(400).json({ error: 'username and avatar_id are required.' });
      return;
    }

    if (username.length < 2 || username.length > 20) {
      res.status(400).json({ error: 'Username must be 2-20 characters.' });
      return;
    }

    // Upsert profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          username,
          avatar_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Username already taken in Emberwood.' });
        return;
      }
      throw error;
    }

    // Initialize progress for the first (and only active) checkpoint
    const { data: activeCheckpoints } = await supabaseAdmin
      .from('checkpoints')
      .select('id')
      .eq('is_active', true);

    if (activeCheckpoints && activeCheckpoints.length > 0) {
      for (const checkpoint of activeCheckpoints) {
        await supabaseAdmin
          .from('user_progress')
          .upsert(
            {
              user_id: userId,
              checkpoint_id: checkpoint.id,
              status: 'unlocked',
              attempt_count: 0,
            },
            { onConflict: 'user_id,checkpoint_id' }
          );
      }
    }

    res.json({
      profile,
      message: 'Your initiation into Emberwood is recorded. The Grid welcomes you.',
    });
  } catch (err) {
    next(err);
  }
};

export const getProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: progress, error } = await supabaseAdmin
      .from('user_progress')
      .select(`
        *,
        checkpoints (
          id, order_index, title, challenge_description,
          starter_code, xp_reward, is_active, narrative_intro
        )
      `)
      .eq('user_id', userId)
      .order('checkpoints(order_index)', { ascending: true });

    if (error) throw error;

    res.json({ progress: progress ?? [] });
  } catch (err) {
    next(err);
  }
};

export const getAchievements = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const { data: userAchievements, error } = await supabaseAdmin
      .from('user_achievements')
      .select(`*, achievements (*)`)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ achievements: userAchievements ?? [] });
  } catch (err) {
    next(err);
  }
};