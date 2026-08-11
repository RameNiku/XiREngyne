import { CORE_SIZE, CORE_X, CORE_Y, MAP_COLS, MAP_ROWS } from "./constants";
import { Cell, inBounds, indexOf, isCoreCell } from "./grid";

const BLOCKED = -2;
const UNVISITED = -1;

export class FlowField {
  readonly distances = new Int32Array(MAP_COLS * MAP_ROWS);
  private readonly queueX = new Int16Array(MAP_COLS * MAP_ROWS);
  private readonly queueY = new Int16Array(MAP_COLS * MAP_ROWS);

  constructor(private readonly blocked: Uint8Array) {
    this.rebuild();
  }

  rebuild(): void {
    this.distances.fill(UNVISITED);

    for (let i = 0; i < this.blocked.length; i += 1) {
      if (this.blocked[i]) {
        this.distances[i] = BLOCKED;
      }
    }

    let head = 0;
    let tail = 0;

    for (let y = CORE_Y; y < CORE_Y + CORE_SIZE; y += 1) {
      for (let x = CORE_X; x < CORE_X + CORE_SIZE; x += 1) {
        const idx = indexOf(x, y);
        this.distances[idx] = 0;
        this.queueX[tail] = x;
        this.queueY[tail] = y;
        tail += 1;
      }
    }

    while (head < tail) {
      const x = this.queueX[head];
      const y = this.queueY[head];
      const baseDistance = this.distances[indexOf(x, y)];
      head += 1;

      if (this.visit(x + 1, y, baseDistance, tail)) tail += 1;
      if (this.visit(x - 1, y, baseDistance, tail)) tail += 1;
      if (this.visit(x, y + 1, baseDistance, tail)) tail += 1;
      if (this.visit(x, y - 1, baseDistance, tail)) tail += 1;
    }
  }

  canReachCore(cell: Cell): boolean {
    if (!inBounds(cell.x, cell.y)) return false;
    return this.distances[indexOf(cell.x, cell.y)] >= 0;
  }

  nextCell(cell: Cell): Cell {
    if (isCoreCell(cell.x, cell.y)) return cell;

    const currentDistance = this.distances[indexOf(cell.x, cell.y)];
    let best = cell;
    let bestDistance = currentDistance >= 0 ? currentDistance : Number.MAX_SAFE_INTEGER;

    const candidates = [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x - 1, y: cell.y },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x, y: cell.y - 1 }
    ];

    for (const candidate of candidates) {
      if (!inBounds(candidate.x, candidate.y)) continue;
      const distance = this.distances[indexOf(candidate.x, candidate.y)];
      if (distance >= 0 && distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }

    return best;
  }

  private visit(x: number, y: number, baseDistance: number, tail: number): boolean {
    if (!inBounds(x, y)) return false;
    const idx = indexOf(x, y);
    if (this.distances[idx] !== UNVISITED) return false;
    this.distances[idx] = baseDistance + 1;
    this.queueX[tail] = x;
    this.queueY[tail] = y;
    return true;
  }
}
