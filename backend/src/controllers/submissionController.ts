import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { executeCode } from '../services/localPythonService';
import { generateHint } from '../services/aiHintService';
import { awardXP, checkAndUnlockAchievements, unlockNextCheckpoint } from '../services/xpService';
import { SubmissionRequest, SubmissionResponse } from '../types';

// Safe wrapper — hint failure NEVER crashes the submission
const safeGenerateHint = async (
  ...args: Parameters<typeof generateHint>
): Promise<string> => {
  try {
    const result = await generateHint(...args);
    return result.hint;
  } catch (err) {
    console.warn('[Submission] Hint generation failed silently:', err);
    return 'The Dragon Mother is momentarily unreachable. Trust your instincts, Initiate.';
  }
};

export const submitCode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { checkpoint_id, code } = req.body as SubmissionRequest;

    if (!checkpoint_id || !code) {
      res.status(400).json({ error: 'checkpoint_id and code are required.' });
      return;
    }

    // 1. Fetch checkpoint
    const { data: checkpoint, error: checkpointErr } = await supabaseAdmin
      .from('checkpoints')
      .select('*')
      .eq('id', checkpoint_id)
      .eq('is_active', true)
      .single();

    if (checkpointErr || !checkpoint) {
      res.status(404).json({
        error: 'Checkpoint not found',
        message: 'This restoration site does not exist in the Grid.',
      });
      return;
    }

    // 2. Get or create user_progress
    let { data: progress } = await supabaseAdmin
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint_id)
      .single();

    if (!progress) {
      const { data: newProgress } = await supabaseAdmin
        .from('user_progress')
        .insert({
          user_id: userId,
          checkpoint_id,
          status: 'unlocked',
          attempt_count: 0,
        })
        .select()
        .single();
      progress = newProgress;
    }

    // Track whether this level was already completed before this submission
    const alreadyCompleted = progress?.status === 'completed';

    // 3. Increment attempt count
    const newAttemptCount = (progress?.attempt_count ?? 0) + 1;
    await supabaseAdmin
      .from('user_progress')
      .update({ attempt_count: newAttemptCount, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('checkpoint_id', checkpoint_id);

    // 4. Execute code locally
    const executionResult = await executeCode(code, checkpoint.test_input ?? undefined);

    // 5. Handle execution errors
    if (executionResult.error_type === 'timeout') {
      const hint = await safeGenerateHint({
        checkpoint_id,
        code,
        error_output: 'Time Limit Exceeded — infinite loop detected',
        attempt_count: newAttemptCount,
      });
      const response: SubmissionResponse = {
        success: false,
        narrative_response: `The spell-construct has fallen into an infinite loop — a fragment of The Corruption itself. Time froze around your rune. ${checkpoint.narrative_failure}`,
        updated_xp: await getCurrentXP(userId),
        updated_progress: await getProgress(userId, checkpoint_id),
        sfx_trigger: 'error',
        hint,
        error_type: 'timeout',
      };
      res.json(response);
      return;
    }

    if (executionResult.error_type === 'syntax') {
      const errorMsg = executionResult.compile_output || executionResult.stderr;
      const hint = await safeGenerateHint({
        checkpoint_id,
        code,
        error_output: errorMsg,
        attempt_count: newAttemptCount,
      });
      const response: SubmissionResponse = {
        success: false,
        narrative_response: `A rune fracture detected! Your spell-construct has a structural flaw. The Corruption exploits broken syntax. ${checkpoint.narrative_failure}`,
        updated_xp: await getCurrentXP(userId),
        updated_progress: await getProgress(userId, checkpoint_id),
        sfx_trigger: 'error',
        hint,
        error_type: 'syntax',
      };
      res.json(response);
      return;
    }

    if (executionResult.error_type === 'runtime') {
      const errorMsg = executionResult.stderr;
      const hint = await safeGenerateHint({
        checkpoint_id,
        code,
        error_output: errorMsg,
        attempt_count: newAttemptCount,
      });
      const response: SubmissionResponse = {
        success: false,
        narrative_response: `The construct shattered mid-cast! A runtime fracture tore through your logic. The beast remains. ${checkpoint.narrative_failure}`,
        updated_xp: await getCurrentXP(userId),
        updated_progress: await getProgress(userId, checkpoint_id),
        sfx_trigger: 'error',
        hint,
        error_type: 'runtime',
      };
      res.json(response);
      return;
    }

    // 6. Compare output
    const actualOutput = (executionResult.stdout ?? '').trim();
    const expectedOutput = checkpoint.expected_output.trim();
    const isCorrect = actualOutput === expectedOutput;

    console.log('[Submission] Output comparison:', {
      actual: JSON.stringify(actualOutput),
      expected: JSON.stringify(expectedOutput),
      isCorrect,
      alreadyCompleted,
    });

    if (isCorrect) {
      let new_xp = await getCurrentXP(userId);
      let leveled_up = false;
      let achievement = null;

      // Only award XP, unlock next level, and grant achievements
      // the FIRST time the level is cracked
      if (!alreadyCompleted) {
        const xpResult = await awardXP(userId, checkpoint.xp_reward);
        new_xp = xpResult.new_xp;
        leveled_up = xpResult.leveled_up;

        // Mark progress complete
        await supabaseAdmin
          .from('user_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('checkpoint_id', checkpoint_id);

        // Unlock next checkpoint
        await unlockNextCheckpoint(userId, checkpoint.order_index);

        // Check achievements
        achievement = await checkAndUnlockAchievements(
          userId,
          checkpoint_id,
          newAttemptCount
        );
      }

      const narrative = alreadyCompleted
        ? `Well done, Initiate! Your rune still holds true. This restoration was already sealed — no new XP is awarded for repeat solutions, but your mastery is noted by the Grid.`
        : leveled_up
        ? `${checkpoint.narrative_success} The Grid resonates with your power — you have ascended to a new level!`
        : checkpoint.narrative_success;

      const response: SubmissionResponse = {
        success: true,
        narrative_response: narrative,
        updated_xp: new_xp,
        updated_progress: await getProgress(userId, checkpoint_id),
        sfx_trigger: 'success',
        achievement: achievement ?? undefined,
      };
      res.json(response);
    } else {
      // Wrong answer — always provide hint regardless of completion status
      const hint = await safeGenerateHint({
        checkpoint_id,
        code,
        error_output: `Expected: "${expectedOutput}" but got: "${actualOutput}"`,
        attempt_count: newAttemptCount,
      });
      const response: SubmissionResponse = {
        success: false,
        narrative_response: checkpoint.narrative_failure,
        updated_xp: await getCurrentXP(userId),
        updated_progress: await getProgress(userId, checkpoint_id),
        sfx_trigger: 'failure',
        hint,
        error_type: 'wrong_output',
      };
      res.json(response);
    }
  } catch (err) {
    next(err);
  }
};

// Helpers
const getCurrentXP = async (userId: string): Promise<number> => {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('xp')
    .eq('user_id', userId)
    .single();
  return data?.xp ?? 0;
};

const getProgress = async (userId: string, checkpointId: string) => {
  const { data } = await supabaseAdmin
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('checkpoint_id', checkpointId)
    .single();
  return data;
};