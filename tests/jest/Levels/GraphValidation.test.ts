import * as fs from 'fs';
import * as path from 'path';

const levelsDir = path.resolve(__dirname, '../../../src/data/levels');

const levelFiles = fs.readdirSync(levelsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

describe.each(levelFiles)('%s', (fileName) => {
  const filePath = path.join(levelsDir, fileName);
  let json: any;

  beforeAll(() => {
    json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });

  it('has no nodes that list themselves as a neighbor', () => {
    for (const node of json.nodes) {
      expect(node.neighbors).not.toContain(node.id);
    }
  });

  it('has no cycles in the graph', () => {
    // Build adjacency map
    const adjacency = new Map<number, number[]>();
    for (const node of json.nodes) {
      adjacency.set(node.id, node.neighbors);
    }

    // Kahn's algorithm — if we can topologically sort every node, there are no cycles
    const inDegree = new Map<number, number>();
    for (const node of json.nodes) {
      if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
      for (const neighbor of node.neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) + 1);
      }
    }

    const queue: number[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    let visited = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      visited++;
      for (const neighbor of adjacency.get(current) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    expect(visited).toBe(json.nodes.length);
  });
});
