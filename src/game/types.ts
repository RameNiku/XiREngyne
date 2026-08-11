import { Container, Graphics, Sprite, Text } from "pixi.js";
import { EnemyDefinition } from "../data/enemies";
import { TowerDefinition } from "../data/towers";
import { Cell } from "./grid";

export type Tower = {
  id: number;
  definition: TowerDefinition;
  cell: Cell;
  cooldownLeft: number;
  sprite: Sprite;
  rangeGraphic: Graphics;
};

export type Enemy = {
  id: number;
  definition: EnemyDefinition;
  health: number;
  maxHealth: number;
  cell: Cell;
  nextCell: Cell;
  x: number;
  y: number;
  sprite: Container;
  body: Graphics;
  healthText: Text;
  alive: boolean;
};

export type Projectile = {
  id: number;
  x: number;
  y: number;
  speed: number;
  damage: number;
  areaRadius: number;
  pushCells: number;
  target: Enemy;
  graphic: Graphics;
  alive: boolean;
};
