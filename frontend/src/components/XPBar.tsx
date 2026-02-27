import React from 'react';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2100, 3000];

interface Props {
  xp: number;
  level: number;
}

const XPBar: React.FC<Props> = ({ xp, level }) => {
  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextLevelXP = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  // Calculate progress percentage
  const progress = Math.min(100, ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="pixel-text pixel-text--gold" style={{ fontSize: 10 }}>XP: {xp}</span>
        <span className="pixel-text pixel-text--dim" style={{ fontSize: 9 }}>
          NEXT: {nextLevelXP} XP
        </span>
      </div>
      <div className="xp-bar-container">
        <div
          className="xp-bar-fill"
          /* FIXED: Wrapped in backticks instead of being a bare string/expression */
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default XPBar;