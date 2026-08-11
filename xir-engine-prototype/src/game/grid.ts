import { CORE_SIZE, CORE_X, CORE_Y, MAP_COLS, MAP_ROWS } from "./constants";

export type Cell = {
  x: number;
  y: number;
};

export function indexOf(x: number, y: number): number {
  return y * MAP_COLS + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_COLS && y < MAP_ROWS;
}

export function isCoreCell(x: number, y: number): boolean {
  return x >= CORE_X && x < CORE_X + CORE_SIZE && y >= CORE_Y && y < CORE_Y + CORE_SIZE;
}

export function cellCenter(cell: Cell): { x: number; y: number } {
  return {
    x: cell.x + 0.5,
    y: cell.y + 0.5
  };
}

export function distanceCells(a: Cell, b: Cell): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function coreCenter(): Cell {
  return {
    x: CORE_X + Math.floor(CORE_SIZE / 2),
    y: CORE_Y + Math.floor(CORE_SIZE / 2)
  };
}

export function makeSpawnPoints(): Cell[] {
  const maxX = MAP_COLS - 1;
  const maxY = MAP_ROWS - 1;
  const quarterX = Math.floor(MAP_COLS / 4);
  const halfX = Math.floor(MAP_COLS / 2);
  const threeQuarterX = Math.floor((MAP_COLS * 3) / 4);
  const quarterY = Math.floor(MAP_ROWS / 4);
  const halfY = Math.floor(MAP_ROWS / 2);
  const threeQuarterY = Math.floor((MAP_ROWS * 3) / 4);

  return [
    { x: 0, y: 0 },
    { x: halfX, y: 0 },
    { x: maxX, y: 0 },
    { x: maxX, y: halfY },
    { x: maxX, y: maxY },
    { x: halfX, y: maxY },
    { x: 0, y: maxY },
    { x: 0, y: halfY },
    { x: quarterX, y: 0 },
    { x: threeQuarterX, y: 0 },
    { x: maxX, y: quarterY },
    { x: maxX, y: threeQuarterY },
    { x: threeQuarterX, y: maxY },
    { x: quarterX, y: maxY },
    { x: 0, y: threeQuarterY },
    { x: 0, y: quarterY }
  ];
}
