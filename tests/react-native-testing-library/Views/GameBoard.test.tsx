import { act, renderHook } from '@testing-library/react';

import { getPlayableLevelDefinition } from '../../../src/data/levels';
import { Level } from '../../../src/models/Level';
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

    expect(result.current.livesRemaining).toBe(1);
    expect(result.current.blockedNodeId).toBe(2);
  });
});
