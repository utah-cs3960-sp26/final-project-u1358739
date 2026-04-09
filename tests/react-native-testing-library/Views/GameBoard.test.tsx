import { act, renderHook } from '@testing-library/react';

import { getPlayableLevelDefinition } from '../../../src/data/levels';
import { Level } from '../../../src/models/Level';
import { defaultPlayerProgress } from '../../../src/storage/playerProgressStore.shared';
import { useGameViewModel } from '../../../src/viewModels/useGameViewModel';

/**
 * Level 1 has nodes: 1→[2,3], 2→[4], 3→[4], 4→[]
 * Node 1 is the only node with in-degree 0 at the start.
 *
 * These tests exercise the GameViewModel's handleNodePress to verify that
 * after tapping a valid node, the snapshot state exposed to the view
 * (activeNodes, activeEdges) is fully consistent.
 */

function buildLevel(): Level {
  const definition = getPlayableLevelDefinition(1);
  return Level.fromDefinition(definition);
}

function renderGameViewModel(level: Level) {
  const persistProgress = jest.fn();
  const returnHome = jest.fn();
  const beginLevel = jest.fn();

  return renderHook(() =>
    useGameViewModel(level, persistProgress, returnHome, beginLevel),
  );
}

describe('GameBoard after tapping a valid node', () => {
  it('removes the tapped node from active nodes immediately', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    // All four nodes should be active initially
    expect(result.current.activeNodes.map((n: { id: number }) => n.id)).toEqual([1, 2, 3, 4]);

    // Tap node 1 (in-degree 0)
    act(() => {
      result.current.handleNodePress(1);
    });

    // Node 1 should no longer be in active nodes
    const activeIds = result.current.activeNodes.map((n: { id: number }) => n.id);
    expect(activeIds).not.toContain(1);
    expect(activeIds).toEqual([2, 3, 4]);
  });

  it('removes edges from the tapped node immediately', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    act(() => {
      result.current.handleNodePress(1);
    });

    const edgePairs = result.current.activeEdges.map((e: { fromId: number; toId: number }) => [e.fromId, e.toId]);
    expect(edgePairs).not.toContainEqual([1, 2]);
    expect(edgePairs).not.toContainEqual([1, 3]);
    // Edge 2→4 and 3→4 should still exist
    expect(edgePairs).toContainEqual([2, 4]);
    expect(edgePairs).toContainEqual([3, 4]);
  });

  it('updates neighbor in-degrees immediately after removal', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    // Before tap, nodes 2 and 3 have in-degree 1
    const node2Before = result.current.activeNodes.find((n: { id: number }) => n.id === 2)!;
    const node3Before = result.current.activeNodes.find((n: { id: number }) => n.id === 3)!;
    expect(node2Before.inDegree).toBe(1);
    expect(node3Before.inDegree).toBe(1);

    act(() => {
      result.current.handleNodePress(1);
    });

    // After removing node 1, nodes 2 and 3 should have in-degree 0
    const node2After = result.current.activeNodes.find((n: { id: number }) => n.id === 2)!;
    const node3After = result.current.activeNodes.find((n: { id: number }) => n.id === 3)!;
    expect(node2After.inDegree).toBe(0);
    expect(node3After.inDegree).toBe(0);
  });

  it('stays consistent through sequential removals without crashing', () => {
    const level = buildLevel();
    const { result } = renderGameViewModel(level);

    // Tap node 1 (in-degree 0)
    act(() => {
      result.current.handleNodePress(1);
    });

    expect(result.current.activeNodes.map((n: { id: number }) => n.id)).toEqual([2, 3, 4]);

    // Tap node 2 (now in-degree 0)
    act(() => {
      result.current.handleNodePress(2);
    });

    expect(result.current.activeNodes.map((n: { id: number }) => n.id)).toEqual([3, 4]);

    // Tap node 3 (now in-degree 0)
    act(() => {
      result.current.handleNodePress(3);
    });

    expect(result.current.activeNodes.map((n: { id: number }) => n.id)).toEqual([4]);

    // Tap node 4 (now in-degree 0) — completes the level
    act(() => {
      result.current.handleNodePress(4);
    });

    // All nodes should be removed
    expect(result.current.activeNodes).toEqual([]);
  });
});
