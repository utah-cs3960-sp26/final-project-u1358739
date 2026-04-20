import type { LevelDefinition } from '../../models/Level';

import level1Definition from './level1.json';
import level2Definition from './level2.json';
import level3Definition from './level3.json';
import level4Definition from './level4.json';
import level5Definition from './level5.json';
import level6Definition from './level6.json';
import level7Definition from './level7.json';
import level8Definition from './level8.json';
import level9Definition from './level9.json';
import level10Definition from './level10.json';
import level11Definition from './level11.json';
import level12Definition from './level12.json';
import level13Definition from './level13.json';
import level14Definition from './level14.json';
import level15Definition from './level15.json';
import level16Definition from './level16.json';
import level17Definition from './level17.json';
import level18Definition from './level18.json';
import level19Definition from './level19.json';
import level20Definition from './level20.json';
import level21Definition from './level21.json';
import level22Definition from './level22.json';
import level23Definition from './level23.json';
import level24Definition from './level24.json';
import level25Definition from './level25.json';
import level26Definition from './level26.json';
import level27Definition from './level27.json';
import level28Definition from './level28.json';
import level29Definition from './level29.json';
import level30Definition from './level30.json';
import level31Definition from './level31.json';
import level32Definition from './level32.json';
import level33Definition from './level33.json';
import level34Definition from './level34.json';
import level35Definition from './level35.json';
import level36Definition from './level36.json';
import level37Definition from './level37.json';
import level38Definition from './level38.json';
import level39Definition from './level39.json';
import level40Definition from './level40.json';
import level41Definition from './level41.json';
import level42Definition from './level42.json';
import level43Definition from './level43.json';
import level44Definition from './level44.json';
import level45Definition from './level45.json';
import level46Definition from './level46.json';
import level47Definition from './level47.json';
import level48Definition from './level48.json';
import level49Definition from './level49.json';
import level50Definition from './level50.json';
import level51Definition from './level51.json';
import level52Definition from './level52.json';
import level53Definition from './level53.json';
import level54Definition from './level54.json';
import level55Definition from './level55.json';
import level56Definition from './level56.json';
import level57Definition from './level57.json';
import level58Definition from './level58.json';
import level59Definition from './level59.json';
import level60Definition from './level60.json';
import level61Definition from './level61.json';

export const levelDefinitions: LevelDefinition[] = [
  level1Definition,
  level2Definition,
  level3Definition,
  level4Definition,
  level5Definition,
  level6Definition,
  level7Definition,
  level8Definition,
  level9Definition,
  level10Definition,
  level11Definition,
  level12Definition,
  level13Definition,
  level14Definition,
  level15Definition,
  level16Definition,
  level17Definition,
  level18Definition,
  level19Definition,
  level20Definition,
  level21Definition,
  level22Definition,
  level23Definition,
  level24Definition,
  level25Definition,
  level26Definition,
  level27Definition,
  level28Definition,
  level29Definition,
  level30Definition,
  level31Definition,
  level32Definition,
  level33Definition,
  level34Definition,
  level35Definition,
  level36Definition,
  level37Definition,
  level38Definition,
  level39Definition,
  level40Definition,
  level41Definition,
  level42Definition,
  level43Definition,
  level44Definition,
  level45Definition,
  level46Definition,
  level47Definition,
  level48Definition,
  level49Definition,
  level50Definition,
  level51Definition,
  level52Definition,
  level53Definition,
  level54Definition,
  level55Definition,
  level56Definition,
  level57Definition,
  level58Definition,
  level59Definition,
  level60Definition,
  level61Definition,
].sort((left, right) => left.number - right.number);

export const totalLevelCount = levelDefinitions.length;

export function getLevelDefinition(levelNumber: number): LevelDefinition | undefined {
  return levelDefinitions.find((levelDefinition) => levelDefinition.number === levelNumber);
}

export function getPlayableLevelDefinition(levelNumber: number): LevelDefinition {
  return getLevelDefinition(levelNumber) ?? levelDefinitions[levelDefinitions.length - 1];
}
