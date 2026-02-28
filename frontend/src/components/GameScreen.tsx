import React, { useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { apiSubmitCode, apiRequestHint } from '../services/api';
import PhaserGame from './PhaserGame';
import XPBar from './XPBar';
import DragonHint, { HintData } from './DragonHint';
import '../styles/GameScreen.css';

const GameScreen: React.FC = () => {
  const {
    profile, activeCheckpoint, narrativeText,
    setScreen, setNarrative, updateXP, showAchievement,
  } = useGame();

  const [code, setCode] = useState(activeCheckpoint?.starter_code ?? '# Write your Python code here\n');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [isFetchingHint, setIsFetchingHint] = useState(false);
  const [resultStatus, setResultStatus]     = useState<'none' | 'success' | 'failure' | 'error'>('none');
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [triggerFailure, setTriggerFailure] = useState(false);
  const [errorOutput, setErrorOutput]       = useState('');
  const [isCompleted, setIsCompleted]       = useState(false);
  const [attemptCount, setAttemptCount]     = useState(0);

  /* DragonHint modal state */
  const [hintOpen, setHintOpen] = useState(false);

  /* ── Submit handler ── */
  const handleSubmit = useCallback(async () => {
    if (!activeCheckpoint || isSubmitting) return;
    setIsSubmitting(true);
    setResultStatus('none');
    setErrorOutput('');

    try {
      const { data } = await apiSubmitCode(activeCheckpoint.id, code);

      setNarrative(data.narrative_response);
      updateXP(data.updated_xp);

      if (data.success) {
        setResultStatus('success');
        setTriggerSuccess(true);
        setTimeout(() => setTriggerSuccess(false), 100);
        setIsCompleted(true);
        if (data.achievement) showAchievement(data.achievement);
      } else {
        setAttemptCount(c => c + 1);
        setResultStatus(data.sfx_trigger === 'error' ? 'error' : 'failure');
        setTriggerFailure(true);
        setTimeout(() => setTriggerFailure(false), 100);
        // Capture the raw error output so the hint AI can reference it specifically
        if (data.error_type === 'syntax' || data.error_type === 'runtime' || data.error_type === 'timeout') {
          setErrorOutput(data.error_output ?? data.narrative_response);
        }
      }
    } catch {
      setNarrative('A rift in the Grid disrupted your submission. Please try again.');
      setResultStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeCheckpoint, code, isSubmitting]);

  /* ── Hint request (called by DragonHint component) ── */
  const handleRequestHint = useCallback(async (): Promise<HintData | null> => {
    if (!activeCheckpoint) return null;
    setIsFetchingHint(true);
    try {
      const { data } = await apiRequestHint(
        activeCheckpoint.id,
        code,
        errorOutput,
        attemptCount,
        // Full challenge context → AI gives specific, not generic hints
        activeCheckpoint.challenge_description
      );
      return data as HintData;
    } catch {
      return {
        hint: 'The Dragon Mother is momentarily occupied. Try submitting your code first.',
        escalation_level: 1,
        dragon_message: '🐉 The Dragon Mother stirs from slumber…',
      };
    } finally {
      setIsFetchingHint(false);
    }
  }, [activeCheckpoint, code, errorOutput, attemptCount]);

  /* ── Tab key in editor ── */
  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  if (!activeCheckpoint) {
    return (
      <div className="game-screen flex-center">
        <p className="pixel-text pixel-text--red">No checkpoint selected. Return to the map.</p>
        <button className="pixel-btn" onClick={() => setScreen('map')}>← MAP</button>
      </div>
    );
  }

  return (
    <div className="game-screen">

      {/* ── TOP HUD ── */}
      <div className="game-hud pixel-panel">
        <button className="pixel-btn pixel-btn--ghost game-back-btn" onClick={() => setScreen('map')}>
          ← MAP
        </button>
        <div className="game-hud-info">
          <span className="pixel-text pixel-text--gold" style={{ fontSize: 10 }}>
            HUNT {activeCheckpoint.order_index}: {activeCheckpoint.title.toUpperCase()}
          </span>
        </div>
        <div className="game-hud-xp">
          {profile && <XPBar xp={profile.xp} level={profile.level} />}
        </div>
        <span className="pixel-text pixel-text--gold" style={{ fontSize: 10 }}>
          +{activeCheckpoint.xp_reward} XP
        </span>
      </div>

      <div className="game-main">

        {/* ── LEFT PANEL ── */}
        <div className="game-left-panel">
          <PhaserGame triggerSuccess={triggerSuccess} triggerFailure={triggerFailure} />

          {/* Narrative dialogue */}
          <div className={`dialogue-box game-dialogue ${
            resultStatus === 'success'                          ? 'dialogue--success' :
            resultStatus === 'failure' || resultStatus === 'error' ? 'dialogue--failure' : ''
          }`}>
            {resultStatus === 'success' && (
              <div className="pixel-text pixel-text--green" style={{ fontSize: 10, marginBottom: 6 }}>
                ✓ RESTORATION COMPLETE
              </div>
            )}
            {(resultStatus === 'failure' || resultStatus === 'error') && (
              <div className="pixel-text pixel-text--red" style={{ fontSize: 10, marginBottom: 6 }}>
                ✗ CORRUPTION PERSISTS
              </div>
            )}
            <p className="pixel-text" style={{ fontSize: 14, lineHeight: 1.7 }}>
              {narrativeText || activeCheckpoint.narrative_intro}
            </p>
          </div>

          {/* ── Dragon Mother hint trigger button (inline, left panel) ── */}
          {attemptCount > 0 && !isCompleted && (
            <button
              className="game-hint-trigger pixel-btn pixel-btn--ghost"
              onClick={() => setHintOpen(true)}
              title="Ask the Dragon Mother for guidance"
            >
              <span className="game-hint-trigger-icon">🐉</span>
              <span className="game-hint-trigger-text">
                {isFetchingHint ? 'CONSULTING ORACLE…' : 'ASK DRAGON MOTHER'}
              </span>
              {/* Escalation indicator dots */}
              <span className="game-hint-trigger-pips">
                {[1,2,3].map(n => (
                  <span
                    key={n}
                    className={`game-hint-pip ${
                      attemptCount >= (n === 1 ? 1 : n === 2 ? 3 : 5) ? 'game-hint-pip--on' : ''
                    }`}
                  />
                ))}
              </span>
            </button>
          )}
        </div>

        {/* ── RIGHT PANEL — CODE EDITOR ── */}
        <div className="game-right-panel">

          {/* Challenge description */}
          <div className="game-challenge pixel-panel">
            <p className="pixel-text pixel-text--gold" style={{ fontSize: 9, marginBottom: 8, letterSpacing: 2 }}>
              ▶ MISSION OBJECTIVE
            </p>
            <p className="pixel-text" style={{ fontSize: 14, lineHeight: 1.7 }}>
              {activeCheckpoint.challenge_description}
            </p>
          </div>

          {/* Editor header */}
          <div className="game-editor-header">
            <span className="pixel-text pixel-text--dim" style={{ fontSize: 9 }}>
              PYTHON 3 — SPELL CONSTRUCTOR
            </span>
            <span className="pixel-text pixel-text--dim" style={{ fontSize: 9 }}>
              TAB = 4 SPACES
            </span>
          </div>

          {/* Code textarea */}
          <textarea
            className="pixel-code-editor game-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleTabKey}
            spellCheck={false}
            disabled={isCompleted}
          />

          {/* Action buttons */}
          <div className="game-actions">
            {/* Hint button — visible from first attempt */}
            <button
              className="pixel-btn pixel-btn--ghost"
              onClick={() => setHintOpen(true)}
              disabled={isFetchingHint}
            >
              {isFetchingHint ? '⟳ CONSULTING ORACLE...' : '🐉 ASK DRAGON MOTHER'}
            </button>

            {isCompleted ? (
              <button className="pixel-btn pixel-btn--green" onClick={() => setScreen('map')}>
                ✓ RETURN TO MAP ★
              </button>
            ) : (
              <button
                className="pixel-btn pixel-btn--green game-submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting || !code.trim()}
              >
                {isSubmitting ? (
                  <>
                    <span className="pixel-spinner" style={{ display: 'inline-block', marginRight: 8, width: 16, height: 16 }} />
                    CASTING SPELL...
                  </>
                ) : '⚔ SUBMIT CODE ⚔'}
              </button>
            )}
          </div>

          {/* Status bar */}
          {resultStatus !== 'none' && (
            <div
              className={`game-status-bar pixel-text ${
                resultStatus === 'success' ? 'pixel-text--green' : 'pixel-text--red'
              }`}
              style={{ fontSize: 11, textAlign: 'center', padding: 8 }}
            >
              {resultStatus === 'success' && '★ THE CORRUPTION HAS BEEN PUSHED BACK! ★'}
              {resultStatus === 'failure' && "✗ Your rune sequence was incorrect. The Dragon Mother can guide you."}
              {resultStatus === 'error'   && '✗ A fracture in your construct was detected. Debug before resubmitting.'}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════
          DRAGON HINT MODAL
      ══════════════════════════════ */}
      <DragonHint
        visible={hintOpen}
        onClose={() => setHintOpen(false)}
        onRequestHint={handleRequestHint}
        isFetching={isFetchingHint}
        attemptCount={attemptCount}
      />
    </div>
  );
};

export default GameScreen;