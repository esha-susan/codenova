import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import '../styles/TitleScreen.css';

const TitleScreen: React.FC = () => {
  const { setScreen } = useGame();
  const [showPrompt, setShowPrompt] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShowPrompt((v) => !v), 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="title-screen">
      {/* Star field background */}
      <div className="title-stars" aria-hidden="true">
        {Array.from({ length: 60 }).map((_, i) => (
            <div
            key={i}
            className="title-star"
            style={{
              /* FIXED: Added backticks (`) and ensured units are correct */
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              width: Math.random() > 0.8 ? '4px' : '2px',
              height: Math.random() > 0.8 ? '4px' : '2px',
            }}
          />
        ))}
      </div>

      {/* Dragon silhouette deco */}
      <div className="title-dragon-deco" aria-hidden="true">🐉</div>

      <div className="title-content">
        {/* Logo */}
        <div className="title-logo-wrapper">
          <div className="title-logo-line title-logo-line--top">[ CODE NOVA ]</div>
          <h1 className="pixel-title title-main-title">EMBERWOOD</h1>
          <div className="title-logo-line title-logo-line--sub">AN INITIATE'S JOURNEY</div>
        </div>

        {/* Decorative divider */}
        <div className="title-divider">
          <span>═══════</span>
          <span className="title-divider-gem">◆</span>
          <span>═══════</span>
        </div>

        {/* Tagline */}
        <p className="pixel-subtitle title-tagline">
          Where logic shapes reality.<br />
          Where dragons guard the laws of structure.
        </p>

        {/* Version / credits */}
        <div className="title-meta pixel-text pixel-text--dim">
          VER 1.0 — VERTICAL SLICE
        </div>

        {/* CTA */}
        <div className="title-cta-wrapper">
          {showPrompt && (
            <div className="title-prompt pixel-text pixel-text--gold">
              ▶ PRESS START TO ENTER EMBERWOOD ◀
            </div>
          )}
          <button
            className="pixel-btn title-start-btn"
            onClick={() => setScreen('auth')}
          >
            ⚔ BEGIN YOUR JOURNEY ⚔
          </button>
        </div>

        {/* Narrative blurb */}
        <div className="title-lore pixel-panel">
          <p className="pixel-text">
            The Corruption spreads. Runes fracture. The Academy calls for Initiates
            who can restore the broken Grid of Emberwood through the power of code.
          </p>
          <p className="pixel-text mt-8 pixel-text--dim">
            Only those who master both creation and correction may earn the Dragon Sigil.
          </p>
        </div>
      </div>

      {/* Bottom credits */}
      <div className="title-footer pixel-text pixel-text--dim">
        INSPIRED BY ADA LOVELACE · DESIGNED FOR WOMEN IN TECH
      </div>
    </div>
  );
};

export default TitleScreen;