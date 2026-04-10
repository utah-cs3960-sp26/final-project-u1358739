import { Graph } from '../../../src/models/Graph';
import { Node } from '../../../src/models/Node';
import { levelDefinitions } from '../../../src/data/levels';
import { Level } from '../../../src/models/Level';

/**
 * Build a small chain graph: A → B → C
 * Node A has in-degree 0, B has in-degree 1, C has in-degree 1.
 */
function buildChainGraph() {
  const a = new Node(1, 0, 0, [2]);
  const b = new Node(2, 1, 0, [3]);
  const c = new Node(3, 2, 0, []);
  return new Graph([a, b, c]);
}

describe('Graph', () => {
  describe('tapNode on a valid (in-degree 0) node', () => {
    it('immediately removes the tapped node from active nodes', () => {
      const graph = buildChainGraph();

      const result = graph.tapNode(1);
      expect(result.kind).toBe('removed');

      const activeIds = graph.getActiveNodes().map((n) => n.id);
      expect(activeIds).not.toContain(1);
    });

    it('immediately removes edges originating from the tapped node', () => {
      const graph = buildChainGraph();

      graph.tapNode(1);

      const edgePairs = graph.getActiveEdges().map((e) => [e.from.id, e.to.id]);
      // Edge 1→2 should be gone
      expect(edgePairs).not.toContainEqual([1, 2]);
      // Edge 2→3 should still exist
      expect(edgePairs).toContainEqual([2, 3]);
    });

    it('immediately decreases in-degree of neighbors', () => {
      const graph = buildChainGraph();

      const result = graph.tapNode(1);
      expect(result.kind).toBe('removed');
      if (result.kind === 'removed') {
        expect(result.affectedNeighbors.length).toBe(1);
        expect(result.affectedNeighbors[0].inDegree).toBe(0);
      }
    });

    it('active nodes and edges stay consistent through sequential removals', () => {
      const graph = buildChainGraph();

      // Remove A (in-degree 0)
      graph.tapNode(1);

      // After removing A, B should now have in-degree 0
      const nodeB = graph.getNode(2)!;
      expect(nodeB.inDegree).toBe(0);

      // Active nodes should be [B, C]
      let activeIds = graph.getActiveNodes().map((n) => n.id);
      expect(activeIds).toEqual([2, 3]);

      // Active edges should be [B→C] only
      let edgePairs = graph.getActiveEdges().map((e) => [e.from.id, e.to.id]);
      expect(edgePairs).toEqual([[2, 3]]);

      // Remove B (now in-degree 0)
      const resultB = graph.tapNode(2);
      expect(resultB.kind).toBe('removed');

      // B should no longer be in the graph
      expect(graph.getNode(2)).toBeUndefined();

      // Active nodes should be [C]
      activeIds = graph.getActiveNodes().map((n) => n.id);
      expect(activeIds).toEqual([3]);

      // Active edges should be empty
      edgePairs = graph.getActiveEdges().map((e) => [e.from.id, e.to.id]);
      expect(edgePairs).toEqual([]);

      // Remove C
      graph.tapNode(3);
      expect(graph.isComplete()).toBe(true);
    });

    it('getActiveNodes never returns a removed node even when read multiple times', () => {
      const graph = buildChainGraph();

      graph.tapNode(1);

      // Simulate multiple reads (like animation re-renders would do)
      for (let i = 0; i < 10; i++) {
        const activeIds = graph.getActiveNodes().map((n) => n.id);
        expect(activeIds).not.toContain(1);
        expect(activeIds).toEqual([2, 3]);
      }
    });

    it('getActiveEdges never returns edges from a removed node even when read multiple times', () => {
      const graph = buildChainGraph();

      graph.tapNode(1);

      for (let i = 0; i < 10; i++) {
        const edgePairs = graph.getActiveEdges().map((e) => [e.from.id, e.to.id]);
        expect(edgePairs).not.toContainEqual([1, 2]);
      }
    });
  });

  describe('tapNode on an invalid (in-degree > 0) node', () => {
    it('returns blocked and does not mutate the graph', () => {
      const graph = buildChainGraph();

      const result = graph.tapNode(2);
      expect(result.kind).toBe('blocked');

      // Nothing should change
      const activeIds = graph.getActiveNodes().map((n) => n.id);
      expect(activeIds).toEqual([1, 2, 3]);

      const edgePairs = graph.getActiveEdges().map((e) => [e.from.id, e.to.id]);
      expect(edgePairs).toEqual([
        [1, 2],
        [2, 3],
      ]);
    });
  });

  describe('in-degree calculation for shipped levels', () => {
    it.each(levelDefinitions)('level $number ($name) has correct in-degrees', (def) => {
      const level = Level.fromDefinition(def);
      const nodes = level.graph.getActiveNodes();

      for (const node of nodes) {
        const expectedInDegree = nodes.filter((other) =>
          other.neighbors.includes(node.id),
        ).length;
        expect(node.inDegree).toBe(expectedInDegree);
      }
    });
  });

  describe('full solve for shipped levels', () => {
    it.each(levelDefinitions)('level $number ($name) can be solved by always tapping in-degree 0 nodes', (def) => {
      const level = Level.fromDefinition(def);
      const graph = level.graph;
      const totalNodes = graph.getActiveNodes().length;
      let taps = 0;

      while (!graph.isComplete()) {
        const zeroNode = graph.getActiveNodes().find((n) => n.inDegree === 0);
        expect(zeroNode).toBeDefined();
        graph.tapNode(zeroNode!.id);
        taps++;
        expect(taps).toBeLessThanOrEqual(totalNodes);
      }

      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('cycle detection', () => {
    it('two nodes in a cycle are both blocked', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [2]),
        new Node(2, 1, 0, [1]),
      ]);

      expect(graph.tapNode(1)).toEqual({ kind: 'blocked', nodeId: 1 });
      expect(graph.tapNode(2)).toEqual({ kind: 'blocked', nodeId: 2 });
      expect(graph.isComplete()).toBe(false);
    });
  });

  describe('tapping a non-existent node', () => {
    it('returns blocked for an unknown node id', () => {
      const graph = buildChainGraph();

      expect(graph.tapNode(999)).toEqual({ kind: 'blocked', nodeId: 999 });
    });
  });

  describe('diamond / fan-in graph', () => {
    function buildDiamond() {
      return new Graph([
        new Node(1, 0, 0, [3]),
        new Node(2, 1, 0, [3]),
        new Node(3, 2, 0, []),
      ]);
    }

    it('can be solved tapping A then B then C', () => {
      const graph = buildDiamond();

      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });

    it('can be solved tapping B then A then C', () => {
      const graph = buildDiamond();

      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('single node with no edges', () => {
    it('tapping the only node completes the graph', () => {
      const graph = new Graph([new Node(1, 0, 0, [])]);

      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('all nodes at in-degree 0 (no edges)', () => {
    it('tapping all four independent nodes completes the graph', () => {
      const graph = new Graph([
        new Node(1, 0, 0, []),
        new Node(2, 1, 0, []),
        new Node(3, 2, 0, []),
        new Node(4, 3, 0, []),
      ]);

      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.tapNode(4).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('long chain', () => {
    it('tapping B first is blocked', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [2]),
        new Node(2, 1, 0, [3]),
        new Node(3, 2, 0, [4]),
        new Node(4, 3, 0, []),
      ]);

      expect(graph.tapNode(2).kind).toBe('blocked');
    });

    it('tapping A, B, C, D in order completes the graph', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [2]),
        new Node(2, 1, 0, [3]),
        new Node(3, 2, 0, [4]),
        new Node(4, 3, 0, []),
      ]);

      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.tapNode(4).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('wide fan-out', () => {
    it('tapping source first then all targets completes the graph', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [2, 3, 4, 5]),
        new Node(2, 1, 0, []),
        new Node(3, 2, 0, []),
        new Node(4, 3, 0, []),
        new Node(5, 4, 0, []),
      ]);

      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.tapNode(4).kind).toBe('removed');
      expect(graph.tapNode(5).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('wide fan-in', () => {
    it('tapping the sink first is blocked', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [5]),
        new Node(2, 1, 0, [5]),
        new Node(3, 2, 0, [5]),
        new Node(4, 3, 0, [5]),
        new Node(5, 4, 0, []),
      ]);

      expect(graph.tapNode(5).kind).toBe('blocked');
    });

    it('tapping sources first then the sink completes the graph', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [5]),
        new Node(2, 1, 0, [5]),
        new Node(3, 2, 0, [5]),
        new Node(4, 3, 0, [5]),
        new Node(5, 4, 0, []),
      ]);

      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.tapNode(4).kind).toBe('removed');
      expect(graph.tapNode(5).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });

  describe('two disconnected subgraphs', () => {
    it('solving subgraph 2 first then subgraph 1 completes the graph', () => {
      const graph = new Graph([
        new Node(1, 0, 0, [2]),
        new Node(2, 1, 0, []),
        new Node(3, 2, 0, [4]),
        new Node(4, 3, 0, []),
      ]);

      expect(graph.tapNode(3).kind).toBe('removed');
      expect(graph.tapNode(4).kind).toBe('removed');
      expect(graph.tapNode(1).kind).toBe('removed');
      expect(graph.tapNode(2).kind).toBe('removed');
      expect(graph.isComplete()).toBe(true);
    });
  });
});
