import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { apiCreateProfile } from '../services/api';
import '../styles/AvatarScreen.css';

const AVATARS = [
  { id: 'avatar_ember', label: 'EMBER', emoji: '🧙‍♀️', desc: 'Fire Rune Weaver' },
  { id: 'avatar_nova', label: 'NOVA', emoji: '⚡', desc: 'Lightning Architect' },
  { id: 'avatar_lyra', label: 'LYRA', emoji: '🌿', desc: 'Nature Grid Walker' },
  { id: 'avatar_sable', label: 'SABLE', emoji: '🌙', desc: 'Shadow Code Dancer' },
];

const AvatarScreen: React.FC = () => {
  const { setScreen, setProfile } = useGame();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedAvatar || !username.trim()) return;
    if (username.trim().length < 2 || username.trim().length > 20) {
      setError('Initiate name must be 2-20 characters.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const { data } = await apiCreateProfile(username.trim(), selectedAvatar);
      setProfile(data.profile);
      setScreen('map');
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to register. The Grid resists.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="avatar-screen">
      <div className="avatar-container">
        {/* Header */}
        <div className="avatar-header pixel-panel pixel-panel--gold">
          <h2 className="pixel-title avatar-title">CHOOSE YOUR PATH</h2>
          <p className="pixel-subtitle">
            Select your Initiate class and name your legend.
          </p>
        </div>

        {/* Avatar grid */}
        <div className="avatar-grid">
          {AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              /* FIXED: Wrapped in backticks instead of quotes */
              className={`avatar-option ${selectedAvatar === avatar.id ? 'avatar-option--selected' : ''}`}
              onClick={() => setSelectedAvatar(avatar.id)}
              title={avatar.desc}
            >
              <div className="avatar-emoji">{avatar.emoji}</div>
              <div className="avatar-label pixel-text">{avatar.label}</div>
              <div className="avatar-desc pixel-text pixel-text--dim">{avatar.desc}</div>
              {selectedAvatar === avatar.id && (
                <div className="avatar-selected-badge pixel-text pixel-text--gold">★ CHOSEN</div>
              )}
            </button>
          ))}
        </div>

        {/* Username input */}
        <div className="avatar-username pixel-panel">
          <label className="pixel-text pixel-text--dim" style={{ fontSize: 9, letterSpacing: 2 }}>
            YOUR INITIATE NAME
          </label>
          <input
            type="text"
            className="pixel-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
          />
          <div className="pixel-text pixel-text--dim" style={{ fontSize: 11, marginTop: 4 }}>
            {username.length}/20 characters
          </div>
        </div>

        {/* Lore reminder */}
        {selectedAvatar && (
          <div className="avatar-lore dialogue-box">
            <p className="pixel-text pixel-text--gold" style={{ marginBottom: 8 }}>
              🐉 Dragon Mother speaks:
            </p>
            <p className="pixel-text">
              "You have chosen your class, young one. The Grid has recorded your path.
              Emberwood awaits your first trial. May your code be true and your logic unbroken."
            </p>
          </div>
        )}

        {error && (
          <div className="pixel-panel pixel-panel--red">
            <p className="pixel-text pixel-text--red">⚠ {error}</p>
          </div>
        )}

        {/* Confirm */}
        <button
          className="pixel-btn pixel-btn--green avatar-confirm-btn"
          onClick={handleConfirm}
          disabled={!selectedAvatar || !username.trim() || isLoading}
        >
          {isLoading ? '⟳ REGISTERING SIGIL...' : '✦ ENTER EMBERWOOD ✦'}
        </button>
      </div>
    </div>
  );
};

export default AvatarScreen;