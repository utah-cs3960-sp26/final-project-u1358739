import { useCallback, useRef, useState } from 'react';

import { Level } from '../models/Level';
import type { NodeSnapshot } from '../models/Node';
import type { PlayerProgress } from '../storage/playerProgressStore';

export type NodeView = {
  id: number;
  x: number;
  y: number;
  inDegree: number;
};

export type EdgeView = {
  fromId: number;
  fromX: number;
  fromY: number;
  toId: number;
  toX: number;
  toY: number;
};

export type LevelView = {
  id: string;
  gridWidth: number;
  gridHeight: number;
};

export type RemovalAnimationSnapshot = {
  token: number;
  source: NodeSnapshot;
  neighbors: NodeSnapshot[];
};

export type GameViewModel = {
  activeEdges: EdgeView[];
  activeNodes: NodeView[];
  blockedEventToken: number;
  blockedNodeId: number | null;
  currentLevelLabel: string;
  handleNodePress: (nodeId: number) => void;
  isInteractionLocked: boolean;
  isOutOfLives: boolean;
  levelSummary: string;
  levelView: LevelView;
  livesRemaining: number;
  removalEvent: RemovalAnimationSnapshot | null;
  retryLevel: () => void;
  returnHome: () => void;
  setZoom: (newZoom: number) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  zoom: number;
};

const DEFAULT_LIVES = 2;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.55;

export function useGameViewModel(
  activeLevel: Level,
  persistProgress: (updater: (previous: PlayerProgress) => PlayerProgress) => void,
  returnHome: () => void,
  beginLevel: (levelNumber: number) => void,
): GameViewModel {
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTokenRef = useRef(0);
  const [livesRemaining, setLivesRemaining] = useState(DEFAULT_LIVES);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [blockedNodeId, setBlockedNodeId] = useState<number | null>(null);
  const [blockedEventToken, setBlockedEventToken] = useState(0);
  const [removalEvent, setRemovalEvent] = useState<RemovalAnimationSnapshot | null>(null);
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);

  const retryLevel = useCallback(() => {
    beginLevel(activeLevel.number);
  }, [activeLevel.number, beginLevel]);

  const handleNodePress = useCallback(
    (nodeId: number) => {
      if (isInteractionLocked || livesRemaining <= 0) {
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

  return {
    activeEdges: activeLevel.graph.getActiveEdges().map((e) => ({
      fromId: e.from.id,
      fromX: e.from.x,
      fromY: e.from.y,
      toId: e.to.id,
      toX: e.to.x,
      toY: e.to.y,
    })),
    activeNodes: activeLevel.graph.getActiveNodes().map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      inDegree: n.inDegree,
    })),
    blockedEventToken,
    blockedNodeId,
    currentLevelLabel: activeLevel.name,
    handleNodePress,
    isInteractionLocked,
    isOutOfLives: livesRemaining === 0,
    levelSummary: `Grid ${activeLevel.gridWidth} x ${activeLevel.gridHeight} with ${activeLevel.graph.getNodes().length} nodes.`,
    levelView: {
      id: activeLevel.id,
      gridWidth: activeLevel.gridWidth,
      gridHeight: activeLevel.gridHeight,
    },
    livesRemaining,
    removalEvent,
    retryLevel,
    returnHome,
    setZoom: (newZoom: number) => {
      setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom)));
    },
    showGrid,
    toggleGrid: () => {
      setShowGrid((previousValue) => !previousValue);
    },
    zoom,
  };
}
