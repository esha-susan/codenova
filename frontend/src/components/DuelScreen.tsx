import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import '../styles/DuelScreen.css';

const API = (import.meta as any).env.VITE_API_URL || '/api';

const STAKE_OPTIONS = [50, 100, 200, 500];
const POLL_INTERVAL = 3000;

interface DuelCheckpoint {
  id: string;
  order_index: number;
  title: string;
  challenge_description: string;
  starter_code: string;
  expected_output: string;
}

interface Duel {
  id: string;
  stake_xp: number;
  status: 'open' | 'active' | 'completed' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  challenger_id: string;
  opponent_id: string | null;
  winner_id: string | null;
  challenger_solved_at: string | null;
  opponent_solved_at: string | null;
  challenger_attempts: number;
  opponent_attempts: number;
  checkpoints: DuelCheckpoint;
  challenger: { username: string; avatar_id: string; xp: number; level: number };
  opponent: { username: string; avatar_id: string; xp: number; level: number } | null;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  xp: number;
  level: number;
  duel_wins: number;
  duel_total: number;
  xp_won_in_duels: number;
}

type Tab = 'board' | 'active' | 'leaderboard';

const DuelScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { profile, setProfile } = useGame() as any;
  const [tab, setTab] = useState<Tab>('board');
  const [duels, setDuels] = useState<Duel[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeDuel, setActiveDuel] = useState<Duel | null>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedStake, setSelectedStake] = useState<number>(100);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [duelResult, setDuelResult] = useState<{ won: boolean; xpChange: number; text: string } | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timerRef    = useRef<any>(null);
  const pollRef     = useRef<any>(null);
  const profileRef  = useRef(profile);
  const activeDuelRef = useRef(activeDuel);
  // Track whether code has been initialised for the current duel
  // so polling never overwrites what the user typed
  const codeInitialisedForDuelRef = useRef<string | null>(null);

  // Keep refs in sync with state (avoids stale closures in setInterval)
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { activeDuelRef.current = activeDuel; }, [activeDuel]);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('codenova_token') ?? ''}`,
  });

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchDuels = useCallback(async () => {
    try {
      const res = await fetch(`${API}/duels`, { headers: getAuthHeaders() });
      const data = await res.json();
      const allDuels: Duel[] = data.duels ?? [];
      setDuels(allDuels);

      const userId = profileRef.current?.user_id;
      const currentActiveDuel = activeDuelRef.current;

      // Find my active duel from the fresh data
      const mine = allDuels.find(
        (d) =>
          (d.challenger_id === userId || d.opponent_id === userId) &&
          d.status === 'active'
      );

      if (mine) {
        // Update duel metadata (attempt counts, solved timestamps) WITHOUT touching code
        setActiveDuel(mine);

        // Only initialise the code editor ONCE per duel — never on subsequent polls
        if (codeInitialisedForDuelRef.current !== mine.id) {
          codeInitialisedForDuelRef.current = mine.id;
          setCode(mine.checkpoints.starter_code ?? '');
          setTab('active');
        }
      } else if (currentActiveDuel && !allDuels.find(d => d.id === currentActiveDuel.id && d.status === 'active')) {
        // Active duel disappeared (completed/expired by opponent) — leave code alone,
        // just clear the active duel so the UI updates
        const finalDuel = allDuels.find(d => d.id === currentActiveDuel.id);
        if (finalDuel?.status === 'completed') {
          setActiveDuel(finalDuel);
        }
      }
    } catch (err) {
      console.error('Failed to fetch duels', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // ← no dependencies — uses refs to avoid stale closure AND avoid re-creating on every render

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API}/duels/leaderboard`, { headers: getAuthHeaders() });
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    }
  };

  // Initial load + polling — only runs once on mount
  useEffect(() => {
    fetchDuels();
    fetchLeaderboard();
    pollRef.current = setInterval(fetchDuels, POLL_INTERVAL);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [fetchDuels]);

  // Timer when duel is active
  useEffect(() => {
    if (activeDuel?.status === 'active') {
      timerRef.current = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeDuel?.status]);

  // Tab key support in the editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end   = ta.selectionEnd;
      const next  = code.substring(0, start) + '    ' + code.substring(end);
      setCode(next);
      setTimeout(() => ta.setSelectionRange(start + 4, start + 4), 0);
    }
  };

  const formatTime = (s: number) => {
    const m   = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const formatExpiry = (iso: string) => {
    const diff  = new Date(iso).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const handlePostDuel = async () => {
    if (isPosting) return;
    setIsPosting(true);
    try {
      const res = await fetch(`${API}/duels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ stake_xp: selectedStake }),
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.message || data.error, 'error'); return; }
      showMessage(data.message, 'success');
      const pRes = await fetch(`${API}/profile`, { headers: getAuthHeaders() });
      const pData = await pRes.json();
      if (pData.profile) setProfile(pData.profile);
      fetchDuels();
    } catch {
      showMessage('Failed to post duel.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleAccept = async (duelId: string) => {
    try {
      const res = await fetch(`${API}/duels/${duelId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error, 'error'); return; }

      showMessage(data.message, 'success');

      // Initialise editor for this newly accepted duel
      codeInitialisedForDuelRef.current = data.duel.id;
      setActiveDuel(data.duel);
      setCode(data.duel.checkpoints.starter_code ?? '');
      setElapsedTime(0);
      setTab('active');

      const pRes = await fetch(`${API}/profile`, { headers: getAuthHeaders() });
      const pData = await pRes.json();
      if (pData.profile) setProfile(pData.profile);
    } catch {
      showMessage('Failed to accept duel.', 'error');
    }
  };

  const handleCancel = async (duelId: string) => {
    try {
      const res = await fetch(`${API}/duels/${duelId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error, 'error'); return; }
      showMessage(data.message, 'success');
      fetchDuels();
      const pRes = await fetch(`${API}/profile`, { headers: getAuthHeaders() });
      const pData = await pRes.json();
      if (pData.profile) setProfile(pData.profile);
    } catch {
      showMessage('Failed to cancel duel.', 'error');
    }
  };

  const handleSubmitCode = async () => {
    if (!activeDuel || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/duels/${activeDuel.id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { showMessage(data.error, 'error'); return; }

      if (data.duel_complete) {
        setDuelResult({ won: data.i_won, xpChange: data.xp_change, text: data.message });
        clearInterval(pollRef.current);
        fetchDuels();
        const pRes = await fetch(`${API}/profile`, { headers: getAuthHeaders() });
        const pData = await pRes.json();
        if (pData.profile) setProfile(pData.profile);
      } else if (data.correct) {
        showMessage(data.message, 'success');
      } else {
        showMessage(data.message || 'Wrong answer. Keep trying!', 'error');
      }
    } catch {
      showMessage('Submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMyDuel      = (d: Duel) => d.challenger_id === profile?.user_id || d.opponent_id === profile?.user_id;
  const openDuels     = duels.filter((d) => d.status === 'open' && !isMyDuel(d));
  const myOpenDuel    = duels.find((d) => d.status === 'open' && d.challenger_id === profile?.user_id);
  const completedDuels = duels.filter((d) => d.status === 'completed' && isMyDuel(d));

  // ── DUEL RESULT SCREEN ───────────────────────────────────────
  if (duelResult) {
    return (
      <div className="duel-screen">
        <div className="duel-result-screen">
          <div className={`duel-result-banner ${duelResult.won ? 'duel-result-banner--win' : 'duel-result-banner--lose'}`}>
            <div className="duel-result-icon">{duelResult.won ? '🏆' : '💀'}</div>
            <h2 className="pixel-title" style={{ fontSize: 20 }}>
              {duelResult.won ? 'VICTORY!' : 'DEFEATED'}
            </h2>
            <p className="pixel-text" style={{ fontSize: 12, marginTop: 12 }}>{duelResult.text}</p>
            <div className={`duel-xp-change ${duelResult.won ? 'duel-xp-change--win' : 'duel-xp-change--lose'}`}>
              {duelResult.won ? '+' : ''}{duelResult.xpChange} XP
            </div>
            <p className="pixel-text pixel-text--dim" style={{ fontSize: 10, marginTop: 8 }}>
              New Total: {profile?.xp ?? 0} XP
            </p>
            <button
              className="pixel-btn pixel-btn--gold"
              style={{ marginTop: 24 }}
              onClick={() => {
                setDuelResult(null);
                setActiveDuel(null);
                codeInitialisedForDuelRef.current = null;
                setCode('');
                setTab('board');
                fetchDuels();
                fetchLeaderboard();
              }}
            >
              RETURN TO DUEL BOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="duel-screen">
      {/* Header */}
      <div className="duel-header pixel-panel">
        <button className="pixel-btn pixel-btn--ghost duel-back-btn" onClick={onBack}>← BACK</button>
        <div className="duel-header-center">
          <h2 className="pixel-title" style={{ fontSize: 14 }}>⚔ DUEL ARENA</h2>
          <span className="pixel-text pixel-text--dim" style={{ fontSize: 9 }}>STAKE XP · RACE TO WIN</span>
        </div>
        <div className="duel-header-xp">
          <span className="pixel-text pixel-text--gold" style={{ fontSize: 10 }}>{profile?.xp ?? 0} XP</span>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`duel-toast duel-toast--${message.type}`}>
          <span className="pixel-text" style={{ fontSize: 10 }}>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="duel-tabs">
        {(['board', 'active', 'leaderboard'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`duel-tab pixel-text ${tab === t ? 'duel-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'board'       && '📋 BOARD'}
            {t === 'active'      && `⚔ MY DUEL${activeDuel ? ' ●' : ''}`}
            {t === 'leaderboard' && '🏆 RANKINGS'}
          </button>
        ))}
      </div>

      <div className="duel-content">

        {/* ── BOARD TAB ── */}
        {tab === 'board' && (
          <div className="duel-board">
            {!myOpenDuel ? (
              <div className="duel-post-panel pixel-panel pixel-panel--gold">
                <p className="pixel-text pixel-text--gold" style={{ fontSize: 11, marginBottom: 12 }}>⚔ POST A DUEL CHALLENGE</p>
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginBottom: 16 }}>
                  Stake XP on a random challenge. First correct solution wins the pot.
                </p>
                <div className="duel-stake-options">
                  {STAKE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      className={`duel-stake-btn pixel-text ${selectedStake === s ? 'duel-stake-btn--selected' : ''}`}
                      onClick={() => setSelectedStake(s)}
                    >
                      {s} XP
                    </button>
                  ))}
                </div>
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 8, marginBottom: 12 }}>
                  Pot size: {selectedStake * 2} XP · Your balance after posting: {(profile?.xp ?? 0) - selectedStake} XP
                </p>
                <button
                  className="pixel-btn pixel-btn--gold"
                  onClick={handlePostDuel}
                  disabled={isPosting || (profile?.xp ?? 0) < selectedStake}
                  style={{ width: '100%' }}
                >
                  {isPosting ? 'POSTING...' : `⚔ POST DUEL FOR ${selectedStake} XP`}
                </button>
                {(profile?.xp ?? 0) < selectedStake && (
                  <p className="pixel-text" style={{ fontSize: 9, color: 'var(--corruption-red)', marginTop: 8 }}>
                    Insufficient XP for this stake.
                  </p>
                )}
              </div>
            ) : (
              <div className="duel-my-open pixel-panel pixel-panel--gold">
                <p className="pixel-text pixel-text--gold" style={{ fontSize: 11 }}>⏳ YOUR DUEL IS POSTED</p>
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 4 }}>
                  Stake: {myOpenDuel.stake_xp} XP · Expires in {formatExpiry(myOpenDuel.expires_at)}
                </p>
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 2 }}>
                  Challenge: {myOpenDuel.checkpoints?.title}
                </p>
                <p className="pixel-text" style={{ fontSize: 9, marginTop: 4, color: 'var(--text-dim)' }}>
                  Waiting for an opponent to accept...
                </p>
                <button
                  className="pixel-btn pixel-btn--ghost"
                  style={{ marginTop: 12, fontSize: 9 }}
                  onClick={() => handleCancel(myOpenDuel.id)}
                >
                  CANCEL & REFUND
                </button>
              </div>
            )}

            <div className="duel-list-header pixel-text pixel-text--dim">
              ── OPEN CHALLENGES ({openDuels.length}) ──
            </div>

            {isLoading ? (
              <p className="pixel-text pixel-text--dim" style={{ textAlign: 'center', padding: 24, fontSize: 10 }}>
                Loading the Arena...
              </p>
            ) : openDuels.length === 0 ? (
              <div className="duel-empty">
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 10 }}>No open challenges yet.</p>
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 4 }}>Post one above to get things started!</p>
              </div>
            ) : (
              openDuels.map((duel) => (
                <div key={duel.id} className="duel-card pixel-panel">
                  <div className="duel-card-left">
                    <span className="pixel-text pixel-text--gold" style={{ fontSize: 11 }}>⚔ {duel.challenger?.username ?? 'Unknown'}</span>
                    <span className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 2 }}>LVL {duel.challenger?.level} · {duel.challenger?.xp} XP</span>
                    <span className="pixel-text" style={{ fontSize: 9, marginTop: 6 }}>Hunt: {duel.checkpoints?.title}</span>
                    <span className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 2 }}>Expires in {formatExpiry(duel.expires_at)}</span>
                  </div>
                  <div className="duel-card-right">
                    <div className="duel-pot-badge">
                      <span className="pixel-text pixel-text--gold" style={{ fontSize: 13 }}>{duel.stake_xp * 2}</span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 8 }}>XP POT</span>
                    </div>
                    <button
                      className="pixel-btn pixel-btn--gold duel-accept-btn"
                      onClick={() => handleAccept(duel.id)}
                      disabled={(profile?.xp ?? 0) < duel.stake_xp}
                    >
                      ACCEPT
                    </button>
                    {(profile?.xp ?? 0) < duel.stake_xp && (
                      <span className="pixel-text" style={{ fontSize: 8, color: 'var(--corruption-red)', marginTop: 4 }}>
                        Need {duel.stake_xp} XP
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            {completedDuels.length > 0 && (
              <>
                <div className="duel-list-header pixel-text pixel-text--dim" style={{ marginTop: 24 }}>
                  ── RECENT RESULTS ──
                </div>
                {completedDuels.slice(0, 5).map((duel) => {
                  const iWon     = duel.winner_id === profile?.user_id;
                  const opponent = duel.challenger_id === profile?.user_id ? duel.opponent : duel.challenger;
                  return (
                    <div key={duel.id} className={`duel-result-card pixel-panel ${iWon ? 'duel-result-card--win' : 'duel-result-card--lose'}`}>
                      <span className="pixel-text" style={{ fontSize: 11 }}>
                        {iWon ? '🏆 WON' : '💀 LOST'} vs {opponent?.username ?? 'Unknown'}
                      </span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 2 }}>
                        {duel.checkpoints?.title} · {iWon ? `+${duel.stake_xp}` : `-${duel.stake_xp}`} XP
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ── ACTIVE DUEL TAB ── */}
        {tab === 'active' && (
          <div className="duel-active">
            {!activeDuel ? (
              <div className="duel-empty">
                <p className="pixel-text pixel-text--dim" style={{ fontSize: 10, textAlign: 'center' }}>
                  No active duel. Post or accept a challenge from the board.
                </p>
                <button className="pixel-btn pixel-btn--ghost" style={{ marginTop: 16 }} onClick={() => setTab('board')}>
                  GO TO BOARD
                </button>
              </div>
            ) : (
              <>
                <div className="duel-active-info pixel-panel pixel-panel--gold">
                  <div className="duel-versus">
                    <div className="duel-player">
                      <span className="pixel-text pixel-text--gold" style={{ fontSize: 10 }}>{activeDuel.challenger?.username}</span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 8 }}>
                        {activeDuel.challenger_solved_at ? '✓ SOLVED' : `${activeDuel.challenger_attempts} tries`}
                      </span>
                    </div>
                    <div className="duel-vs-badge">
                      <span className="pixel-text" style={{ fontSize: 10 }}>VS</span>
                      <span className="pixel-text pixel-text--gold" style={{ fontSize: 9 }}>⏱ {formatTime(elapsedTime)}</span>
                      <span className="pixel-text" style={{ fontSize: 9, color: 'var(--ember-gold)' }}>🏆 {activeDuel.stake_xp * 2} XP</span>
                    </div>
                    <div className="duel-player">
                      <span className="pixel-text pixel-text--gold" style={{ fontSize: 10 }}>{activeDuel.opponent?.username ?? 'Waiting...'}</span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 8 }}>
                        {activeDuel.opponent_solved_at ? '✓ SOLVED' : `${activeDuel.opponent_attempts} tries`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="duel-challenge pixel-panel">
                  <p className="pixel-text pixel-text--gold" style={{ fontSize: 10, marginBottom: 8 }}>
                    ⚔ {activeDuel.checkpoints?.title}
                  </p>
                  <pre className="duel-challenge-desc pixel-text pixel-text--dim">
                    {activeDuel.checkpoints?.challenge_description}
                  </pre>
                </div>

                <div className="duel-editor-area">
                  <textarea
                    className="pixel-code-editor duel-editor"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={handleEditorKeyDown}
                    spellCheck={false}
                    placeholder="Write your solution here..."
                  />
                  <button
                    className="pixel-btn pixel-btn--gold duel-submit-btn"
                    onClick={handleSubmitCode}
                    disabled={isSubmitting || !code.trim()}
                  >
                    {isSubmitting ? '⚡ RUNNING...' : '⚡ SUBMIT CODE'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {tab === 'leaderboard' && (
          <div className="duel-leaderboard">
            <div className="duel-list-header pixel-text pixel-text--gold">🏆 ── DUEL CHAMPIONS ── 🏆</div>
            {leaderboard.length === 0 ? (
              <p className="pixel-text pixel-text--dim" style={{ textAlign: 'center', padding: 24, fontSize: 10 }}>
                No duel results yet. Be the first to compete!
              </p>
            ) : (
              leaderboard.map((entry, i) => {
                const isMe    = entry.user_id === profile?.user_id;
                const winRate = entry.duel_total > 0 ? Math.round((entry.duel_wins / entry.duel_total) * 100) : 0;
                return (
                  <div key={entry.user_id} className={`duel-lb-row pixel-panel ${isMe ? 'duel-lb-row--me' : ''}`}>
                    <span className="duel-lb-rank pixel-text pixel-text--gold" style={{ fontSize: 14 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <div className="duel-lb-info">
                      <span className="pixel-text" style={{ fontSize: 11 }}>{entry.username} {isMe ? '(YOU)' : ''}</span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 2 }}>LVL {entry.level} · {entry.xp} XP</span>
                    </div>
                    <div className="duel-lb-stats">
                      <span className="pixel-text pixel-text--gold" style={{ fontSize: 11 }}>
                        {entry.duel_wins}W / {entry.duel_total - entry.duel_wins}L
                      </span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 9, marginTop: 2 }}>
                        {winRate}% win · +{entry.xp_won_in_duels} XP earned
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DuelScreen;