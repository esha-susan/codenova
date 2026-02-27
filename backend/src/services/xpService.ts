import { supabaseAdmin } from '../config/supabase';
import { Achievement } from '../types';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4000, 5500, 7500];

// Per-checkpoint achievement keys
const CHECKPOINT_ACHIEVEMENT_MAP: Record<number, string> = {
  1:  'restored_greeting',
  2:  'restored_loop',
  3:  'restored_string',
  4:  'restored_list',
  5:  'restored_dict',
  6:  'restored_recursion',
  7:  'restored_palindrome',
  8:  'dragon_sigil_1',
  9:  'dragon_sigil_2',
  10: 'dragon_sigil',
};

// Finale checkpoint order indices
const FINALE_ORDER_INDICES = [8, 9, 10];

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

export const unlockNextCheckpoint = async (
  userId: string,
  completedOrderIndex: number
): Promise<void> => {
  // If completing level 7, unlock all 3 finale challenges at once
  if (completedOrderIndex === 7) {
    console.log('[XP] Level 7 complete — unlocking all 3 finale challenges');
    for (const finaleIndex of FINALE_ORDER_INDICES) {
      await unlockCheckpointByIndex(userId, finaleIndex);
    }
    return;
  }

  // For levels 1–6, unlock the next single checkpoint
  if (completedOrderIndex < 7) {
    await unlockCheckpointByIndex(userId, completedOrderIndex + 1);
  }

  // Finale challenges (8, 9, 10) are all unlocked at once when level 7 completes
  // so no sequential unlocking needed within the finale
};

const unlockCheckpointByIndex = async (
  userId: string,
  orderIndex: number
): Promise<void> => {
  const { data: checkpoint, error } = await supabaseAdmin
    .from('checkpoints')
    .select('id, title')
    .eq('order_index', orderIndex)
    .single();

  if (error || !checkpoint) {
    console.log(`[XP] No checkpoint at order_index ${orderIndex}`);
    return;
  }

  console.log(`[XP] Unlocking: ${checkpoint.title} (order ${orderIndex})`);

  const { data: existing } = await supabaseAdmin
    .from('user_progress')
    .select('id, status')
    .eq('user_id', userId)
    .eq('checkpoint_id', checkpoint.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'locked') {
      await supabaseAdmin
        .from('user_progress')
        .update({ status: 'unlocked', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      console.log(`[XP] Updated to unlocked: order_index ${orderIndex}`);
    } else {
      console.log(`[XP] Already ${existing.status}: order_index ${orderIndex}`);
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('user_progress')
      .insert({
        user_id: userId,
        checkpoint_id: checkpoint.id,
        status: 'unlocked',
        attempt_count: 0,
      });

    if (insertError) {
      console.error(`[XP] Failed to insert progress for order_index ${orderIndex}:`, insertError.message);
    } else {
      console.log(`[XP] Inserted unlocked row: order_index ${orderIndex}`);
    }
  }
};

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

  // 2. Spark of the Grid — very first achievement ever
  const { data: allUserAch } = await supabaseAdmin
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId);

  if (allUserAch && allUserAch.length === 1) {
    const ach = await grantAchievement(userId, 'spark_of_the_grid');
    if (ach) return ach;
  }

  // 3. Flawless Initiate — solved on first attempt
  if (attemptCount === 1) {
    const ach = await grantAchievement(userId, 'flawless_initiate');
    if (ach) return ach;
  }

  // 4. Halfway There — 4 of the first 7 hunts completed
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

  // 5. Full Restoration — all 10 checkpoints completed (7 hunts + 3 finale)
  if (completedCount === 10) {
    const ach = await grantAchievement(userId, 'full_restoration');
    if (ach) return ach;
  }

  return null;
};