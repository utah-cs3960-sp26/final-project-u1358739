import type { LevelDefinition } from '../../models/Level';

import levelOne from './level1.json';
import levelTwo from './level2.json';
import levelThree from './level3.json';
import levelFour from './level4.json';
import levelFive from './level5.json';
import levelSix from './level6.json';
import levelSeven from './level7.json';
import levelEight from './level8.json';

export const levelDefinitions: LevelDefinition[] = [levelOne, levelTwo, levelThree, levelFour, levelFive, levelSix, levelSeven, levelEight].sort(
  (left, right) => left.number - right.number,
);

export const totalLevelCount = levelDefinitions.length;

export function getLevelDefinition(levelNumber: number): LevelDefinition | undefined {
  return levelDefinitions.find((levelDefinition) => levelDefinition.number === levelNumber);
}

export function getPlayableLevelDefinition(levelNumber: number): LevelDefinition {
  return getLevelDefinition(levelNumber) ?? levelDefinitions[levelDefinitions.length - 1];
}
