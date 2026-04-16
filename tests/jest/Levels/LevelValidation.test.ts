import * as fs from 'fs';
import * as path from 'path';

const levelsDir = path.resolve(__dirname, '../../../src/data/levels');

// Collect every .json file in the levels directory
const levelFiles = fs.readdirSync(levelsDir)
  .filter((f) => f.endsWith('.json'))
  .sort();

describe.each(levelFiles)('%s', (fileName) => {
  const filePath = path.join(levelsDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf-8');

  let json: any;

  it('is valid JSON', () => {
    expect(() => {
      json = JSON.parse(raw);
    }).not.toThrow();
  });

  // Parse once for the remaining tests (if the JSON is invalid the test above
  // already fails and these will fail gracefully with a clear message).
  beforeAll(() => {
    try {
      json = JSON.parse(raw);
    } catch {
      // intentionally left empty — the "is valid JSON" test reports the failure
    }
  });

  it('has all required top-level fields', () => {
    expect(json).toBeDefined();
    expect(json).toHaveProperty('id');
    expect(json).toHaveProperty('number');
    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('grid');
    expect(json).toHaveProperty('timeLimit');
    expect(json).toHaveProperty('nodes');

    // grid sub-fields
    expect(json.grid).toHaveProperty('width');
    expect(json.grid).toHaveProperty('height');

    // each node has required fields
    for (const node of json.nodes) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('position');
      expect(node.position).toHaveProperty('x');
      expect(node.position).toHaveProperty('y');
      expect(node).toHaveProperty('neighbors');
    }
  });

  it('has no duplicate node IDs', () => {
    expect(json).toBeDefined();
    const ids = json.nodes.map((n: any) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has a grid width that is not zero', () => {
    expect(json).toBeDefined();
    expect(json.grid.width).not.toBe(0);
  });

  it('has a grid height that is not zero', () => {
    expect(json).toBeDefined();
    expect(json.grid.height).not.toBe(0);
  });

  it('has a non-negative grid width', () => {
    expect(json).toBeDefined();
    expect(json.grid.width).toBeGreaterThan(0);
  });

  it('has a non-negative grid height', () => {
    expect(json).toBeDefined();
    expect(json.grid.height).toBeGreaterThan(0);
  });

  it('has all node x positions within grid bounds', () => {
    expect(json).toBeDefined();
    for (const node of json.nodes) {
      expect(node.position.x).toBeGreaterThanOrEqual(0);
      expect(node.position.x).toBeLessThan(json.grid.width);
    }
  });

  it('has all node y positions within grid bounds', () => {
    expect(json).toBeDefined();
    for (const node of json.nodes) {
      expect(node.position.y).toBeGreaterThanOrEqual(0);
      expect(node.position.y).toBeLessThan(json.grid.height);
    }
  });

  it('has all neighbor references pointing to existing node IDs', () => {
    expect(json).toBeDefined();
    const ids = new Set(json.nodes.map((n: any) => n.id));
    for (const node of json.nodes) {
      for (const neighborId of node.neighbors) {
        expect(ids).toContain(neighborId);
      }
    }
  });
});
