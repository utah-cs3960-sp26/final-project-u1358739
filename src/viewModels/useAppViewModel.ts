import { useCallback, useState } from 'react';

import { getPlayableLevelDefinition } from '../data/levels';
import { Level } from '../models/Level';
import {
  defaultPlayerProgress,
  loadPlayerProgress,
  savePlayerProgress,
  type PlayerProgress,
} from '../storage/playerProgressStore';

type ScreenKey = 'home' | 'game';

export type AppViewModel = {
  currentScreen: ScreenKey;
  activeLevel: Level | null;
  playerProgress: PlayerProgress;
  persistProgress: (updater: (previous: PlayerProgress) => PlayerProgress) => void;
  updatePlayerProgress: (updates: Partial<PlayerProgress>) => void;
  openGameScreen: () => void;
  returnHome: () => void;
  beginLevel: (levelNumber: number) => void;
};

export function useAppViewModel(): AppViewModel {
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>('home');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);

  const persistProgress = useCallback((updater: (previous: PlayerProgress) => PlayerProgress) => {
    setPlayerProgress((previousProgress) => {
      const nextProgress = updater(previousProgress ?? defaultPlayerProgress);
      savePlayerProgress(nextProgress);

      return nextProgress;
    });
  }, []);

  const updatePlayerProgress = useCallback(
    (updates: Partial<PlayerProgress>) => {
      persistProgress((previous) => ({ ...previous, ...updates }));
    },
    [persistProgress],
  );

  const returnHome = useCallback(() => {
    setCurrentScreen('home');
    setActiveLevel(null);
  }, []);

  const beginLevel = useCallback(
    (levelNumber: number) => {
      const definition = getPlayableLevelDefinition(levelNumber);

      setActiveLevel(Level.fromDefinition(definition));
      setCurrentScreen('game');
      persistProgress((previousProgress) => ({
        ...previousProgress,
        totalAttempts: previousProgress.totalAttempts + 1,
      }));
    },
    [persistProgress],
  );

  const openGameScreen = useCallback(() => {
    const currentPlayableLevelDefinition = getPlayableLevelDefinition(playerProgress.currentLevelNumber);
    beginLevel(currentPlayableLevelDefinition.number);
  }, [beginLevel, playerProgress.currentLevelNumber]);

  return {
    activeLevel,
    beginLevel,
    currentScreen,
    openGameScreen,
    persistProgress,
    playerProgress,
    returnHome,
    updatePlayerProgress,
  };
}
