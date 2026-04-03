import { useCallback, useMemo, useRef, useState } from 'react';

import { getPlayableLevelDefinition, totalLevelCount } from '../data/levels';
import { Level } from '../models/Level';
import type { NodeSnapshot } from '../models/Node';
import {
  defaultPlayerProgress,
  loadPlayerProgress,
  savePlayerProgress,
  type PlayerProgress,
} from '../storage/playerProgressStore';

type ScreenKey = 'home' | 'game';

type PlayerStats = {
  levelsCompleted: number;
  perfectClears: number;
  totalAttempts: number;
  totalMistakes: number;
};

export type RemovalAnimationSnapshot = {
  token: number;
  source: NodeSnapshot;
  neighbors: NodeSnapshot[];
};

type GameScreenState = {
  blockedEventToken: number;
  blockedNodeId: number | null;
  currentLevelLabel: string;
  isInteractionLocked: boolean;
  isOutOfLives: boolean;
  level: Level;
  levelSummary: string;
  livesRemaining: number;
  removalEvent: RemovalAnimationSnapshot | null;
  returnHome: () => void;
  retryLevel: () => void;
  showGrid: boolean;
  toggleGrid: () => void;
  zoom: number;
  setZoom: (newZoom: number) => void;
  handleNodePress: (nodeId: number) => void;
};

export type AppViewModel = {
  currentLevelLabel: string;
  currentScreen: ScreenKey;
  homeHeadline: string;
  openGameScreen: () => void;
  playButtonLabel: string;
  playerStats: PlayerStats;
  playerProgress: PlayerProgress;
  updatePlayerProgress: (updates: Partial<PlayerProgress>) => void;
  gameScreen: GameScreenState | null;
};

const DEFAULT_LIVES = 2;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.55;

export function useAppViewModel(): AppViewModel {
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTokenRef = useRef(0);
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>('home');
  const [activeLevel, setActiveLevel] = useState<Level | null>(null);
  const [livesRemaining, setLivesRemaining] = useState(DEFAULT_LIVES);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [blockedNodeId, setBlockedNodeId] = useState<number | null>(null);
  const [blockedEventToken, setBlockedEventToken] = useState(0);
  const [removalEvent, setRemovalEvent] = useState<RemovalAnimationSnapshot | null>(null);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);

  const currentPlayableLevelDefinition = getPlayableLevelDefinition(playerProgress.currentLevelNumber);
  const isCampaignComplete = playerProgress.currentLevelNumber > totalLevelCount;
  const currentLevelLabel = isCampaignComplete ? 'All Levels Cleared' : currentPlayableLevelDefinition.name;
  const homeHeadline = isCampaignComplete
    ? 'You cleared every seeded puzzle. Replay the final board or add more level JSON.'
    : 'Each move removes a node only when its current in-degree is zero.';

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

  const resetTransientGameState = useCallback(() => {
    setBlockedNodeId(null);
    setBlockedEventToken(0);
    setRemovalEvent(null);
    setIsInteractionLocked(false);

    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, []);

  const beginLevel = useCallback(
    (levelNumber: number) => {
      const definition = getPlayableLevelDefinition(levelNumber);

      resetTransientGameState();
      setActiveLevel(Level.fromDefinition(definition));
      setLivesRemaining(DEFAULT_LIVES);
      setShowGrid(false);
      setZoom(0.5);
      setCurrentScreen('game');
      persistProgress((previousProgress) => ({
        ...previousProgress,
        totalAttempts: previousProgress.totalAttempts + 1,
      }));
    },
    [persistProgress, resetTransientGameState],
  );

  const returnHome = useCallback(() => {
    resetTransientGameState();
    setCurrentScreen('home');
    setActiveLevel(null);
    setLivesRemaining(DEFAULT_LIVES);
  }, [resetTransientGameState]);

  const retryLevel = useCallback(() => {
    beginLevel(activeLevel?.number ?? currentPlayableLevelDefinition.number);
  }, [activeLevel?.number, beginLevel, currentPlayableLevelDefinition.number]);

  const openGameScreen = useCallback(() => {
    beginLevel(currentPlayableLevelDefinition.number);
  }, [beginLevel, currentPlayableLevelDefinition.number]);

  const handleNodePress = useCallback(
    (nodeId: number) => {
      if (!activeLevel || isInteractionLocked || livesRemaining <= 0) {
        return;
      }

      const tapResult = activeLevel.graph.tapNode(nodeId);

      if (tapResult.kind === 'blocked') {
        const nextLives = Math.max(0, livesRemaining - 1);

        eventTokenRef.current += 1;
        setBlockedNodeId(nodeId);
        setBlockedEventToken(eventTokenRef.current);
        setLivesRemaining(nextLives);
        persistProgress((previousProgress) => ({
          ...previousProgress,
          totalMistakes: previousProgress.totalMistakes + 1,
        }));

        if (nextLives === 0) {
          setIsInteractionLocked(true);
        }

        return;
      }

      eventTokenRef.current += 1;
      setRemovalEvent({
        token: eventTokenRef.current,
        source: tapResult.node.toSnapshot(),
        neighbors: tapResult.affectedNeighbors.map((neighbor) => neighbor.toSnapshot()),
      });
      setBlockedNodeId(null);
      setBlockedEventToken(0);

      if (!activeLevel.graph.isComplete()) {
        return;
      }

      const completedLevelNumber = activeLevel.number;
      const clearedPerfectly = livesRemaining === DEFAULT_LIVES;

      setIsInteractionLocked(true);

      completionTimeoutRef.current = setTimeout(() => {
        persistProgress((previousProgress) => ({
          currentLevelNumber: previousProgress.currentLevelNumber + 1,
          levelsCompleted: Math.max(previousProgress.levelsCompleted, completedLevelNumber),
          perfectClears: previousProgress.perfectClears + (clearedPerfectly ? 1 : 0),
          totalAttempts: previousProgress.totalAttempts,
          totalMistakes: previousProgress.totalMistakes,
        }));

        completionTimeoutRef.current = null;
        returnHome();
      }, 340);
    },
    [activeLevel, isInteractionLocked, livesRemaining, persistProgress, returnHome],
  );

  const playerStats = useMemo(
    () => ({
      levelsCompleted: playerProgress.levelsCompleted,
      perfectClears: playerProgress.perfectClears,
      totalAttempts: playerProgress.totalAttempts,
      totalMistakes: playerProgress.totalMistakes,
    }),
    [playerProgress.levelsCompleted, playerProgress.perfectClears, playerProgress.totalAttempts, playerProgress.totalMistakes],
  );

  const gameScreen = activeLevel
    ? {
        blockedEventToken,
        blockedNodeId,
        currentLevelLabel: activeLevel.name,
        handleNodePress,
        isInteractionLocked,
        isOutOfLives: livesRemaining === 0,
        level: activeLevel,
        levelSummary: `Grid ${activeLevel.gridWidth} x ${activeLevel.gridHeight} with ${activeLevel.graph.getNodes().length} nodes.`,
        livesRemaining,
        removalEvent,
        returnHome,
        retryLevel,
        showGrid,
        toggleGrid: () => {
          setShowGrid((previousValue) => !previousValue);
        },
        zoom,
        setZoom: (newZoom: number) => {
          setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom)));
        },
      }
    : null;

  return {
    currentLevelLabel,
    currentScreen,
    gameScreen,
    homeHeadline,
    openGameScreen,
    playButtonLabel: isCampaignComplete ? 'Replay Final Level' : 'Play',
    playerProgress,
    playerStats,
    updatePlayerProgress,
  };
}
