import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { apiGetCheckpoints, apiGetProgress } from '../services/api';
import XPBar from './XPBar';
import '../styles/MapScreen.css';

interface Progress {
  checkpoint_id: string;
  status: 'locked' | 'unlocked' | 'completed';
  attempt_count: number;
}

const FINALE_START_INDEX = 8; // order_index where finale begins

const MapScreen: React.FC = () => {
  const { profile, setActiveCheckpoint, setScreen, setNarrative } = useGame() as any;
  const { signOut } = useAuth();
  const { checkpoints, setCheckpoints } = useGame();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cpRes, prRes] = await Promise.all([
          apiGetCheckpoints(),
          apiGetProgress(),
        ]);
        setCheckpoints(cpRes.data.checkpoints);
        setProgress(prRes.data.progress);
      } catch (err) {
        console.error('Failed to load map data', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getStatus = (id: string): 'locked' | 'unlocked' | 'completed' => {
    const p = progress.find((p) => p.checkpoint_id === id);
    return p?.status ?? 'locked';
  };

  const handleClick = (cp: any) => {
    const status = getStatus(cp.id);
    if (status === 'locked') return;
    setActiveCheckpoint(cp);
    setNarrative(cp.narrative_intro);
    setScreen('game');
  };

  const handleSignOut = async () => {
    await signOut();
    setScreen('title');
  };

  // Split checkpoints into main hunts (1-7) and finale (8-10)
  const mainHunts = checkpoints.filter((cp: any) => cp.order_index < FINALE_START_INDEX);
  const finaleHunts = checkpoints.filter((cp: any) => cp.order_index >= FINALE_START_INDEX);

  // Finale is accessible if all main hunts are completed OR any finale is unlocked
  const finaleUnlocked = finaleHunts.some((cp: any) => {
    const status = getStatus(cp.id);
    return status === 'unlocked' || status === 'completed';
  });

  // Stats
  const completedMain = mainHunts.filter((cp: any) => getStatus(cp.id) === 'completed').length;
  const completedFinale = finaleHunts.filter((cp: any) => getStatus(cp.id) === 'completed').length;
  const totalCompleted = completedMain + completedFinale;
  const totalCheckpoints = mainHunts.length + finaleHunts.length;

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="pixel-spinner" />
        <p className="pixel-text pixel-text--gold mt-16">Loading the Grid of Emberwood...</p>
      </div>
    );
  }

  return (
    <div className="map-screen">

      {/* HUD */}
      <div className="map-hud pixel-panel">
        <div className="map-hud-left">
          <span className="pixel-text pixel-text--gold map-username">
            ⚔ {profile?.username ?? 'INITIATE'}
          </span>
          <span className="pixel-text pixel-text--dim map-level">
            LVL {profile?.level ?? 1}
          </span>
        </div>
        <div className="map-hud-center">
          <XPBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
        </div>
        <div className="map-hud-right">
          <span className="pixel-text pixel-text--dim" style={{ fontSize: 10, marginRight: 12 }}>
            {totalCompleted}/{totalCheckpoints} RESTORED
          </span>
          <button className="pixel-btn pixel-btn--ghost map-signout" onClick={handleSignOut}>
            SIGN OUT
          </button>
        </div>
      </div>

      {/* Map title */}
      <div className="map-title-area">
        <h2 className="pixel-title map-title">EMBERWOOD MAP</h2>
        <p className="pixel-subtitle map-subtitle">Restore the Grid — Defeat the Corruption</p>
      </div>

      {/* ── MAIN HUNTS (1–7) ── */}
      <div className="map-section-label pixel-text pixel-text--dim">
        ── RESTORATION HUNTS ──
      </div>

      <div className="map-world">
        <div className="map-nodes-row">
          {mainHunts.map((cp: any, i: number) => {
            const status = getStatus(cp.id);
            const isClickable = status !== 'locked';

            return (
              <div key={cp.id} className="map-node-wrapper">
                <button
                  className={`map-node ${
                    status === 'completed'
                      ? 'map-node--completed'
                      : isClickable
                      ? 'map-node--active'
                      : 'map-node--locked'
                  }`}
                  onClick={() => isClickable && handleClick(cp)}
                  disabled={!isClickable}
                  title={cp.title}
                >
                  <span className="map-node-icon">
                    {status === 'completed' ? '✓' : status === 'locked' ? '🔒' : `${cp.order_index}`}
                  </span>
                </button>

                <div className="map-node-label">
                  <span className="pixel-text" style={{ fontSize: 10 }}>
                    <span style={{
                      color: status === 'completed'
                        ? 'var(--dragon-green)'
                        : status === 'locked'
                        ? 'var(--text-dim)'
                        : 'var(--ember-gold)'
                    }}>
                      HUNT {cp.order_index}
                    </span>
                    <br />
                    <span className="pixel-text--dim" style={{ fontSize: 9 }}>
                      {status === 'completed'
                        ? '★ RESTORED'
                        : status === 'locked'
                        ? 'LOCKED'
                        : cp.title.toUpperCase().slice(0, 12)}
                    </span>
                  </span>
                </div>

                {/* Path connector */}
                {i < mainHunts.length - 1 && <div className="map-path-segment" />}
              </div>
            );
          })}

          {/* Arrow leading to finale */}
          <div className="map-path-segment map-path-segment--to-finale" />

          {/* Dragon icon gate */}
          <div className="map-node-wrapper">
            <div className={`map-node map-node--gate ${finaleUnlocked ? 'map-node--gate-open' : 'map-node--locked'}`}
              title={finaleUnlocked ? 'The Dragon Sigil Trials — ENTER' : 'Complete all hunts to unlock'}>
              <span className="map-node-icon">🐉</span>
            </div>
            <div className="map-node-label">
              <span className="pixel-text" style={{ fontSize: 9, color: finaleUnlocked ? 'var(--ember-gold)' : 'var(--text-dim)' }}>
                {finaleUnlocked ? 'FINALE' : 'LOCKED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FINALE CHALLENGES (8–10) ── */}
      {finaleUnlocked && (
        <>
          <div className="map-section-label pixel-text pixel-text--gold" style={{ marginTop: 24 }}>
            🐉 ── THE DRAGON SIGIL TRIALS ── 🐉
          </div>
          <div className="map-finale-area">
            {finaleHunts.map((cp: any) => {
              const status = getStatus(cp.id);
              const isClickable = status !== 'locked';
              const trialNumber = cp.order_index - FINALE_START_INDEX + 1;

              return (
                <div key={cp.id} className="map-finale-node pixel-panel">
                  <div className="map-finale-node-header">
                    <span className={`map-finale-badge ${
                      status === 'completed' ? 'map-finale-badge--done' : 'map-finale-badge--active'
                    }`}>
                      {status === 'completed' ? '★' : `${trialNumber}`}
                    </span>
                    <div className="map-finale-info">
                      <span className="pixel-text pixel-text--gold" style={{ fontSize: 11 }}>
                        TRIAL {trialNumber} OF {finaleHunts.length}
                      </span>
                      <span className="pixel-text" style={{ fontSize: 13, marginTop: 4 }}>
                        {cp.title}
                      </span>
                      <span className="pixel-text pixel-text--dim" style={{ fontSize: 10, marginTop: 2 }}>
                        {status === 'completed' ? '✓ SEALED' : `${cp.xp_reward} XP`}
                      </span>
                    </div>
                  </div>

                  <button
                    className={`pixel-btn ${status === 'completed' ? 'pixel-btn--ghost' : 'pixel-btn--gold'} map-finale-btn`}
                    onClick={() => isClickable && handleClick(cp)}
                    disabled={!isClickable}
                  >
                    {status === 'completed' ? '✓ REVISIT' : '⚔ ENTER TRIAL'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Locked finale hint */}
      {!finaleUnlocked && (
        <div className="map-finale-locked pixel-panel" style={{ marginTop: 16, textAlign: 'center' }}>
          <span className="map-node-icon" style={{ fontSize: 32 }}>🐉</span>
          <p className="pixel-text pixel-text--gold" style={{ fontSize: 11, marginTop: 8 }}>
            THE DRAGON SIGIL TRIALS
          </p>
          <p className="pixel-text pixel-text--dim" style={{ fontSize: 10, marginTop: 4 }}>
            Complete all 7 Restoration Hunts to unlock the finale
          </p>
          <p className="pixel-text pixel-text--dim" style={{ fontSize: 10, marginTop: 4 }}>
            {completedMain} / 7 hunts restored
          </p>
        </div>
      )}

    </div>
  );
};

export default MapScreen;