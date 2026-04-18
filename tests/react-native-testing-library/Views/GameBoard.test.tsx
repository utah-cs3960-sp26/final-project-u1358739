import { act, renderHook } from '@testing-library/react';

import { getPlayableLevelDefinition, levelDefinitions } from '../../../src/data/levels';
import { Level } from '../../../src/models/Level';
import { defaultPlayerProgress, type PlayerProgress } from '../../../src/storage/playerProgressStore';
import { useGameViewModel } from '../../../src/viewModels/useGameViewModel';

/**
 * Level 1 has nodes: 1→[2,3], 2→[4], 3→[4], 4→[]
 * Node 1 is the only node with in-degree 0 at the start.
 *
 * These tests exercise the GameViewModel's handleNodePress to verify that
 * after tapping a valid node, the snapshot state exposed to the view
 * (activeNodes, activeEdges) follows the fading workflow correctly.
 */

function buildLevel(): Level {
  const definition = getPlayableLevelDefinition(1);
  return Level.fromDefinition(definition);
}

function buildTimedLevel(): Level {
  const definition = getPlayableLevelDefinition(8);
  return Level.fromDefinition(definition);
}

function renderGameViewModel(level: Level) {
  const persistProgress = jest.fn();
  const returnHome = jest.fn();
  const beginLevel = jest.fn();

  return {
    ...renderHook(() =>
      useGameViewModel(level, persistProgress, returnHome, beginLevel),
    ),
    persistProgress,
    returnHome,
  };
}

function solveLevel(level: Level, result: ReturnType<typeof renderGameViewModel>['result']) {
  let lastRemovedNodeId: number | null = null;

  while (result.current.activeNodes.length > 0) {
    const removable = level.graph.getActiveNodes().find((node) => node.inDegree === 0);

    expect(removable).toBeDefined();

    act(() => {
      result.current.handleNodePress(removable!.id);
    });

    lastRemovedNodeId = removable!.id;

    act(() => {
      result.current.handleRemovalComplete(removable!.id);
    });
  }

  expect(lastRemovedNodeId).not.toBeNull();

  return lastRemovedNodeId!;
}

function applyPersistedUpdates(
  persistProgress: jest.Mock,
  startingProgress: PlayerProgress,
) {
  return persistProgress.mock.calls.reduce((progress, [updater]) => updater(progress), startingProgress);
}

describe('GameBoard after tapping a valid node', () => {
  it('sets the tapped node to fading status', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(1);
    });

    const fadingNode = result.current.activeNodes.find((n) => n.id === 1);
    expect(fadingNode).toBeDefined();
    expect(fadingNode!.status).toBe('fading');
  });

  it('sets edges from the tapped node to fading status', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(1);
    });

    const fadingEdges = result.current.activeEdges.filter((e) => e.status === 'fading');
    const fadingPairs = fadingEdges.map((e) => [e.fromId, e.toId]);
    expect(fadingPairs).toContainEqual([1, 2]);
    expect(fadingPairs).toContainEqual([1, 3]);

    const activeEdges = result.current.activeEdges.filter((e) => e.status === 'active');
    const activePairs = activeEdges.map((e) => [e.fromId, e.toId]);
    expect(activePairs).toContainEqual([2, 4]);
    expect(activePairs).toContainEqual([3, 4]);
  });

  it('removes the node from snapshot after handleRemovalComplete', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(1);
    });

    act(() => {
      result.current.handleRemovalComplete(1);
    });

    const activeIds = result.current.activeNodes.map((n) => n.id);
    expect(activeIds).not.toContain(1);
    expect(activeIds).toEqual([2, 3, 4]);
  });

  it('does not lock interaction while a node is fading', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(1);
    });

    expect(result.current.isInteractionLocked).toBe(false);
  });

  it('stays consistent through sequential tap-and-complete cycles', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    // Tap and complete node 1
    act(() => { result.current.handleNodePress(1); });
    act(() => { result.current.handleRemovalComplete(1); });
    expect(result.current.activeNodes.map((n) => n.id)).toEqual([2, 3, 4]);

    // Tap and complete node 2
    act(() => { result.current.handleNodePress(2); });
    act(() => { result.current.handleRemovalComplete(2); });
    expect(result.current.activeNodes.map((n) => n.id)).toEqual([3, 4]);

    // Tap and complete node 3
    act(() => { result.current.handleNodePress(3); });
    act(() => { result.current.handleRemovalComplete(3); });
    expect(result.current.activeNodes.map((n) => n.id)).toEqual([4]);

    // Tap and complete node 4
    act(() => { result.current.handleNodePress(4); });
    act(() => { result.current.handleRemovalComplete(4); });
    expect(result.current.activeNodes).toEqual([]);
  });

  it('decrements lives via the model when a blocked node is tapped', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    // Node 2 has in-degree 1, should be blocked
    act(() => {
      result.current.handleNodePress(2);
    });

    expect(result.current.livesRemaining).toBe(2);
    expect(result.current.blockedNodeId).toBe(2);
  });
});

describe('blocked node handling', () => {
  it('resets blockedNodeId to null after a valid tap', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(2);
    });

    expect(result.current.blockedNodeId).toBe(2);

    act(() => {
      result.current.handleNodePress(1);
    });

    expect(result.current.blockedNodeId).toBe(null);
    expect(result.current.blockedEventToken).toBe(0);
  });
});

describe('interaction lock on out-of-lives', () => {
  it('locks interaction after losing all lives', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(2);
    });

    expect(result.current.livesRemaining).toBe(2);

    act(() => {
      result.current.handleNodePress(3);
    });

    expect(result.current.livesRemaining).toBe(1);
    expect(result.current.isInteractionLocked).toBe(false);
    expect(result.current.isOutOfLives).toBe(false);

    act(() => {
      result.current.handleNodePress(4);
    });

    expect(result.current.livesRemaining).toBe(0);
    expect(result.current.isInteractionLocked).toBe(true);
    expect(result.current.isOutOfLives).toBe(true);

    const nodeCountBefore = result.current.activeNodes.length;

    act(() => {
      result.current.handleNodePress(1);
    });

    expect(result.current.activeNodes.length).toBe(nodeCountBefore);
  });
});

describe('level completion', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires persistProgress and returnHome after completion timeout', () => {
    const level = buildLevel();
    const { result, persistProgress, returnHome } = renderGameViewModel(level);

    act(() => { result.current.handleNodePress(1); });
    act(() => { result.current.handleRemovalComplete(1); });
    act(() => { result.current.handleNodePress(2); });
    act(() => { result.current.handleRemovalComplete(2); });
    act(() => { result.current.handleNodePress(3); });
    act(() => { result.current.handleRemovalComplete(3); });
    act(() => { result.current.handleNodePress(4); });
    act(() => { result.current.handleRemovalComplete(4); });

    expect(returnHome).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(340);
    });

    expect(persistProgress).toHaveBeenCalled();

    const updater = persistProgress.mock.calls[persistProgress.mock.calls.length - 1][0];
    const updated = updater({
      currentLevelNumber: 1,
      levelsCompleted: 0,
      totalAttempts: 0,
      totalMistakes: 0,
      perfectClears: 0,
    });

    expect(updated.currentLevelNumber).toBe(2);
    expect(updated.levelsCompleted).toBe(1);
    expect(returnHome).toHaveBeenCalled();
  });
});

describe('perfect clear tracking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('increments perfectClears when no mistakes are made', () => {
    const level = buildLevel();
    const { result, persistProgress } = renderGameViewModel(level);

    act(() => { result.current.handleNodePress(1); });
    act(() => { result.current.handleRemovalComplete(1); });
    act(() => { result.current.handleNodePress(2); });
    act(() => { result.current.handleRemovalComplete(2); });
    act(() => { result.current.handleNodePress(3); });
    act(() => { result.current.handleRemovalComplete(3); });
    act(() => { result.current.handleNodePress(4); });
    act(() => { result.current.handleRemovalComplete(4); });

    act(() => {
      jest.advanceTimersByTime(340);
    });

    const updater = persistProgress.mock.calls[persistProgress.mock.calls.length - 1][0];
    const updated = updater({
      currentLevelNumber: 1,
      levelsCompleted: 0,
      totalAttempts: 0,
      totalMistakes: 0,
      perfectClears: 0,
    });

    expect(updated.perfectClears).toBe(1);
  });

  it('does not increment perfectClears when a mistake was made', () => {
    const level = buildLevel();
    const { result, persistProgress } = renderGameViewModel(level);

    act(() => { result.current.handleNodePress(2); });

    act(() => { result.current.handleNodePress(1); });
    act(() => { result.current.handleRemovalComplete(1); });
    act(() => { result.current.handleNodePress(2); });
    act(() => { result.current.handleRemovalComplete(2); });
    act(() => { result.current.handleNodePress(3); });
    act(() => { result.current.handleRemovalComplete(3); });
    act(() => { result.current.handleNodePress(4); });
    act(() => { result.current.handleRemovalComplete(4); });

    act(() => {
      jest.advanceTimersByTime(340);
    });

    const updater = persistProgress.mock.calls[persistProgress.mock.calls.length - 1][0];
    const updated = updater({
      currentLevelNumber: 1,
      levelsCompleted: 0,
      totalAttempts: 0,
      totalMistakes: 0,
      perfectClears: 0,
    });

    expect(updated.perfectClears).toBe(0);
  });
});

describe('retryLevel', () => {
  it('calls beginLevel with the current level number', () => {
    const level = buildLevel();
    const persistProgress = jest.fn();
    const returnHome = jest.fn();
    const beginLevel = jest.fn();

    const { result } = renderHook(() =>
      useGameViewModel(level, persistProgress, returnHome, beginLevel),
    );

    act(() => {
      result.current.retryLevel();
    });

    expect(beginLevel).toHaveBeenCalledWith(1);
  });
});

describe('zoom clamping', () => {
  it('clamps zoom to minimum 0.25', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.setZoom(0.1);
    });

    expect(result.current.zoom).toBe(0.25);
  });

  it('clamps zoom to maximum 1.55', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.setZoom(2.0);
    });

    expect(result.current.zoom).toBe(1.55);
  });
});

describe('grid toggle', () => {
  it('toggles showGrid from false to true', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    expect(result.current.showGrid).toBe(false);

    act(() => {
      result.current.toggleGrid();
    });

    expect(result.current.showGrid).toBe(true);
  });

  it('toggles showGrid back to false', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.toggleGrid();
    });

    act(() => {
      result.current.toggleGrid();
    });

    expect(result.current.showGrid).toBe(false);
  });
});

describe('level timer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not count down before the first node press', () => {
    const level = buildTimedLevel();
    const { result } = renderGameViewModel(level);

    expect(result.current.timeDisplay).toBe('0:15');

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.timeDisplay).toBe('0:15');
    expect(result.current.isOutOfTime).toBe(false);
  });

  it('starts counting down after the first node press', () => {
    const level = buildTimedLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(1);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.timeDisplay).toBe('0:14');
  });
});

describe('parameterized full-solve for every shipped level', () => {
  it.each(levelDefinitions)('solves level $number ($name) to completion', (def) => {
    jest.useFakeTimers();

    const level = Level.fromDefinition(def);
    const persistProgress = jest.fn();
    const returnHome = jest.fn();
    const beginLevel = jest.fn();

    const { result } = renderHook(() =>
      useGameViewModel(level, persistProgress, returnHome, beginLevel),
    );

    while (level.graph.getActiveNodes().length > 0) {
      const removable = level.graph.getActiveNodes().find((n) => n.inDegree === 0);
      expect(removable).toBeDefined();

      act(() => {
        result.current.handleNodePress(removable!.id);
      });

      act(() => {
        result.current.handleRemovalComplete(removable!.id);
      });
    }

    act(() => {
      jest.advanceTimersByTime(340);
    });

    expect(level.graph.getActiveNodes()).toEqual([]);
    expect(returnHome).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

describe('campaign progression', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('only increments currentLevelNumber by one when levels 1-8 complete, even if the final removal completes twice', () => {
    let progress: PlayerProgress = { ...defaultPlayerProgress };

    for (const def of levelDefinitions.slice(0, 8)) {
      const level = Level.fromDefinition(def);
      const { result, persistProgress } = renderGameViewModel(level);

      const lastRemovedNodeId = solveLevel(level, result);

      act(() => {
        result.current.handleRemovalComplete(lastRemovedNodeId);
      });

      act(() => {
        jest.advanceTimersByTime(340);
      });

      progress = applyPersistedUpdates(persistProgress, progress);

      expect(progress.currentLevelNumber).toBe(def.number + 1);
    }
  });
});
