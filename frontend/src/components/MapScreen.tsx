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
  checkpoints: {
    id: string;
    order_index: number;
    title: string;
    xp_reward: number;
    is_active: boolean;
    narrative_intro: string;
    challenge_description: string;
    starter_code: string;
  };
}

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
  }, [setCheckpoints]);

  const getCheckpointStatus = (id: string): 'locked' | 'unlocked' | 'completed' => {
    const p = progress.find((p) => p.checkpoint_id === id);
    return p?.status ?? 'locked';
  };

  const handleCheckpointClick = (cp: any) => {
    const status = getCheckpointStatus(cp.id);
    if (status === 'locked') return;
    setActiveCheckpoint(cp);
    setNarrative(cp.narrative_intro);
    setScreen('game');
  };

  const handleSignOut = async () => {
    await signOut();
    setScreen('title');
  };

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
          <button className="pixel-btn pixel-btn--ghost map-signout" onClick={handleSignOut}>
            SIGN OUT
          </button>
        </div>
      </div>

      <div className="map-title-area">
        <h2 className="pixel-title map-title">EMBERWOOD MAP</h2>
        <p className="pixel-subtitle map-subtitle">Navigate the Restoration Hunts</p>
      </div>

      <div className="map-world">
        <div className="map-path-bg" />

        <div className="map-nodes-row">
          {Array.from({ length: 7 }, (_, i) => {
            const cp = checkpoints[i] ?? null;
            const status = cp ? getCheckpointStatus(cp.id) : 'locked';
            const isActive = cp?.is_active && status !== 'locked';
            const nodeIndex = i + 1;

            return (
              <div key={i} className="map-node-wrapper">
                <button
                  /* FIXED: Changed to backticks (`) for dynamic class string */
                  className={`map-node ${
                    status === 'completed'
                      ? 'map-node--completed'
                      : isActive
                      ? 'map-node--active'
                      : 'map-node--locked'
                  }`}
                  onClick={() => cp && handleCheckpointClick(cp)}
                  disabled={!cp || status === 'locked'}
                  /* FIXED: Changed to backticks for dynamic title string */
                  title={cp ? cp.title : `Hunt ${nodeIndex} — Locked`}
                >
                  <span className="map-node-icon">
                    {/* FIXED: Changed to backticks for nodeIndex display */}
                    {status === 'completed' ? '✓' : status === 'locked' ? '🔒' : `${nodeIndex}`}
                  </span>
                </button>

                <div className="map-node-label">
                  <span className="pixel-text" style={{ fontSize: 10 }}>
                    {cp ? (
                      <>
                        <span style={{ color: status === 'completed' ? 'var(--dragon-green)' : status === 'locked' ? 'var(--text-dim)' : 'var(--ember-gold)' }}>
                          HUNT {nodeIndex}
                        </span>
                        <br />
                        <span className="pixel-text--dim" style={{ fontSize: 9 }}>
                          {status === 'completed' ? '★ RESTORED' : status === 'locked' ? 'LOCKED' : cp.title.toUpperCase().slice(0, 12)}
                        </span>
                      </>
                    ) : (
                      <span className="pixel-text--dim">HUNT {nodeIndex}</span>
                    )}
                  </span>
                </div>

                {i < 6 && <div className="map-path-segment" />}
              </div>
            );
          })}

          <div className="map-node-wrapper">
            <button className="map-node map-node--locked map-node--finale" disabled title="The Dragon's Academy — Complete all hunts">
              <span className="map-node-icon">🐉</span>
            </button>
            <div className="map-node-label">
              <span className="pixel-text pixel-text--dim" style={{ fontSize: 9 }}>THE ACADEMY</span>
            </div>
          </div>
        </div>
      </div>

      {checkpoints.length > 0 && (
        <div className="map-preview pixel-panel pixel-panel--gold">
          <p className="pixel-text pixel-text--gold" style={{ fontSize: 10, marginBottom: 8 }}>
            ▶ CURRENT MISSION
          </p>
          <p className="pixel-text" style={{ fontSize: 14 }}>
            {checkpoints[0].narrative_intro.slice(0, 120)}...
          </p>
          <button
            className="pixel-btn pixel-btn--green"
            onClick={() => handleCheckpointClick(checkpoints[0])}
            style={{ marginTop: 12 }}
          >
            ⚔ ENTER HUNT 1
          </button>
        </div>
      )}
    </div>
  );
};

export default MapScreen;