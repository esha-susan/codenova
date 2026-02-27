import React, { useEffect, useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { apiGetCheckpoints, apiGetProgress } from '../services/api';
import XPBar from './XPBar';
import DuelScreen from './DuelScreen';
import '../styles/MapScreen.css';

interface Progress {
  checkpoint_id: string;
  status: 'locked' | 'unlocked' | 'completed';
  attempt_count: number;
}

const FINALE_START_INDEX = 8;

/* ── Seeded RNG for stable firefly positions ── */
const sr = (s: number) => { const x = Math.sin(s + 1) * 10000; return x - Math.floor(x); };
const fireflies = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left:  `${sr(i * 7 + 1) * 90 + 5}%`,
  top:   `${sr(i * 7 + 2) * 70 + 10}%`,
  dur:   `${7 + sr(i * 7 + 3) * 8}s`,
  del:   `${sr(i * 7 + 4) * 10}s`,
  fx:    `${(sr(i * 7 + 5) - .5) * 80}px`,
  fy:    `${-20 - sr(i * 7 + 6) * 50}px`,
  fx2:   `${(sr(i * 7 + 7) - .5) * 120}px`,
  fy2:   `${-40 - sr(i * 7 + 8) * 80}px`,
  color: ['#f0c040','#ffe566','#80ff88','#ff8844'][Math.floor(sr(i * 7 + 9) * 4)],
}));

/* ══════════════════════════════════
   CASTLE NODE COMPONENT
══════════════════════════════════ */
interface CastleProps {
  status: 'locked' | 'unlocked' | 'completed';
  number: number;
}
const CastleNode: React.FC<CastleProps> = ({ status, number }) => (
  <div className="castle">
    {/* Battlements */}
    <div className="castle-top">
      <div className="castle-merlon" />
      <div className="castle-gap" />
      <div className="castle-merlon" />
      <div className="castle-gap" />
      <div className="castle-merlon" />
      <div className="castle-gap" />
      <div className="castle-merlon" />
    </div>

    {/* Tower body */}
    <div className="castle-body">
      <div className="castle-window">
        <div className="castle-window-light" />
      </div>
      {status === 'completed' && <span className="castle-check">✓</span>}
      {status === 'locked'    && <span className="castle-lock">🔒</span>}
      {status === 'unlocked'  && <span className="castle-number">{number}</span>}
    </div>

    {/* Gate base */}
    <div className="castle-base">
      <div className="castle-gate" />
    </div>
  </div>
);

/* ══════════════════════════════════
   DRAGON GATE COMPONENT
══════════════════════════════════ */
const DragonGate: React.FC<{ open: boolean }> = ({ open }) => (
  <div className="dragon-gate">
    <div className="gate-towers">
      {/* Left tower */}
      <div className="gate-tower">
        <div className="gate-tower-top">
          <div className="gate-merlon" />
          <div className="gate-merlon" />
          <div className="gate-merlon" />
        </div>
        <div className="gate-tower-body">
          <div className="gate-tower-window" />
        </div>
      </div>

      {/* Arch between towers */}
      <div style={{ position: 'relative', width: 32, height: 60, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="gate-arch">
          <span style={{ fontSize: 20 }}>🐉</span>
        </div>
      </div>

      {/* Right tower */}
      <div className="gate-tower">
        <div className="gate-tower-top">
          <div className="gate-merlon" />
          <div className="gate-merlon" />
          <div className="gate-merlon" />
        </div>
        <div className="gate-tower-body">
          <div className="gate-tower-window" />
        </div>
      </div>
    </div>

    {/* Base */}
    <div className="gate-base" style={{ position: 'relative' }}>
      <div className="gate-base-gap" />
    </div>
  </div>
);

/* ══════════════════════════════════
   PATH ARROW CONNECTOR COMPONENT
   Rendered as a sibling in the row — NOT inside a node-wrapper
══════════════════════════════════ */
const PathArrow: React.FC<{ golden?: boolean }> = ({ golden }) => (
  <div className={`map-path-arrow${golden ? ' map-path-arrow--golden' : ''}`} aria-hidden="true">
    <div className="map-path-arrow-line" />
    <div className="map-path-arrow-chevrons">
      <span>›</span>
      <span>›</span>
      <span>›</span>
    </div>
  </div>
);

/* ══════════════════════════════════
   MAIN SCREEN
══════════════════════════════════ */
const MapScreen: React.FC = () => {
  const { profile, setActiveCheckpoint, setScreen, setNarrative } = useGame() as any;
  const { signOut } = useAuth();
  const { checkpoints, setCheckpoints } = useGame();
  const [progress, setProgress]   = useState<Progress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDuels, setShowDuels] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [cpRes, prRes] = await Promise.all([apiGetCheckpoints(), apiGetProgress()]);
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
    const p = progress.find(p => p.checkpoint_id === id);
    return p?.status ?? 'locked';
  };

  const handleClick = (cp: any) => {
    const status = getStatus(cp.id);
    if (status === 'locked') return;
    setActiveCheckpoint(cp);
    setNarrative(cp.narrative_intro);
    setScreen('game');
  };

  const handleSignOut = async () => { await signOut(); setScreen('title'); };

  const mainHunts   = checkpoints.filter((cp: any) => cp.order_index < FINALE_START_INDEX);
  const finaleHunts = checkpoints.filter((cp: any) => cp.order_index >= FINALE_START_INDEX);

  const finaleUnlocked = finaleHunts.some((cp: any) => {
    const s = getStatus(cp.id);
    return s === 'unlocked' || s === 'completed';
  });

  const completedMain   = mainHunts.filter((cp: any) => getStatus(cp.id) === 'completed').length;
  const completedFinale = finaleHunts.filter((cp: any) => getStatus(cp.id) === 'completed').length;
  const totalCompleted  = completedMain + completedFinale;
  const totalCheckpoints = mainHunts.length + finaleHunts.length;
  const mainProgress = mainHunts.length > 0 ? (completedMain / mainHunts.length) * 100 : 0;

  if (showDuels) return <DuelScreen onBack={() => setShowDuels(false)} />;

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="pixel-spinner" />
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f0c040', marginTop: 16, letterSpacing: 2 }}>
          LOADING THE GRID...
        </p>
      </div>
    );
  }

  return (
    <div className="map-screen">

      {/* ── ATMOSPHERE ── */}
      <div className="map-mist" aria-hidden="true" />
      {fireflies.map(f => (
        <div
          key={f.id}
          className="map-firefly"
          aria-hidden="true"
          style={{
            left: f.left, top: f.top,
            background: f.color,
            boxShadow: `0 0 6px ${f.color}`,
            '--ff-dur': f.dur, '--ff-del': f.del,
            '--ff-x':   f.fx,  '--ff-y':   f.fy,
            '--ff-x2':  f.fx2, '--ff-y2':  f.fy2,
          } as React.CSSProperties}
        />
      ))}

      {/* ── HUD ── */}
      <div className="map-hud">
        <div className="map-hud-left">
          <span className="map-username">⚔ {profile?.username ?? 'INITIATE'}</span>
          <span className="map-level">LVL {profile?.level ?? 1}</span>
        </div>
        <div className="map-hud-center">
          <XPBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
        </div>
        <div className="map-hud-right">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#6a5a4a', marginRight: 4 }}>
            {totalCompleted}/{totalCheckpoints}
          </span>
          <button className="pixel-btn pixel-btn--gold map-duel-btn" onClick={() => setShowDuels(true)}>
            ⚔ DUEL
          </button>
          <button className="pixel-btn pixel-btn--ghost map-signout" onClick={handleSignOut}>
            SIGN OUT
          </button>
        </div>
      </div>

      {/* ── MAP TITLE ── */}
      <div className="map-title-area">
        <h2 className="map-title">EMBERWOOD MAP</h2>
        <p className="map-subtitle">Restore the Grid — Defeat the Corruption</p>
      </div>

      {/* ── RESTORATION HUNTS ── */}
      <div className="map-section-label">── RESTORATION HUNTS ──</div>

      <div className="map-world">
        {/* Background hills */}
        <div className="map-hills" aria-hidden="true">
          <div className="map-hill map-hill-1" />
          <div className="map-hill map-hill-2" />
          <div className="map-hill map-hill-3" />
          <div className="map-hill map-hill-4" />
        </div>

        {/* ── NODE ROW
            Structure: [wrapper] [arrow] [wrapper] [arrow] ... [wrapper] [golden-arrow] [gate-wrapper]
            Path arrows are ROW-LEVEL siblings — NOT inside wrappers — so they sit
            horizontally between castles without affecting castle vertical alignment.
        ── */}
        <div className="map-nodes-row">
          {mainHunts.map((cp: any, i: number) => {
            const status = getStatus(cp.id);
            const isClickable = status !== 'locked';
            const statusLabel = status === 'completed' ? '★ RESTORED' : status === 'locked' ? 'LOCKED' : cp.title.toUpperCase().slice(0, 10);
            const labelColor  = status === 'completed' ? '#4ade80' : status === 'locked' ? '#3a3228' : '#f0c040';

            return (
              <React.Fragment key={cp.id}>
                {/* Castle node + label — standalone column, no path inside */}
                <div className="map-node-wrapper">
                  <button
                    className={`map-node ${
                      status === 'completed' ? 'map-node--completed' :
                      isClickable           ? 'map-node--active'    : 'map-node--locked'
                    }`}
                    onClick={() => isClickable && handleClick(cp)}
                    disabled={!isClickable}
                    title={cp.title}
                    aria-label={`Hunt ${cp.order_index}: ${cp.title} — ${status}`}
                  >
                    <CastleNode status={status} number={cp.order_index} />
                  </button>

                  <div className="map-node-label">
                    <span className="map-node-label-title" style={{ color: labelColor }}>
                      HUNT {cp.order_index}
                    </span>
                    <span className="map-node-label-sub">{statusLabel}</span>
                  </div>
                </div>

                {/* Arrow connector — row sibling, not inside wrapper */}
                {i < mainHunts.length - 1 && (
                  <PathArrow />
                )}
              </React.Fragment>
            );
          })}

          {/* Golden arrow to Dragon Gate */}
          <PathArrow golden />

          {/* Dragon Gate wrapper */}
          <div className="map-node-wrapper">
            <div
              className={`map-node ${finaleUnlocked ? 'map-node--gate-open' : 'map-node--gate'}`}
              title={finaleUnlocked ? 'The Dragon Sigil Trials' : 'Complete all hunts to unlock'}
              aria-label={finaleUnlocked ? 'Dragon Gate — OPEN' : 'Dragon Gate — LOCKED'}
            >
              <DragonGate open={finaleUnlocked} />
            </div>
            <div className="map-node-label">
              <span className="map-node-label-title" style={{ color: finaleUnlocked ? '#f0c040' : '#3a3228' }}>
                {finaleUnlocked ? 'FINALE' : 'LOCKED'}
              </span>
              <span className="map-node-label-sub">DRAGON GATE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FINALE TRIALS ── */}
      {finaleUnlocked ? (
        <>
          <div className="map-section-label gold" style={{ marginTop: 24 }}>
            🐉 ── THE DRAGON SIGIL TRIALS ── 🐉
          </div>
          <div className="map-finale-area">
            {finaleHunts.map((cp: any) => {
              const status = getStatus(cp.id);
              const isClickable = status !== 'locked';
              const trialNumber = cp.order_index - FINALE_START_INDEX + 1;
              return (
                <div key={cp.id} className="map-finale-node">
                  <div className="map-finale-node-inner">
                    <div className="map-finale-node-header">
                      <div className={`map-finale-badge ${status === 'completed' ? 'map-finale-badge--done' : ''}`}>
                        {status === 'completed' ? '★' : trialNumber}
                      </div>
                      <div className="map-finale-info">
                        <span className="map-finale-trial-num">
                          TRIAL {trialNumber} OF {finaleHunts.length}
                        </span>
                        <span className="map-finale-title">{cp.title}</span>
                        <span className={`map-finale-xp ${status === 'completed' ? 'done' : ''}`}>
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
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="map-finale-locked" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ fontSize: 36 }}>🐉</div>
          <p className="map-finale-locked-title">THE DRAGON SIGIL TRIALS</p>
          <p className="map-finale-locked-sub">
            Complete all {mainHunts.length} Restoration Hunts<br />to unlock the Dragon Gate
          </p>
          <div className="map-finale-progress-bar">
            <div className="map-finale-progress-fill" style={{ width: `${mainProgress}%` }} />
          </div>
          <p className="map-finale-locked-sub" style={{ marginTop: 8 }}>
            {completedMain} / {mainHunts.length} hunts restored
          </p>
        </div>
      )}
    </div>
  );
};

export default MapScreen;