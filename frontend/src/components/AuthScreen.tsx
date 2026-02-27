import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { apiGetProfile } from '../services/api';
import '../styles/AuthScreen.css';

const AuthScreen: React.FC = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { setScreen, setProfile } = useGame();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError('Invalid credentials. The Gate Rune rejects your sigil.');
          return;
        }

        // Give token a moment to persist
        await new Promise((r) => setTimeout(r, 500));

        try {
          const { data } = await apiGetProfile();
          setProfile(data.profile);
          setScreen('map');
        } catch {
          // No profile yet
          setScreen('avatar');
        }
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          setError(error.message ?? 'Registration failed.');
          return;
        }
        setMessage(
          'Your initiation request has been sent. Check your email to verify, then return here to sign in.'
        );
        setMode('login');
      }
    } catch (err) {
      setError('An unexpected corruption occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container pixel-panel pixel-panel--gold">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-icon">🐉</div>
          <h2 className="pixel-title auth-title">
            {mode === 'login' ? 'ENTER EMBERWOOD' : 'JOIN THE ACADEMY'}
          </h2>
          <p className="pixel-subtitle auth-subtitle">
            {mode === 'login'
              ? 'Identify yourself, Initiate.'
              : 'Register your sigil with the Grid.'}
          </p>
        </div>

        {/* Form */}
        <div className="auth-form">
          <div className="auth-field">
            <label className="auth-label pixel-text pixel-text--dim">EMAIL SIGIL</label>
            <input
              type="email"
              className="pixel-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="initiate@academy.emb"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label pixel-text pixel-text--dim">SECRET RUNE</label>
            <input
              type="password"
              className="pixel-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && (
            <div className="auth-error pixel-panel pixel-panel--red">
              <p className="pixel-text pixel-text--red">⚠ {error}</p>
            </div>
          )}

          {message && (
            <div className="auth-message pixel-panel pixel-panel--green">
              <p className="pixel-text pixel-text--green">✓ {message}</p>
            </div>
          )}

          <button
            className="pixel-btn pixel-btn--green w-full"
            onClick={handleSubmit}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? (
              <span className="auth-loading">
                <span className="pixel-spinner" style={{ display: 'inline-block', marginRight: 8 }} />
                PROCESSING RUNE...
              </span>
            ) : mode === 'login' ? '⚔ ENTER THE GATE' : '✦ REGISTER SIGIL'}
          </button>
        </div>

        {/* Toggle */}
        <div className="auth-toggle">
          <span className="pixel-text pixel-text--dim">
            {mode === 'login' ? 'No sigil registered yet?' : 'Already an Initiate?'}
          </span>
          <button
            className="pixel-btn pixel-btn--ghost"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
          >
            {mode === 'login' ? 'JOIN THE ACADEMY' : 'SIGN IN'}
          </button>
        </div>

        {/* Back button */}
        <button className="pixel-btn pixel-btn--ghost auth-back" onClick={() => setScreen('title')}>
          ← RETURN TO TITLE
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;