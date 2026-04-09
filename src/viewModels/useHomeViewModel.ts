import { useMemo } from 'react';

import { getPlayableLevelDefinition, totalLevelCount } from '../data/levels';
import type { PlayerProgress } from '../storage/playerProgressStore';

type PlayerStats = {
  levelsCompleted: number;
  perfectClears: number;
  totalAttempts: number;
  totalMistakes: number;
};

export type HomeViewModel = {
  currentLevelLabel: string;
  homeHeadline: string;
  openGameScreen: () => void;
  playButtonLabel: string;
  playerStats: PlayerStats;
  playerProgress: PlayerProgress;
  updatePlayerProgress: (updates: Partial<PlayerProgress>) => void;
};

export function useHomeViewModel(
  playerProgress: PlayerProgress,
  openGameScreen: () => void,
  updatePlayerProgress: (updates: Partial<PlayerProgress>) => void,
): HomeViewModel {
  const currentPlayableLevelDefinition = getPlayableLevelDefinition(playerProgress.currentLevelNumber);
  const isCampaignComplete = playerProgress.currentLevelNumber > totalLevelCount;
  const currentLevelLabel = isCampaignComplete ? 'All Levels Cleared' : currentPlayableLevelDefinition.name;
  const homeHeadline = isCampaignComplete
    ? 'You cleared every seeded puzzle. Replay the final board or add more level JSON.'
    : 'Each move removes a node only when its current in-degree is zero.';

  const playerStats = useMemo(
    () => ({
      levelsCompleted: playerProgress.levelsCompleted,
      perfectClears: playerProgress.perfectClears,
      totalAttempts: playerProgress.totalAttempts,
      totalMistakes: playerProgress.totalMistakes,
    }),
    [playerProgress.levelsCompleted, playerProgress.perfectClears, playerProgress.totalAttempts, playerProgress.totalMistakes],
  );

  return {
    currentLevelLabel,
    homeHeadline,
    openGameScreen,
    playButtonLabel: isCampaignComplete ? 'Replay Final Level' : 'Play',
    playerProgress,
    playerStats,
    updatePlayerProgress,
  };
}
