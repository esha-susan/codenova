import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import TitleScreen from './components/TitleScreen';
import AuthScreen from './components/AuthScreen';
import AvatarScreen from './components/AvatarScreen';
import MapScreen from './components/MapScreen';
import GameScreen from './components/GameScreen';
import AchievementPopup from './components/AchievementPopup';
import './styles/global.css';

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();
  const { currentScreen, setScreen } = useGame();

  // Redirect unauthenticated users away from protected screens
  useEffect(() => {
    if (!loading && !user && !['title', 'auth'].includes(currentScreen)) {
      setScreen('title');
    }
  }, [user, loading, currentScreen]);

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--pixel-black)',
      }}>
        <div className="pixel-spinner" style={{ width: 48, height: 48 }} />
        <p className="pixel-text pixel-text--gold" style={{ marginTop: 24, fontSize: 10 }}>
          LOADING EMBERWOOD GRID...
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      {currentScreen === 'title' && <TitleScreen />}
      {currentScreen === 'auth' && <AuthScreen />}
      {currentScreen === 'avatar' && user && <AvatarScreen />}
      {currentScreen === 'map' && user && <MapScreen />}
      {currentScreen === 'game' && user && <GameScreen />}

      {/* Global overlays */}
      <AchievementPopup />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <GameProvider>
        <AppRouter />
      </GameProvider>
    </AuthProvider>
  );
};

export default App;