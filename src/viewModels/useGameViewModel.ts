import { useCallback, useEffect, useRef, useState } from 'react';

import { Level } from '../models/Level';
import type { PlayerProgress } from '../storage/playerProgressStore';

export type NodeStatus = 'active' | 'fading';
export type EdgeStatus = 'active' | 'fading';

export type NodeView = {
  id: number;
  x: number;
  y: number;
  status: NodeStatus;
};

export type EdgeView = {
  fromId: number;
  fromX: number;
  fromY: number;
  toId: number;
  toX: number;
  toY: number;
  status: EdgeStatus;
};

export type LevelView = {
  id: string;
  gridWidth: number;
  gridHeight: number;
};

type GraphSnapshot = {
  nodes: NodeView[];
  edges: EdgeView[];
};

export type GameViewModel = {
  activeEdges: EdgeView[];
  activeNodes: NodeView[];
  blockedEventToken: number;
  blockedNodeId: number | null;
  currentLevelLabel: string;
  handleNodePress: (nodeId: number) => void;
  handleRemovalComplete: (nodeId: number) => void;
  isInteractionLocked: boolean;
  isOutOfLives: boolean;
  levelSummary: string;
  levelView: LevelView;
  livesRemaining: number;
  retryLevel: () => void;
  returnHome: () => void;
  setZoom: (newZoom: number) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  zoom: number;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1.55;

function createGraphSnapshot(level: Level): GraphSnapshot {
  return {
    nodes: level.graph.getActiveNodes().map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      status: 'active' as const,
    })),
    edges: level.graph.getActiveEdges().map((e) => ({
      fromId: e.from.id,
      fromX: e.from.x,
      fromY: e.from.y,
      toId: e.to.id,
      toX: e.to.x,
      toY: e.to.y,
      status: 'active' as const,
    })),
  };
}

export function useGameViewModel(
  activeLevel: Level,
  persistProgress: (updater: (previous: PlayerProgress) => PlayerProgress) => void,
  returnHome: () => void,
  beginLevel: (levelNumber: number) => void,
): GameViewModel {
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTokenRef = useRef(0);
  const [graphSnapshot, setGraphSnapshot] = useState<GraphSnapshot>(() => createGraphSnapshot(activeLevel));
  const [livesRemaining, setLivesRemaining] = useState(activeLevel.getLivesRemaining());
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [blockedNodeId, setBlockedNodeId] = useState<number | null>(null);
  const [blockedEventToken, setBlockedEventToken] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    setGraphSnapshot(createGraphSnapshot(activeLevel));
    setLivesRemaining(activeLevel.getLivesRemaining());
    setBlockedNodeId(null);
    setBlockedEventToken(0);
    setIsCompleting(false);
    setShowGrid(false);
    setZoom(0.5);

    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
  }, [activeLevel]);

  const isOutOfLives = activeLevel.isOutOfLives();
  const isInteractionLocked = isCompleting || isOutOfLives;

  const retryLevel = useCallback(() => {
    beginLevel(activeLevel.number);
  }, [activeLevel.number, beginLevel]);

  const handleNodePress = useCallback(
    (nodeId: number) => {
      if (isInteractionLocked) {
        return;
      }

      const tapResult = activeLevel.tapNode(nodeId);

      if (tapResult.kind === 'blocked') {
        eventTokenRef.current += 1;
        setBlockedNodeId(nodeId);
        setBlockedEventToken(eventTokenRef.current);
        setLivesRemaining(tapResult.livesRemaining);
        persistProgress((previousProgress) => ({
          ...previousProgress,
          totalMistakes: previousProgress.totalMistakes + 1,
        }));

        return;
      }

      setBlockedNodeId(null);
      setBlockedEventToken(0);

      setGraphSnapshot((previous) => ({
        nodes: previous.nodes.map((node) =>
          node.id === tapResult.nodeId
            ? { ...node, status: 'fading' as const }
            : node,
        ),
        edges: previous.edges.map((edge) =>
          edge.fromId === tapResult.nodeId
            ? { ...edge, status: 'fading' as const }
            : edge,
        ),
      }));
    },
    [activeLevel, isInteractionLocked, persistProgress],
  );

  const handleRemovalComplete = useCallback(
    (nodeId: number) => {
      setGraphSnapshot((previous) => ({
        nodes: previous.nodes.filter((node) => node.id !== nodeId),
        edges: previous.edges.filter((edge) => edge.fromId !== nodeId && edge.toId !== nodeId),
      }));

      if (!activeLevel.graph.isComplete()) {
        return;
      }

      const completedLevelNumber = activeLevel.number;
      const clearedPerfectly = activeLevel.getLivesRemaining() === activeLevel.maxLives;

      setIsCompleting(true);

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
    [activeLevel, persistProgress, returnHome],
  );

  return {
    activeEdges: graphSnapshot.edges,
    activeNodes: graphSnapshot.nodes,
    blockedEventToken,
    blockedNodeId,
    currentLevelLabel: activeLevel.name,
    handleNodePress,
    handleRemovalComplete,
    isInteractionLocked,
    isOutOfLives,
    levelSummary: `Grid ${activeLevel.gridWidth} x ${activeLevel.gridHeight} with ${graphSnapshot.nodes.length} nodes.`,
    levelView: {
      id: activeLevel.id,
      gridWidth: activeLevel.gridWidth,
      gridHeight: activeLevel.gridHeight,
    },
    livesRemaining,
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
