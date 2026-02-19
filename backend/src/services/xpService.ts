import { supabaseAdmin } from '../config/supabase';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000];

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

  return {
    new_xp,
    new_level,
    leveled_up: new_level > old_level,
  };
};

export const checkAndUnlockAchievements = async (
  userId: string,
  checkpointId: string,
  attemptCount: number
): Promise<import('../types').Achievement | null> => {
  // Check for "First Blood" achievement — complete first checkpoint
  const { data: existing } = await supabaseAdmin
    .from('user_achievements')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length === 0) {
    // First achievement ever — unlock "Spark of the Grid"
    const { data: achievement } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .eq('key', 'spark_of_the_grid')
      .single();

    if (achievement) {
      await supabaseAdmin.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
        unlocked_at: new Date().toISOString(),
      });
      return achievement;
    }
  }

  // Check for "Flawless Initiate" — first try success
  if (attemptCount === 1) {
    const { data: flawlessAch } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .eq('key', 'flawless_initiate')
      .single();

    if (flawlessAch) {
      const { data: alreadyHas } = await supabaseAdmin
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', flawlessAch.id)
        .single();

      if (!alreadyHas) {
        await supabaseAdmin.from('user_achievements').insert({
          user_id: userId,
          achievement_id: flawlessAch.id,
          unlocked_at: new Date().toISOString(),
        });
        return flawlessAch;
      }
    }
  }

  return null;
};