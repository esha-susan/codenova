import React, { useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { apiSubmitCode, apiRequestHint } from '../services/api';
import PhaserGame from './PhaserGame';
import XPBar from './XPBar';
import '../styles/GameScreen.css';

const GameScreen: React.FC = () => {
  const {
    profile, activeCheckpoint, narrativeText, hintText, isHintVisible,
    setScreen, setNarrative, setHint, toggleHint, updateXP, showAchievement,
  } = useGame();

  const [code, setCode] = useState(activeCheckpoint?.starter_code ?? '# Write your Python code here\n');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingHint, setIsFetchingHint] = useState(false);
  const [resultStatus, setResultStatus] = useState<'none' | 'success' | 'failure' | 'error'>('none');
  const [triggerSuccess, setTriggerSuccess] = useState(false);
  const [triggerFailure, setTriggerFailure] = useState(false);
  const [errorOutput, setErrorOutput] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

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

        if (data.achievement) {
          showAchievement(data.achievement);
        }
      } else {
        setResultStatus(data.sfx_trigger === 'error' ? 'error' : 'failure');
        setTriggerFailure(true);
        setTimeout(() => setTriggerFailure(false), 100);

        if (data.hint) {
          setHint(data.hint);
        }
        if (data.error_type === 'syntax' || data.error_type === 'runtime' || data.error_type === 'timeout') {
          setErrorOutput(data.narrative_response);
        }
      }
    } catch (err: any) {
      setNarrative('A rift in the Grid disrupted your submission. Please try again.');
      setResultStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeCheckpoint, code, isSubmitting]);

  const handleRequestHint = useCallback(async () => {
    if (!activeCheckpoint || isFetchingHint) return;
    setIsFetchingHint(true);
    try {
      const { data } = await apiRequestHint(activeCheckpoint.id, code, errorOutput);
      setHint(data.hint);
    } catch {
      setHint('The Dragon Mother is momentarily occupied. Try submitting your code first.');
    } finally {
      setIsFetchingHint(false);
    }
  }, [activeCheckpoint, code, errorOutput, isFetchingHint]);

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => textarea.setSelectionRange(start + 4, start + 4), 0);
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
      {/* Top HUD */}
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
        {/* Left panel */}
        <div className="game-left-panel">
          {/* Phaser game view */}
          <PhaserGame triggerSuccess={triggerSuccess} triggerFailure={triggerFailure} />

          {/* Narrative dialogue box */}
          <div className={`dialogue-box game-dialogue ${
            resultStatus === 'success' ? 'dialogue--success' :
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

          {/* Hint panel */}
          {isHintVisible && hintText && (
            <div className="hint-popup">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="pixel-text" style={{ fontSize: 10, color: 'var(--arcane-blue)' }}>
                  🐉 DRAGON MOTHER SPEAKS:
                </span>
                <button className="pixel-btn pixel-btn--ghost" style={{ fontSize: 8, padding: '4px 8px' }} onClick={toggleHint}>
                  ✕
                </button>
              </div>
              <p className="pixel-text" style={{ fontSize: 14, lineHeight: 1.7 }}>{hintText}</p>
            </div>
          )}
        </div>

        {/* Right panel - code editor */}
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

          {/* Code editor label */}
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
            <button
              className="pixel-btn pixel-btn--ghost"
              onClick={handleRequestHint}
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

          {/* Status indicator */}
          {resultStatus !== 'none' && (
            <div className={`game-status-bar pixel-text ${
              resultStatus === 'success' ? 'pixel-text--green' :
              'pixel-text--red'
            }`} style={{ fontSize: 11, textAlign: 'center', padding: 8 }}>
              {resultStatus === 'success' && '★ THE CORRUPTION HAS BEEN PUSHED BACK! ★'}
              {resultStatus === 'failure' && '✗ Your rune sequence was incorrect. Study the Dragon Mother\'s words.'}
              {resultStatus === 'error' && '✗ A fracture in your construct was detected. Debug before resubmitting.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;