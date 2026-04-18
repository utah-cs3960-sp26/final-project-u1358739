import { Graph } from './Graph';
import { Node } from './Node';

export type LevelNodeDefinition = {
  id: number;
  position: {
    x: number;
    y: number;
  };
  neighbors: number[];
};

export type LevelDefinition = {
  id: string;
  number: number;
  name: string;
  grid: {
    width: number;
    height: number;
  };
  timeLimit: number | string;
  nodes: LevelNodeDefinition[];
};

export type LevelTapResult =
  | {
      kind: 'blocked';
      nodeId: number;
      livesRemaining: number;
      isOutOfLives: boolean;
    }
  | {
      kind: 'removed';
      nodeId: number;
      affectedNeighbors: Array<{ id: number; inDegree: number }>;
      livesRemaining: number;
      isComplete: boolean;
    };

const DEFAULT_MAX_LIVES = 3;

export class Level {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly graph: Graph;
  readonly timeLimit: number | null;
  readonly maxLives: number;
  private livesRemaining: number;

  private constructor(id: string, number: number, name: string, gridWidth: number, gridHeight: number, graph: Graph, timeLimit: number | null, maxLives: number) {
    this.id = id;
    this.number = number;
    this.name = name;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.graph = graph;
    this.timeLimit = timeLimit;
    this.maxLives = maxLives;
    this.livesRemaining = maxLives;
  }

  tapNode(nodeId: number): LevelTapResult {
    const result = this.graph.tapNode(nodeId);

    if (result.kind === 'blocked') {
      this.livesRemaining = Math.max(0, this.livesRemaining - 1);

      return {
        kind: 'blocked',
        nodeId,
        livesRemaining: this.livesRemaining,
        isOutOfLives: this.livesRemaining === 0,
      };
    }

    return {
      kind: 'removed',
      nodeId: result.node.id,
      affectedNeighbors: result.affectedNeighbors.map((n) => ({
        id: n.id,
        inDegree: n.inDegree,
      })),
      livesRemaining: this.livesRemaining,
      isComplete: this.graph.isComplete(),
    };
  }

  getLivesRemaining(): number {
    return this.livesRemaining;
  }

  isOutOfLives(): boolean {
    return this.livesRemaining === 0;
  }

  static fromDefinition(definition: LevelDefinition) {
    validateLevelDefinition(definition);

    const nodes = definition.nodes.map(
      (nodeDefinition) =>
        new Node(
          nodeDefinition.id,
          nodeDefinition.position.x,
          nodeDefinition.position.y,
          nodeDefinition.neighbors,
        ),
    );

    const timeLimit = typeof definition.timeLimit === 'number' ? definition.timeLimit : null;

    return new Level(
      definition.id,
      definition.number,
      definition.name,
      definition.grid.width,
      definition.grid.height,
      new Graph(nodes),
      timeLimit,
      DEFAULT_MAX_LIVES,
    );
  }
}

function validateLevelDefinition(definition: LevelDefinition) {
  if (definition.grid.width <= 0 || definition.grid.height <= 0) {
    throw new Error(`Level ${definition.id} must have a positive grid size.`);
  }

  const knownIds = new Set<number>();

  for (const node of definition.nodes) {
    if (knownIds.has(node.id)) {
      throw new Error(`Level ${definition.id} contains duplicate node id ${node.id}.`);
    }

    knownIds.add(node.id);

    if (node.position.x < 0 || node.position.x >= definition.grid.width) {
      throw new Error(`Node ${node.id} in ${definition.id} has an x position outside the grid.`);
    }

    if (node.position.y < 0 || node.position.y >= definition.grid.height) {
      throw new Error(`Node ${node.id} in ${definition.id} has a y position outside the grid.`);
    }
  }

  for (const node of definition.nodes) {
    for (const neighborId of node.neighbors) {
      if (!knownIds.has(neighborId)) {
        throw new Error(`Node ${node.id} in ${definition.id} references unknown neighbor ${neighborId}.`);
      }
    }
  }
}
