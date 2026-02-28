import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';

const VALID_STAKES = [50, 100, 200, 500];
const DUEL_CHECKPOINT_MAX_INDEX = 7; // Only main hunts, not finale

// ── GET /api/duels — public board ────────────────────────────
export const getDuels = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Expire stale duels first
    await supabaseAdmin.rpc('expire_old_duels');

    const { data: duels, error } = await supabaseAdmin
      .from('duels')
      .select(`
        id, stake_xp, status, created_at, expires_at,
        challenger_id, opponent_id, winner_id,
        challenger_solved_at, opponent_solved_at,
        challenger_attempts, opponent_attempts,
        checkpoints ( id, order_index, title, challenge_description, starter_code, expected_output )
      `)
      .in('status', ['open', 'active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Collect all unique user IDs to fetch profiles in one query
    const userIds = [...new Set([
      ...duels.map((d: any) => d.challenger_id),
      ...duels.map((d: any) => d.opponent_id).filter(Boolean),
    ])];

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, username, avatar_id, xp, level')
      .in('user_id', userIds);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.user_id, p])
    );

    // Attach profile data to each duel
    const enriched = duels.map((d: any) => ({
      ...d,
      challenger: profileMap[d.challenger_id] ?? null,
      opponent: d.opponent_id ? (profileMap[d.opponent_id] ?? null) : null,
    }));

    res.json({ duels: enriched });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/duels — create a new open duel ─────────────────
export const createDuel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { stake_xp } = req.body;

    // Validate stake
    if (!VALID_STAKES.includes(stake_xp)) {
      res.status(400).json({ error: 'Invalid stake. Must be 50, 100, 200, or 500 XP.' });
      return;
    }

    // Check user has enough XP
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('xp, username')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.xp < stake_xp) {
      res.status(400).json({
        error: 'Insufficient XP',
        message: `You need ${stake_xp} XP to post this duel. You have ${profile?.xp ?? 0} XP.`,
      });
      return;
    }

    // Check user doesn't already have an open/active duel
    const { data: existingDuel } = await supabaseAdmin
      .from('duels')
      .select('id')
      .eq('challenger_id', userId)
      .in('status', ['open', 'active'])
      .maybeSingle();

    if (existingDuel) {
      res.status(400).json({
        error: 'You already have an active duel. Complete or cancel it first.',
      });
      return;
    }

    // Pick a random checkpoint from main hunts (1–7)
    const { data: checkpoints } = await supabaseAdmin
      .from('checkpoints')
      .select('id, order_index, title')
      .lte('order_index', DUEL_CHECKPOINT_MAX_INDEX)
      .eq('is_active', true);

    if (!checkpoints || checkpoints.length === 0) {
      res.status(500).json({ error: 'No checkpoints available for duels.' });
      return;
    }

    const randomCp = checkpoints[Math.floor(Math.random() * checkpoints.length)];

    // Deduct stake XP immediately (held in escrow)
    await supabaseAdmin
      .from('profiles')
      .update({ xp: profile.xp - stake_xp, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // Create the duel
    const { data: duel, error } = await supabaseAdmin
      .from('duels')
      .insert({
        challenger_id: userId,
        checkpoint_id: randomCp.id,
        stake_xp,
        status: 'open',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Refund XP if duel creation failed
      await supabaseAdmin
        .from('profiles')
        .update({ xp: profile.xp, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      throw error;
    }

    res.json({
      message: `Your duel has been posted to the board! ${stake_xp} XP held in escrow.`,
      duel,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/duels/:id/accept — accept an open duel ─────────
export const acceptDuel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Fetch the duel
    const { data: duel, error: fetchErr } = await supabaseAdmin
      .from('duels')
      .select('*, checkpoints(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !duel) {
      res.status(404).json({ error: 'Duel not found.' });
      return;
    }

    if (duel.status !== 'open') {
      res.status(400).json({ error: 'This duel is no longer open.' });
      return;
    }

    if (duel.challenger_id === userId) {
      res.status(400).json({ error: 'You cannot accept your own duel.' });
      return;
    }

    if (new Date(duel.expires_at) < new Date()) {
      await supabaseAdmin
        .from('duels')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', id);
      res.status(400).json({ error: 'This duel has expired.' });
      return;
    }

    // Check opponent has enough XP
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('xp')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.xp < duel.stake_xp) {
      res.status(400).json({
        error: `Insufficient XP. You need ${duel.stake_xp} XP to accept this duel.`,
      });
      return;
    }

    // Deduct stake from opponent
    await supabaseAdmin
      .from('profiles')
      .update({ xp: profile.xp - duel.stake_xp, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    // Activate the duel
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('duels')
      .update({
        opponent_id: userId,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, checkpoints(*)')
      .single();

    if (updateErr) {
      // Refund
      await supabaseAdmin
        .from('profiles')
        .update({ xp: profile.xp, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      throw updateErr;
    }

    res.json({
      message: 'Duel accepted! The race begins now. First correct solution wins.',
      duel: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/duels/:id/submit — submit code in a duel ───────
export const submitDuelCode = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Code is required.' });
      return;
    }

    // Fetch duel with checkpoint
    const { data: duel, error: fetchErr } = await supabaseAdmin
      .from('duels')
      .select('*, checkpoints(*)')
      .eq('id', id)
      .single();

    if (fetchErr || !duel) {
      res.status(404).json({ error: 'Duel not found.' });
      return;
    }

    if (duel.status !== 'active') {
      res.status(400).json({ error: 'This duel is not active.' });
      return;
    }

    const isChallenger = duel.challenger_id === userId;
    const isOpponent = duel.opponent_id === userId;

    if (!isChallenger && !isOpponent) {
      res.status(403).json({ error: 'You are not a participant in this duel.' });
      return;
    }

    // Check if this player already solved it
    const alreadySolved = isChallenger
      ? !!duel.challenger_solved_at
      : !!duel.opponent_solved_at;

    if (alreadySolved) {
      res.status(400).json({ error: 'You have already solved this duel.' });
      return;
    }

    // Execute code
    const { executeCode } = await import('../services/localPythonService');
    const result = await executeCode(code, duel.checkpoints.test_input ?? undefined);

    const actualOutput = (result.stdout ?? '').trim();
    const expectedOutput = duel.checkpoints.expected_output.trim();
    const isCorrect = actualOutput === expectedOutput;

    // Update attempt count
    const attemptField = isChallenger ? 'challenger_attempts' : 'opponent_attempts';
    const newAttempts = (isChallenger ? duel.challenger_attempts : duel.opponent_attempts) + 1;

    if (!isCorrect) {
      await supabaseAdmin
        .from('duels')
        .update({
          [attemptField]: newAttempts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      res.json({
        correct: false,
        message: 'Not quite right. Keep trying — your opponent is still coding!',
        error_type: result.error_type,
        stderr: result.stderr,
      });
      return;
    }

    // ── CORRECT SOLUTION ─────────────────────────────────────
    const solvedAtField = isChallenger ? 'challenger_solved_at' : 'opponent_solved_at';
    const now = new Date().toISOString();

    // Check if the OTHER player already solved it
    const otherSolvedAt = isChallenger ? duel.opponent_solved_at : duel.challenger_solved_at;
    const otherSolved = !!otherSolvedAt;

    // Mark this player as solved
    await supabaseAdmin
      .from('duels')
      .update({
        [solvedAtField]: now,
        [attemptField]: newAttempts,
        updated_at: now,
      })
      .eq('id', id);

    if (otherSolved) {
      // Both solved — compare timestamps to find winner
      const myTime = new Date(now).getTime();
      const otherTime = new Date(otherSolvedAt).getTime();
      const iWon = myTime <= otherTime;
      const winnerId = iWon ? userId : (isChallenger ? duel.opponent_id : duel.challenger_id);

      await settleDuel(duel, winnerId);

      res.json({
        correct: true,
        duel_complete: true,
        i_won: iWon,
        message: iWon
          ? `🏆 You win! You solved it first. +${duel.stake_xp} XP claimed from your opponent!`
          : `💀 You lose. Your opponent was faster. Your ${duel.stake_xp} XP stake is gone.`,
        xp_change: iWon ? duel.stake_xp : -duel.stake_xp,
      });
    } else {
      // First to solve — waiting for opponent
      res.json({
        correct: true,
        duel_complete: false,
        message: '✅ Correct! You solved it first! Waiting to see if your opponent can catch up...',
        solved_at: now,
      });
    }
  } catch (err) {
    next(err);
  }
};

// ── POST /api/duels/:id/cancel — cancel an open duel ─────────
export const cancelDuel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { data: duel } = await supabaseAdmin
      .from('duels')
      .select('*')
      .eq('id', id)
      .single();

    if (!duel) {
      res.status(404).json({ error: 'Duel not found.' });
      return;
    }

    if (duel.challenger_id !== userId) {
      res.status(403).json({ error: 'Only the challenger can cancel a duel.' });
      return;
    }

    if (duel.status !== 'open') {
      res.status(400).json({ error: 'Only open duels can be cancelled.' });
      return;
    }

    // Refund stake to challenger
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('xp')
      .eq('user_id', userId)
      .single();

    await supabaseAdmin
      .from('profiles')
      .update({ xp: (profile?.xp ?? 0) + duel.stake_xp, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    await supabaseAdmin
      .from('duels')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    res.json({ message: `Duel cancelled. ${duel.stake_xp} XP refunded.` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/duels/leaderboard ────────────────────────────────
export const getDuelLeaderboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('duel_leaderboard')
      .select('*')
      .limit(20);

    if (error) throw error;
    res.json({ leaderboard: data });
  } catch (err) {
    next(err);
  }
};

// ── HELPER: settle a completed duel ──────────────────────────
const settleDuel = async (duel: any, winnerId: string): Promise<void> => {
  const loserId = winnerId === duel.challenger_id
    ? duel.opponent_id
    : duel.challenger_id;

  // Award stake to winner (they already lost their stake, so give back both stakes)
  const { data: winnerProfile } = await supabaseAdmin
    .from('profiles')
    .select('xp')
    .eq('user_id', winnerId)
    .single();

  await supabaseAdmin
    .from('profiles')
    .update({
      xp: (winnerProfile?.xp ?? 0) + duel.stake_xp * 2, // winner gets back own stake + opponent's
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', winnerId);

  // Mark duel complete
  await supabaseAdmin
    .from('duels')
    .update({
      status: 'completed',
      winner_id: winnerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', duel.id);

  console.log(`[Duel] ${duel.id} settled. Winner: ${winnerId}, Loser: ${loserId}. XP transferred: ${duel.stake_xp}`);
};