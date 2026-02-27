import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Screen = 'title' | 'auth' | 'avatar' | 'map' | 'game';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_id: string;
  xp: number;
  level: number;
}

interface Checkpoint {
  id: string;
  order_index: number;
  title: string;
  narrative_intro: string;
  challenge_description: string;
  starter_code: string;
  xp_reward: number;
  is_active: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_bonus: number;
}

interface GameContextType {
  currentScreen: Screen;
  profile: Profile | null;
  checkpoints: Checkpoint[];
  activeCheckpoint: Checkpoint | null;
  pendingAchievement: Achievement | null;
  narrativeText: string;
  hintText: string;
  isHintVisible: boolean;
  isLoading: boolean;

  setScreen: (screen: Screen) => void;
  setProfile: (profile: Profile) => void;
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  setActiveCheckpoint: (checkpoint: Checkpoint) => void;
  updateXP: (newXP: number) => void;
  showAchievement: (achievement: Achievement) => void;
  clearAchievement: () => void;
  setNarrative: (text: string) => void;
  setHint: (text: string) => void;
  toggleHint: () => void;
  setLoading: (loading: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('title');
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [checkpoints, setCheckpointsState] = useState<Checkpoint[]>([]);
  const [activeCheckpoint, setActiveCheckpointState] = useState<Checkpoint | null>(null);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const [narrativeText, setNarrativeText] = useState('');
  const [hintText, setHintText] = useState('');
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isLoading, setIsLoadingState] = useState(false);

  const setScreen = useCallback((screen: Screen) => setCurrentScreen(screen), []);
  const setProfile = useCallback((profile: Profile) => setProfileState(profile), []);
  const setCheckpoints = useCallback((checkpoints: Checkpoint[]) => setCheckpointsState(checkpoints), []);
  const setActiveCheckpoint = useCallback((checkpoint: Checkpoint) => setActiveCheckpointState(checkpoint), []);

  const updateXP = useCallback((newXP: number) => {
    setProfileState((prev) => prev ? { ...prev, xp: newXP } : prev);
  }, []);

  const showAchievement = useCallback((achievement: Achievement) => {
    setPendingAchievement(achievement);
    setTimeout(() => setPendingAchievement(null), 5000);
  }, []);

  const clearAchievement = useCallback(() => setPendingAchievement(null), []);
  const setNarrative = useCallback((text: string) => setNarrativeText(text), []);
  const setHint = useCallback((text: string) => { setHintText(text); setIsHintVisible(true); }, []);
  const toggleHint = useCallback(() => setIsHintVisible((v) => !v), []);
  const setLoading = useCallback((loading: boolean) => setIsLoadingState(loading), []);

  return (
    <GameContext.Provider
      value={{
        currentScreen, profile, checkpoints, activeCheckpoint,
        pendingAchievement, narrativeText, hintText, isHintVisible, isLoading,
        setScreen, setProfile, setCheckpoints, setActiveCheckpoint,
        updateXP, showAchievement, clearAchievement, setNarrative, setHint,
        toggleHint, setLoading,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
};