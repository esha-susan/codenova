import React, { useEffect, useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';

// ── Adjust this path to match your folder structure ──
// If this file is in src/screens/ and CSS is in src/styles/: '../styles/TitleScreen.css'
// If both files are in the same folder:                       './TitleScreen.css'
import '../styles/TitleScreen.css';

/* ── Seeded RNG — stable across renders, no hydration mismatch ── */
const sr = (s: number) => { const x = Math.sin(s + 1) * 10000; return x - Math.floor(x); };

const buildStars = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const r = (o: number) => sr(i * 7 + o);
    return {
      id: i,
      left: `${r(1) * 100}%`,
      top:  `${r(2) * 100}%`,
      size: r(0) > .84 ? '4px' : r(3) > .5 ? '3px' : '2px',
      op:   `${.3 + r(6) * .7}`,
      td:   `${2.5 + r(4) * 3.5}s`,
      dl:   `${r(5) * 5}s`,
    };
  });

const PCOLS = ['#f0c040', '#ff6b2b', '#00e5ff', '#c084fc', '#ffe566'];
const buildParticles = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const r = (o: number) => sr(i * 11 + o + 200);
    const col = PCOLS[Math.floor(r(4) * PCOLS.length)];
    return {
      id:  i,
      left:`${r(0) * 100}%`,
      col,
      pd:  `${6 + r(1) * 9}s`,
      pdl: `${r(2) * 14}s`,
      px:  `${(r(3) - .5) * 80}px`,
    };
  });

const TitleScreen: React.FC = () => {
  const { setScreen } = useGame();
  const [pressVisible, setPressVisible] = useState(true);

  const stars     = useMemo(() => buildStars(75), []);
  const particles = useMemo(() => buildParticles(22), []);

  /* Asymmetric slow blink — visible 1050 ms, hidden 400 ms */
  useEffect(() => {
    let v = true;
    let id: ReturnType<typeof setTimeout>;
    const blink = () => {
      v = !v;
      setPressVisible(v);
      id = setTimeout(blink, v ? 1050 : 400);
    };
    id = setTimeout(blink, 1050);
    return () => clearTimeout(id);
  }, []);

  /* Keyboard shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') setScreen('auth');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setScreen]);

  return (
    <div className="ts">

      {/* ── BG ── */}
      <div className="ts-aurora" aria-hidden="true">
        <div className="ts-ab" />
        <div className="ts-ab" />
        <div className="ts-ab" />
      </div>
      <div className="ts-grid"     aria-hidden="true" />
      <div className="ts-scanlines" aria-hidden="true" />
      <div className="ts-vignette"  aria-hidden="true" />

      {/* ── STARS ── */}
      <div className="ts-stars" aria-hidden="true">
        {stars.map(s => (
          <div
            key={s.id}
            className="ts-star"
            style={{
              left: s.left, top: s.top, width: s.size, height: s.size,
              opacity: s.op,
              '--td': s.td, '--dl': s.dl, '--op': s.op,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── PARTICLES ── */}
      <div aria-hidden="true">
        {particles.map(p => (
          <div
            key={p.id}
            className="ts-particle"
            style={{
              left: p.left,
              background: p.col,
              boxShadow: `0 0 6px ${p.col}`,
              '--pd': p.pd, '--pdl': p.pdl, '--px': p.px,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* ── DRAGONS ── */}
      <div className="ts-dragon"   aria-hidden="true">🐉</div>
      <div className="ts-dragon-2" aria-hidden="true">🐉</div>

      {/* ══════════ CONTENT ══════════ */}
      <div className="ts-content">

        {/* Header */}
        <div className="ts-header ta d1">
          <em>[</em>&nbsp;CODE NOVA&nbsp;<em>]</em>
        </div>

        {/* Pixel title */}
        <div className="ts-logo-wrap ta d2">
          <h1 className="ts-title" data-text="HERCODE ODYSSEY">
            HERCODE<br />ODYSSEY
          </h1>
          <div className="ts-subtitle">AN INITIATE'S JOURNEY</div>
        </div>

        {/* Underline */}
        <div className="ts-px-line ta d3" aria-hidden="true" />

        {/* Divider */}
        <div className="ts-divider ta d3" aria-hidden="true">
          <span className="ts-div-line">══════</span>
          <span className="ts-gem">◆</span>
          <span className="ts-div-line">══════</span>
        </div>

        {/* Tagline */}
        <p className="ts-tagline ta d4">
          Where logic shapes reality.<br />
          Where dragons guard the laws of structure.
        </p>

        {/* CTA */}
        <div className="ts-cta-wrap ta d5">
          <div
            className="ts-press"
            aria-live="polite"
            style={{ opacity: pressVisible ? 1 : 0 }}
          >
            ◀ PRESS START TO ENTER THE GRID ▶
          </div>

          <div className="ts-btn-wrap">
            <div className="ts-btn-glow" aria-hidden="true" />
            <button
              className="ts-btn"
              onClick={() => setScreen('auth')}
              aria-label="Begin your journey"
            >
              ⚔&nbsp; BEGIN YOUR JOURNEY &nbsp;⚔
            </button>
          </div>
        </div>

        {/* Lore */}
        <div className="ts-lore ta d6">
          <p>
            The Corruption spreads. Runes fracture. The Academy calls for Initiates
            who can restore the broken Grid of Emberwood through the power of code.
          </p>
          <p>Only those who master both creation and correction may earn the Dragon Sigil.</p>
        </div>

      </div>

      {/* Footer */}
      <footer className="ts-footer ta d7">
        INSPIRED BY ADA LOVELACE &nbsp;·&nbsp; DESIGNED FOR WOMEN IN TECH
      </footer>

    </div>
  );
};

export default TitleScreen;