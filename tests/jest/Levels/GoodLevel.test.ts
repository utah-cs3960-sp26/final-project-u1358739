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

  it('has no nodes on the outside layer of the grid', () => {
    const maxX = json.grid.width - 1;
    const maxY = json.grid.height - 1;

    for (const node of json.nodes) {
      expect(node.position.x).toBeGreaterThan(0);
      expect(node.position.x).toBeLessThan(maxX);
      expect(node.position.y).toBeGreaterThan(0);
      expect(node.position.y).toBeLessThan(maxY);
    }
  });

  it('has all nodes at least 2 positions away from every other node', () => {
    const nodes = json.nodes;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = Math.abs(nodes[i].position.x - nodes[j].position.x);
        const dy = Math.abs(nodes[i].position.y - nodes[j].position.y);
        // "2 positions horizontally or vertically" — at least one axis must
        // have a distance of >= 2
        expect(dx >= 2 || dy >= 2).toBe(true);
      }
    }
  });
});
