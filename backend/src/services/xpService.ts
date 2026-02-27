import { supabaseAdmin } from '../config/supabase';
import { Achievement } from '../types';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000];

// Map checkpoint order_index → achievement key awarded on completion
const CHECKPOINT_ACHIEVEMENT_MAP: Record<number, string> = {
  1: 'restored_greeting',
  2: 'restored_loop',
  3: 'restored_string',
  4: 'restored_list',
  5: 'restored_dict',
  6: 'restored_recursion',
  7: 'restored_palindrome',
  8: 'dragon_sigil',
};

export const getLevelFromXP = (xp: number): number => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
};

export const awardXP = async (
  userId: string,
  xpAmount: number
): Promise<{ new_xp: number; new_level: number; leveled_up: boolean }> => {
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('xp, level')
    .eq('user_id', userId)
    .single();

  if (fetchError || !profile) {
    throw new Error(`Could not fetch profile for XP award: ${fetchError?.message}`);
  }

  const old_level = profile.level;
  const new_xp = profile.xp + xpAmount;
  const new_level = getLevelFromXP(new_xp);

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ xp: new_xp, level: new_level, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(`Failed to update XP: ${updateError.message}`);
  }

  return { new_xp, new_level, leveled_up: new_level > old_level };
};

// Unlock the next checkpoint after completing the current one
export const unlockNextCheckpoint = async (
  userId: string,
  completedOrderIndex: number
): Promise<void> => {
  const nextOrderIndex = completedOrderIndex + 1;

  const { data: nextCheckpoint } = await supabaseAdmin
    .from('checkpoints')
    .select('id')
    .eq('order_index', nextOrderIndex)
    .single();

  if (!nextCheckpoint) return;

  await supabaseAdmin
    .from('user_progress')
    .upsert(
      {
        user_id: userId,
        checkpoint_id: nextCheckpoint.id,
        status: 'unlocked',
        attempt_count: 0,
      },
      { onConflict: 'user_id,checkpoint_id' }
    );
};

// Grant an achievement if the user does not already have it
const grantAchievement = async (
  userId: string,
  achievementKey: string
): Promise<Achievement | null> => {
  const { data: achievement } = await supabaseAdmin
    .from('achievements')
    .select('*')
    .eq('key', achievementKey)
    .single();

  if (!achievement) return null;

  const { data: existing } = await supabaseAdmin
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .eq('achievement_id', achievement.id)
    .maybeSingle();

  if (existing) return null;

  await supabaseAdmin.from('user_achievements').insert({
    user_id: userId,
    achievement_id: achievement.id,
    unlocked_at: new Date().toISOString(),
  });

  return achievement;
};

export const checkAndUnlockAchievements = async (
  userId: string,
  checkpointId: string,
  attemptCount: number
): Promise<Achievement | null> => {
  const { data: checkpoint } = await supabaseAdmin
    .from('checkpoints')
    .select('order_index')
    .eq('id', checkpointId)
    .single();

  const orderIndex = checkpoint?.order_index ?? 0;

  // 1. Per-checkpoint completion achievement
  const checkpointAchKey = CHECKPOINT_ACHIEVEMENT_MAP[orderIndex];
  if (checkpointAchKey) {
    const ach = await grantAchievement(userId, checkpointAchKey);
    if (ach) return ach;
  }

  // 2. Spark of the Grid — very first completion
  const { data: allUserAch } = await supabaseAdmin
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId);

  if (allUserAch && allUserAch.length === 1) {
    const ach = await grantAchievement(userId, 'spark_of_the_grid');
    if (ach) return ach;
  }

  // 3. Flawless Initiate — first attempt success
  if (attemptCount === 1) {
    const ach = await grantAchievement(userId, 'flawless_initiate');
    if (ach) return ach;
  }

  // 4. Halfway There — 4 hunts completed
  const { data: completedProgress } = await supabaseAdmin
    .from('user_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed');

  const completedCount = completedProgress?.length ?? 0;

  if (completedCount === 4) {
    const ach = await grantAchievement(userId, 'halfway_there');
    if (ach) return ach;
  }

  // 5. Full Restoration — all 8 completed
  if (completedCount === 8) {
    const ach = await grantAchievement(userId, 'full_restoration');
    if (ach) return ach;
  }

  return null;
};