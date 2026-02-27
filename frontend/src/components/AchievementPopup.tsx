import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';

const AchievementPopup: React.FC = () => {
  const { pendingAchievement, clearAchievement } = useGame();
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (pendingAchievement) {
      const exitTimer = setTimeout(() => setIsExiting(true), 4000);
      const clearTimer = setTimeout(() => {
        clearAchievement();
        setIsExiting(false);
      }, 4500);
      return () => {
        clearTimeout(exitTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [pendingAchievement]);

  if (!pendingAchievement) return null;

 return (
    /* The line below now uses backticks (`) for the template literal */
    <div className={`achievement-popup ${isExiting ? 'achievement-popup-exit' : ''}`}>
      <div className="pixel-text pixel-text--gold" style={{ fontSize: 9, marginBottom: 6, letterSpacing: 2 }}>
        ✦ ACHIEVEMENT UNLOCKED ✦
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 32 }}>{pendingAchievement.icon}</span>
        <div>
          <div className="pixel-text" style={{ fontSize: 11, marginBottom: 4, color: 'var(--text-bright)' }}>
            {pendingAchievement.title}
          </div>
          <div className="pixel-text pixel-text--dim" style={{ fontSize: 14 }}>
            {pendingAchievement.description}
          </div>
          <div className="pixel-text pixel-text--gold" style={{ fontSize: 12, marginTop: 4 }}>
            +{pendingAchievement.xp_bonus} BONUS XP
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementPopup;