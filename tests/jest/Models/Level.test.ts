import { Level, type LevelDefinition } from '../../../src/models/Level';

/**
 * Build a simple chain level: 1 -> 2 -> 3
 * Node 1 has in-degree 0, node 2 has in-degree 1, node 3 has in-degree 1.
 */
function buildChainLevel(): Level {
  const definition: LevelDefinition = {
    id: 'test-chain',
    number: 1,
    name: 'Test Chain',
    grid: { width: 4, height: 4 },
    timeLimit: 'none',
    nodes: [
      { id: 1, position: { x: 0, y: 0 }, neighbors: [2] },
      { id: 2, position: { x: 1, y: 0 }, neighbors: [3] },
      { id: 3, position: { x: 2, y: 0 }, neighbors: [] },
    ],
  };
  return Level.fromDefinition(definition);
}

describe('Level lives', () => {
  it('starts with 3 lives', () => {
    const level = buildChainLevel();

    expect(level.getLivesRemaining()).toBe(3);
    expect(level.isOutOfLives()).toBe(false);
  });

  it('tap a blocked node three times until isOutOfLives becomes true', () => {
    const level = buildChainLevel();

    const result1 = level.tapNode(2);
    expect(result1.kind).toBe('blocked');
    expect(result1.livesRemaining).toBe(2);
    if (result1.kind === 'blocked') {
      expect(result1.isOutOfLives).toBe(false);
    }
    expect(level.getLivesRemaining()).toBe(2);

    const result2 = level.tapNode(2);
    expect(result2.kind).toBe('blocked');
    expect(result2.livesRemaining).toBe(1);
    if (result2.kind === 'blocked') {
      expect(result2.isOutOfLives).toBe(false);
    }
    expect(level.getLivesRemaining()).toBe(1);

    const result3 = level.tapNode(2);
    expect(result3.kind).toBe('blocked');
    expect(result3.livesRemaining).toBe(0);
    if (result3.kind === 'blocked') {
      expect(result3.isOutOfLives).toBe(true);
    }
    expect(level.getLivesRemaining()).toBe(0);
    expect(level.isOutOfLives()).toBe(true);
  });

  it('tapping a valid node does not change lives', () => {
    const level = buildChainLevel();

    const result = level.tapNode(1);
    expect(result.kind).toBe('removed');
    expect(result.livesRemaining).toBe(3);
    expect(level.getLivesRemaining()).toBe(3);
  });

  it('mixed valid and invalid taps only decrement lives on invalid taps', () => {
    const level = buildChainLevel();

    const result1 = level.tapNode(1);
    expect(result1.kind).toBe('removed');
    expect(result1.livesRemaining).toBe(3);

    const result2 = level.tapNode(3);
    expect(result2.kind).toBe('blocked');
    expect(result2.livesRemaining).toBe(2);

    const result3 = level.tapNode(2);
    expect(result3.kind).toBe('removed');
    expect(result3.livesRemaining).toBe(2);

    const result4 = level.tapNode(3);
    expect(result4.kind).toBe('removed');
    expect(result4.livesRemaining).toBe(2);

    expect(level.getLivesRemaining()).toBe(2);
  });
});
