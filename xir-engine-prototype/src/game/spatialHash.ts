import { Enemy } from "./types";

export class EnemySpatialHash {
  private readonly sectorSize: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly buckets: Enemy[][] = [];

  constructor(mapCols: number, mapRows: number, sectorSize = 8) {
    this.sectorSize = sectorSize;
    this.cols = Math.ceil(mapCols / sectorSize);
    this.rows = Math.ceil(mapRows / sectorSize);

    for (let i = 0; i < this.cols * this.rows; i += 1) {
      this.buckets.push([]);
    }
  }

  rebuild(enemies: Enemy[]): void {
    for (const bucket of this.buckets) bucket.length = 0;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const sx = Math.max(0, Math.min(this.cols - 1, Math.floor(enemy.cell.x / this.sectorSize)));
      const sy = Math.max(0, Math.min(this.rows - 1, Math.floor(enemy.cell.y / this.sectorSize)));
      this.buckets[sy * this.cols + sx].push(enemy);
    }
  }

  query(cx: number, cy: number, range: number): Enemy[] {
    const minX = Math.max(0, Math.floor((cx - range) / this.sectorSize));
    const maxX = Math.min(this.cols - 1, Math.floor((cx + range) / this.sectorSize));
    const minY = Math.max(0, Math.floor((cy - range) / this.sectorSize));
    const maxY = Math.min(this.rows - 1, Math.floor((cy + range) / this.sectorSize));
    const results: Enemy[] = [];

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        results.push(...this.buckets[y * this.cols + x]);
      }
    }

    return results;
  }
}
