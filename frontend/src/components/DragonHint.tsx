import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/DragonHint.css';

export interface HintData {
  hint: string;
  escalation_level: 1 | 2 | 3;
  dragon_message: string;
}

interface DragonHintProps {
  onRequestHint: () => Promise<HintData | null>;
  isFetching: boolean;
  attemptCount: number;
  onClose: () => void;
  visible: boolean;
}

/* ── Typewriter hook ── */
const useTypewriter = (text: string, speed = 18, active = false) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active || !text) {
      setDisplayed('');
      setDone(false);
      indexRef.current = 0;
      return;
    }
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;

    const tick = () => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current < text.length) {
        timerRef.current = setTimeout(tick, speed);
      } else {
        setDone(true);
      }
    };
    timerRef.current = setTimeout(tick, 120);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, active, speed]);

  const skip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayed(text);
    setDone(true);
  }, [text]);

  return { displayed, done, skip };
};

/* ── Level config ── */
const LEVEL_CONFIG = {
  1: {
    label: 'WHISPER',
    tagline: 'She speaks in riddles and metaphor',
    border: '#3a6a8a',
    glow: 'rgba(58,106,138,0.45)',
    accent: '#7ab8d8',
    accentDim: 'rgba(122,184,216,0.15)',
    badge: '#0a1a28',
    badgeBorder: '#3a6a8a',
    headerBg: 'linear-gradient(135deg, #080e14 0%, #0d1e2c 100%)',
    bodyBg: '#06090d',
    icon: '💧',
    pips: [true, false, false],
    idleDesc: 'She will speak in cryptic verse — metaphor for the uncertain path.',
  },
  2: {
    label: 'GUIDANCE',
    tagline: 'Her words grow clearer, her gaze more focused',
    border: '#b08020',
    glow: 'rgba(176,128,32,0.45)',
    accent: '#f0c040',
    accentDim: 'rgba(240,192,64,0.12)',
    badge: '#1a0e00',
    badgeBorder: '#b08020',
    headerBg: 'linear-gradient(135deg, #130a00 0%, #1e1000 100%)',
    bodyBg: '#0c0800',
    icon: '🔥',
    pips: [true, true, false],
    idleDesc: 'She senses your struggle — a clearer light upon your path.',
  },
  3: {
    label: 'REVELATION',
    tagline: 'The ancient truth, laid bare',
    border: '#a03030',
    glow: 'rgba(160,48,48,0.55)',
    accent: '#ff7070',
    accentDim: 'rgba(255,112,112,0.12)',
    badge: '#180404',
    badgeBorder: '#a03030',
    headerBg: 'linear-gradient(135deg, #120202 0%, #1c0404 100%)',
    bodyBg: '#0a0202',
    icon: '⚡',
    pips: [true, true, true],
    idleDesc: 'The Corruption advances. She will guide you with full urgency.',
  },
} as const;

const getPreviewLevel = (attempts: number): 1 | 2 | 3 => {
  if (attempts >= 5) return 3;
  if (attempts >= 3) return 2;
  return 1;
};

/* ═══════════════════════════════
   MAIN COMPONENT
═══════════════════════════════ */
const DragonHint: React.FC<DragonHintProps> = ({
  onRequestHint, isFetching, attemptCount, onClose, visible,
}) => {
  const [hint, setHint] = useState<HintData | null>(null);
  const [isTypingActive, setIsTypingActive] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [summoning, setSummoning] = useState(false);

  const previewLevel = getPreviewLevel(attemptCount);
  const activeLevel = hint?.escalation_level ?? previewLevel;
  const cfg = LEVEL_CONFIG[activeLevel];

  /* Entrance/exit animation */
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setPanelVisible(true), 30);
      return () => clearTimeout(t);
    } else {
      setPanelVisible(false);
      const t = setTimeout(() => {
        setHint(null);
        setIsTypingActive(false);
        setSummoning(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const { displayed, done, skip } = useTypewriter(hint?.hint ?? '', 18, isTypingActive);

  const handleRequest = async () => {
    if (isFetching || summoning) return;
    setSummoning(true);
    setIsTypingActive(false);
    setHint(null);
    const result = await onRequestHint();
    if (result) {
      setHint(result);
      setIsTypingActive(true);
    }
    setSummoning(false);
  };

  if (!visible) return null;

  const isBusy = isFetching || summoning;
  const showIdle = !isBusy && !hint;
  const showSummoning = isBusy;
  const showHint = !isBusy && !!hint;

  return (
    <div
      className="dh-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`dh-panel ${panelVisible ? 'dh-panel--visible' : ''}`}
        style={{
          '--dh-border':     cfg.border,
          '--dh-glow':       cfg.glow,
          '--dh-accent':     cfg.accent,
          '--dh-accent-dim': cfg.accentDim,
          '--dh-header-bg':  cfg.headerBg,
          '--dh-body-bg':    cfg.bodyBg,
        } as React.CSSProperties}
      >
        {/* ── Corner ornaments ── */}
        <div className="dh-corner dh-corner--tl" />
        <div className="dh-corner dh-corner--tr" />
        <div className="dh-corner dh-corner--bl" />
        <div className="dh-corner dh-corner--br" />

        {/* ── Top shimmer ── */}
        <div className="dh-top-shimmer" />

        {/* ════════ HEADER ════════ */}
        <div className="dh-header">
          <div className="dh-header-left">
            <div className="dh-dragon-avatar">
              <span className="dh-dragon-emoji">🐉</span>
              {isBusy && <div className="dh-avatar-ring" />}
            </div>
            <div className="dh-titles">
              <span className="dh-name">DRAGON MOTHER</span>
              <span className="dh-oracle">Oracle of Emberwood · Ada's Heir</span>
            </div>
          </div>

          <div className="dh-header-right">
            <div className="dh-depth-meter">
              <span className="dh-depth-label">DEPTH</span>
              <div className="dh-pips">
                {cfg.pips.map((lit, i) => (
                  <div key={i} className={`dh-pip ${lit ? 'dh-pip--on' : 'dh-pip--off'}`} />
                ))}
              </div>
              <span
                className="dh-level-tag"
                style={{ background: cfg.badge, borderColor: cfg.badgeBorder, color: cfg.accent }}
              >
                {cfg.label}
              </span>
            </div>
            <button className="dh-x" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="dh-rule" />

        {/* ════════ BODY ════════ */}
        <div className="dh-body">

          {/* STATE: Idle */}
          {showIdle && (
            <div className="dh-idle">
              <div className="dh-idle-rune">
                <span>{cfg.icon}</span>
                <div className="dh-idle-rune-ring" />
              </div>
              <p className="dh-idle-heading">Seek counsel from the Dragon Mother?</p>
              <p className="dh-idle-desc">{cfg.idleDesc}</p>
              <div className="dh-idle-meta">
                <span className="dh-meta-chip">Attempt #{attemptCount}</span>
                <span className="dh-meta-sep">·</span>
                <span className="dh-meta-chip" style={{ color: cfg.accent, borderColor: cfg.badgeBorder }}>
                  {cfg.tagline}
                </span>
              </div>
            </div>
          )}

          {/* STATE: Summoning */}
          {showSummoning && (
            <div className="dh-summoning">
              <div className="dh-orb">
                <div className="dh-orb-ring dh-orb-ring--1" />
                <div className="dh-orb-ring dh-orb-ring--2" />
                <div className="dh-orb-ring dh-orb-ring--3" />
                <span className="dh-orb-emoji">🐉</span>
              </div>
              <p className="dh-summon-line">
                {activeLevel === 1 && 'The Dragon Mother stirs from ancient slumber…'}
                {activeLevel === 2 && 'The Dragon Mother opens her ancient eyes…'}
                {activeLevel === 3 && 'The Dragon Mother rises — the Corruption is near…'}
              </p>
              <div className="dh-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* STATE: Hint revealed */}
          {showHint && hint && (
            <div className="dh-hint">
              {/* Dragon message */}
              <div className="dh-dragon-msg">
                <span className="dh-msg-icon">{cfg.icon}</span>
                <span className="dh-msg-text">{hint.dragon_message}</span>
              </div>

              {/* Parchment scroll */}
              <div className="dh-scroll">
                <div className="dh-scroll-tl" /><div className="dh-scroll-tr" />
                <div className="dh-scroll-body">
                  <p className="dh-hint-text">
                    {displayed}
                    {!done && <span className="dh-cursor">▌</span>}
                  </p>
                </div>
                <div className="dh-scroll-bl" /><div className="dh-scroll-br" />
              </div>

              {/* Sub-actions */}
              <div className="dh-hint-sub">
                {!done && (
                  <button className="dh-ghost-btn" onClick={skip}>
                    ▶▶ REVEAL ALL
                  </button>
                )}
                {done && activeLevel < 3 && (
                  <button className="dh-ghost-btn" onClick={handleRequest}>
                    🐉 SEEK DEEPER COUNSEL
                  </button>
                )}
                {done && activeLevel === 3 && (
                  <span className="dh-max-note">⚡ Maximum revelation — trust your instincts, Initiate</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ════════ FOOTER ════════ */}
        <div className="dh-rule" />
        <div className="dh-footer">
          {showIdle && (
            <button className="dh-summon-btn" onClick={handleRequest}>
              <span>🐉</span>
              SUMMON THE DRAGON MOTHER
            </button>
          )}
          {showSummoning && (
            <div className="dh-loading-track">
              <div className="dh-loading-fill" />
            </div>
          )}
          {showHint && done && (
            <button className="dh-return-btn" onClick={onClose}>
              ✓ RETURN TO THE GRID
            </button>
          )}
          {showHint && !done && (
            <div className="dh-footer-note">📜 The Dragon Mother is speaking…</div>
          )}
        </div>

        {/* Bottom shimmer */}
        <div className="dh-bottom-shimmer" />
      </div>
    </div>
  );
};

export default DragonHint;