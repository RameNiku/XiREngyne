import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle
} from "pixi.js";
import { ENEMIES } from "../data/enemies";
import { TowerDefinition, TowerKind, TOWERS } from "../data/towers";
import {
  CORE_SIZE,
  CORE_VISION_RANGE,
  CORE_X,
  CORE_Y,
  MAP_COLS,
  MAP_ROWS,
  MAX_DT,
  STARTING_METAL,
  STARTING_XIR,
  TILE_SIZE
} from "../game/constants";
import { FlowField } from "../game/flowField";
import { Cell, cellCenter, coreCenter, distanceCells, inBounds, indexOf, isCoreCell, makeSpawnPoints } from "../game/grid";
import { EnemySpatialHash } from "../game/spatialHash";
import { Enemy, Projectile, Tower } from "../game/types";
import { COLORS } from "../render/colors";
import { SketchButton } from "../ui/button";
import { SketchPanel } from "../ui/panel";
import { sketchText } from "../ui/text";
import { Scene } from "./scene";
import { GameAssets } from "./sceneManager";

type GameCallbacks = {
  onQuit: () => void;
};

type Resources = {
  metal: number;
  wave: number;
  xir: number;
  kills: number;
};

const MAP_WIDTH_PX = MAP_COLS * TILE_SIZE;
const MAP_HEIGHT_PX = MAP_ROWS * TILE_SIZE;

export class GameScene implements Scene {
  readonly root = new Container();

  private readonly world = new Container();
  private readonly gridLayer = new Graphics();
  private readonly visionLayer = new Graphics();
  private readonly towerLayer = new Container();
  private readonly enemyLayer = new Container();
  private readonly projectileLayer = new Container();
  private readonly previewLayer = new Graphics();
  private readonly uiLayer = new Container();

  private readonly blocked = new Uint8Array(MAP_COLS * MAP_ROWS);
  private readonly flowField = new FlowField(this.blocked);
  private readonly spatialHash = new EnemySpatialHash(MAP_COLS, MAP_ROWS);
  private readonly spawnPoints = makeSpawnPoints();
  private readonly keys = new Set<string>();
  private readonly towers: Tower[] = [];
  private readonly enemies: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly resources: Resources = {
    metal: STARTING_METAL,
    wave: 0,
    xir: STARTING_XIR,
    kills: 0
  };

  private readonly statusPanel = new SketchPanel(178, 112);
  private readonly statusText = sketchText("", 20);
  private readonly selectedPanel = new SketchPanel(360, 132);
  private readonly selectedText = sketchText("Select a tower", 18, COLORS.mutedWhite);
  private readonly shopPanel = new SketchPanel(286, 554, "SHOP");
  private nextWaveButton!: SketchButton;
  private quitButton!: SketchButton;
  private readonly gameOverPanel = new SketchPanel(420, 210, "CORE BREACHED");
  private readonly gameOverText = sketchText("", 20, COLORS.mutedWhite);
  private backToMenuButton!: SketchButton;

  private selectedTower?: TowerDefinition;
  private towerId = 1;
  private enemyId = 1;
  private projectileId = 1;
  private zoom = 0.82;
  private cameraX = MAP_WIDTH_PX / 2;
  private cameraY = MAP_HEIGHT_PX / 2;
  private pointerX = 0;
  private pointerY = 0;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private activeWave = false;
  private spawnLeft = 0;
  private spawnTimer = 0;
  private nextWaveDelay = 0.9;
  private lastStatus = "";
  private gameOver = false;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    this.keys.add(event.key.toLowerCase());
    if (event.key === "Escape") {
      if (this.selectedTower) {
        this.selectedTower = undefined;
        this.updateSelectedPanel();
      } else {
        this.callbacks.onQuit();
      }
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const before = this.screenToWorld(event.clientX, event.clientY);
    const nextZoom = Math.max(0.32, Math.min(1.9, this.zoom * (event.deltaY < 0 ? 1.12 : 0.88)));
    this.zoom = nextZoom;
    this.cameraX = before.x - (event.clientX - this.app.screen.width / 2) / this.zoom;
    this.cameraY = before.y - (event.clientY - this.app.screen.height / 2) / this.zoom;
    this.clampCamera();
    this.applyCamera();
    this.updatePlacementPreview();
  };

  constructor(
    private readonly app: Application,
    private readonly assets: GameAssets,
    private readonly callbacks: GameCallbacks
  ) {
    this.root.eventMode = "static";
    this.world.addChild(this.gridLayer, this.visionLayer, this.towerLayer, this.enemyLayer, this.projectileLayer, this.previewLayer);
    this.root.addChild(this.world, this.uiLayer);
    this.drawGrid();
    this.drawCore();
    this.buildUi();
    this.redrawVision();
    this.applyCamera();

    this.root.on("pointermove", (event: FederatedPointerEvent) => this.handlePointerMove(event));
    this.root.on("pointerdown", (event: FederatedPointerEvent) => this.handlePointerDown(event));
    this.root.on("pointerup", () => {
      this.dragging = false;
    });
    this.root.on("pointerupoutside", () => {
      this.dragging = false;
    });

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.app.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  update(dt: number): void {
    if (this.gameOver) return;

    const safeDt = Math.min(dt, MAX_DT);
    this.updateCamera(safeDt);
    this.updateWave(safeDt);
    this.updateEnemies(safeDt);
    this.spatialHash.rebuild(this.enemies);
    this.updateTowers(safeDt);
    this.updateProjectiles(safeDt);
    this.cleanupDeadObjects();
    this.updateStatusPanel();
    this.updatePlacementPreview();
  }

  resize(width: number, height: number): void {
    this.root.hitArea = new Rectangle(0, 0, width, height);
    this.statusPanel.position.set(32, 34);
    this.selectedPanel.position.set(32, height - 166);
    this.shopPanel.position.set(width - 326, Math.max(88, height * 0.18));
    this.nextWaveButton.position.set(width - 310, height - 82);
    this.quitButton.position.set(32, height - 72);
    this.gameOverPanel.position.set(width / 2 - 210, height / 2 - 105);
    this.gameOverText.position.set(28, 66);
    this.backToMenuButton.position.set(100, 142);
    this.applyCamera();
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.app.canvas.removeEventListener("wheel", this.onWheel);
    this.root.destroy({ children: true });
  }

  private buildUi(): void {
    this.statusPanel.addChild(this.statusText);
    this.statusText.position.set(16, 14);

    this.selectedPanel.addChild(this.selectedText);
    this.selectedText.position.set(20, 18);

    this.nextWaveButton = new SketchButton("NEXT WAVE", 196, 54, () => {
      if (!this.activeWave) {
        this.nextWaveDelay = 0;
      }
    });
    this.quitButton = new SketchButton("RETURN", 154, 48, this.callbacks.onQuit);
    this.backToMenuButton = new SketchButton("MENU", 220, 54, this.callbacks.onQuit);
    this.gameOverPanel.visible = false;
    this.gameOverText.visible = false;
    this.backToMenuButton.visible = false;
    this.gameOverPanel.addChild(this.gameOverText, this.backToMenuButton);

    this.uiLayer.addChild(this.statusPanel, this.selectedPanel, this.shopPanel, this.nextWaveButton, this.quitButton, this.gameOverPanel);
    this.buildShopItems();
    this.updateSelectedPanel();
    this.updateStatusPanel();
  }

  private buildShopItems(): void {
    let y = 58;

    for (const tower of TOWERS) {
      const slot = new Container();
      const frame = new Graphics();
      const icon = new Sprite(this.assets.towers[tower.kind]);
      const label = sketchText(`${tower.name}\n${tower.cost} metal`, 15, COLORS.white);

      slot.eventMode = "static";
      slot.cursor = "pointer";
      frame.rect(16, 0, 244, 94).fill({ color: COLORS.black, alpha: 0.5 }).stroke({ color: COLORS.dimLine, width: 2 });
      icon.anchor.set(0.5);
      icon.position.set(66, 47);
      icon.width = 62;
      icon.height = 62;
      label.position.set(112, 22);
      slot.position.set(0, y);
      slot.addChild(frame, icon, label);
      slot.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation();
        this.selectedTower = tower;
        this.updateSelectedPanel();
        this.updatePlacementPreview();
      });

      this.shopPanel.addChild(slot);
      y += 110;
    }
  }

  private drawGrid(): void {
    this.gridLayer.clear();

    for (let x = 0; x <= MAP_COLS; x += 1) {
      const px = x * TILE_SIZE;
      this.gridLayer.moveTo(px, 0).lineTo(px, MAP_HEIGHT_PX);
    }

    for (let y = 0; y <= MAP_ROWS; y += 1) {
      const py = y * TILE_SIZE;
      this.gridLayer.moveTo(0, py).lineTo(MAP_WIDTH_PX, py);
    }

    this.gridLayer.stroke({ color: COLORS.dimLine, width: 1, alpha: 0.54 });
  }

  private drawCore(): void {
    const core = new Graphics();
    core
      .rect(CORE_X * TILE_SIZE, CORE_Y * TILE_SIZE, CORE_SIZE * TILE_SIZE, CORE_SIZE * TILE_SIZE)
      .fill({ color: COLORS.black, alpha: 0.96 })
      .stroke({ color: COLORS.white, width: 4 });
    core
      .moveTo((CORE_X + 0.35) * TILE_SIZE, (CORE_Y + 0.35) * TILE_SIZE)
      .lineTo((CORE_X + CORE_SIZE - 0.35) * TILE_SIZE, (CORE_Y + CORE_SIZE - 0.35) * TILE_SIZE)
      .moveTo((CORE_X + CORE_SIZE - 0.35) * TILE_SIZE, (CORE_Y + 0.35) * TILE_SIZE)
      .lineTo((CORE_X + 0.35) * TILE_SIZE, (CORE_Y + CORE_SIZE - 0.35) * TILE_SIZE)
      .stroke({ color: COLORS.white, width: 3 });
    this.towerLayer.addChild(core);
  }

  private redrawVision(): void {
    this.visionLayer.clear();
    const core = coreCenter();
    this.drawDashedCircle(
      this.visionLayer,
      (core.x + 0.5) * TILE_SIZE,
      (core.y + 0.5) * TILE_SIZE,
      CORE_VISION_RANGE * TILE_SIZE,
      COLORS.blue,
      0.48
    );

    for (const tower of this.towers) {
      this.drawDashedCircle(
        this.visionLayer,
        (tower.cell.x + 0.5) * TILE_SIZE,
        (tower.cell.y + 0.5) * TILE_SIZE,
        CORE_VISION_RANGE * TILE_SIZE,
        COLORS.blue,
        0.22
      );
    }
  }

  private drawDashedCircle(graphics: Graphics, cx: number, cy: number, radius: number, color: number, alpha: number): void {
    const segments = 64;
    for (let i = 0; i < segments; i += 2) {
      const start = (i / segments) * Math.PI * 2;
      const end = ((i + 1) / segments) * Math.PI * 2;
      graphics
        .moveTo(cx + Math.cos(start) * radius, cy + Math.sin(start) * radius)
        .lineTo(cx + Math.cos(end) * radius, cy + Math.sin(end) * radius);
    }
    graphics.stroke({ color, width: 2, alpha });
  }

  private handlePointerMove(event: FederatedPointerEvent): void {
    this.pointerX = event.global.x;
    this.pointerY = event.global.y;

    if (this.dragging) {
      const dx = (this.lastPointerX - this.pointerX) / this.zoom;
      const dy = (this.lastPointerY - this.pointerY) / this.zoom;
      this.cameraX += dx;
      this.cameraY += dy;
      this.clampCamera();
      this.applyCamera();
    }

    this.lastPointerX = this.pointerX;
    this.lastPointerY = this.pointerY;
    this.updatePlacementPreview();
  }

  private handlePointerDown(event: FederatedPointerEvent): void {
    this.pointerX = event.global.x;
    this.pointerY = event.global.y;

    if (this.selectedTower) {
      this.tryPlaceSelectedTower();
      return;
    }

    this.dragging = true;
    this.lastPointerX = this.pointerX;
    this.lastPointerY = this.pointerY;
  }

  private updateCamera(dt: number): void {
    const speed = 1000 / this.zoom;
    let dx = 0;
    let dy = 0;

    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

    if (dx || dy) {
      const length = Math.hypot(dx, dy);
      this.cameraX += (dx / length) * speed * dt;
      this.cameraY += (dy / length) * speed * dt;
      this.clampCamera();
      this.applyCamera();
    }
  }

  private applyCamera(): void {
    this.world.scale.set(this.zoom);
    this.world.position.set(this.app.screen.width / 2 - this.cameraX * this.zoom, this.app.screen.height / 2 - this.cameraY * this.zoom);
  }

  private clampCamera(): void {
    const halfW = this.app.screen.width / (2 * this.zoom);
    const halfH = this.app.screen.height / (2 * this.zoom);
    this.cameraX = Math.max(halfW, Math.min(MAP_WIDTH_PX - halfW, this.cameraX));
    this.cameraY = Math.max(halfH, Math.min(MAP_HEIGHT_PX - halfH, this.cameraY));
  }

  private screenToWorld(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.world.position.x) / this.zoom,
      y: (y - this.world.position.y) / this.zoom
    };
  }

  private pointerCell(): Cell {
    const world = this.screenToWorld(this.pointerX, this.pointerY);
    return {
      x: Math.floor(world.x / TILE_SIZE),
      y: Math.floor(world.y / TILE_SIZE)
    };
  }

  private canBuildAt(cell: Cell, tower: TowerDefinition): boolean {
    if (!inBounds(cell.x, cell.y)) return false;
    if (isCoreCell(cell.x, cell.y)) return false;
    if (this.blocked[indexOf(cell.x, cell.y)]) return false;
    if (this.resources.metal < tower.cost) return false;
    if (!this.isVisibleForBuilding(cell)) return false;
    if (this.spawnPoints.some((spawn) => spawn.x === cell.x && spawn.y === cell.y)) return false;
    return this.wouldKeepAllSpawnsConnected(cell);
  }

  private isVisibleForBuilding(cell: Cell): boolean {
    const core = coreCenter();
    if (distanceCells(cell, core) <= CORE_VISION_RANGE) return true;
    return this.towers.some((tower) => distanceCells(cell, tower.cell) <= CORE_VISION_RANGE);
  }

  private wouldKeepAllSpawnsConnected(cell: Cell): boolean {
    const idx = indexOf(cell.x, cell.y);
    this.blocked[idx] = 1;
    this.flowField.rebuild();
    const ok = this.spawnPoints.every((spawn) => this.flowField.canReachCore(spawn));
    this.blocked[idx] = 0;
    this.flowField.rebuild();
    return ok;
  }

  private tryPlaceSelectedTower(): void {
    if (!this.selectedTower) return;
    const cell = this.pointerCell();
    if (!this.canBuildAt(cell, this.selectedTower)) return;

    this.resources.metal -= this.selectedTower.cost;
    this.blocked[indexOf(cell.x, cell.y)] = 1;
    this.flowField.rebuild();

    const sprite = new Sprite(this.assets.towers[this.selectedTower.kind]);
    sprite.anchor.set(0.5);
    sprite.position.set((cell.x + 0.5) * TILE_SIZE, (cell.y + 0.5) * TILE_SIZE);
    sprite.width = TILE_SIZE * 1.64;
    sprite.height = TILE_SIZE * 1.64;

    const rangeGraphic = new Graphics();
    const tower: Tower = {
      id: this.towerId,
      definition: this.selectedTower,
      cell,
      cooldownLeft: 0,
      sprite,
      rangeGraphic
    };
    this.towerId += 1;
    this.towers.push(tower);
    this.towerLayer.addChild(rangeGraphic, sprite);
    this.redrawVision();
    this.updateStatusPanel(true);
  }

  private updatePlacementPreview(): void {
    this.previewLayer.clear();
    if (!this.selectedTower || this.gameOver) return;

    const cell = this.pointerCell();
    const valid = this.canBuildAt(cell, this.selectedTower);
    const color = valid ? COLORS.green : COLORS.red;
    const x = cell.x * TILE_SIZE;
    const y = cell.y * TILE_SIZE;

    this.previewLayer
      .rect(x, y, TILE_SIZE, TILE_SIZE)
      .fill({ color, alpha: 0.18 })
      .stroke({ color, width: 3, alpha: 0.9 });

    this.drawDashedCircle(
      this.previewLayer,
      (cell.x + 0.5) * TILE_SIZE,
      (cell.y + 0.5) * TILE_SIZE,
      this.selectedTower.range * TILE_SIZE,
      color,
      0.6
    );
  }

  private updateWave(dt: number): void {
    if (!this.activeWave) {
      this.nextWaveDelay -= dt;
      if (this.nextWaveDelay <= 0) {
        this.startWave();
      }
      return;
    }

    if (this.spawnLeft > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnLeft -= 1;
        this.spawnTimer = Math.max(0.24, 0.82 - this.resources.wave * 0.014);
      }
    }

    if (this.spawnLeft <= 0 && this.enemies.every((enemy) => !enemy.alive)) {
      this.activeWave = false;
      this.nextWaveDelay = 2.4;

      if (this.resources.wave > 0 && this.resources.wave % 10 === 0) {
        this.resources.xir += 1;
      }
    }
  }

  private startWave(): void {
    this.resources.wave += 1;
    this.activeWave = true;
    this.spawnLeft = Math.ceil(5 + this.resources.wave * 1.42);
    this.spawnTimer = 0;
  }

  private spawnEnemy(): void {
    const base = ENEMIES[(this.resources.wave - 1) % ENEMIES.length];
    const spawn = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    const multiplier = Math.pow(1.12, Math.max(0, this.resources.wave - 1));
    const health = Math.ceil(base.health * multiplier);
    const center = cellCenter(spawn);
    const sprite = new Container();
    const body = new Graphics();
    const healthText = new Text({
      text: String(health),
      style: new TextStyle({
        fill: COLORS.red,
        fontFamily: "monospace",
        fontSize: 13
      })
    });

    body
      .rect(-11, -11, 22, 22)
      .fill({ color: COLORS.black, alpha: 0.95 })
      .stroke({ color: base.color, width: 2 })
      .moveTo(-7, -7)
      .lineTo(7, 7)
      .moveTo(7, -7)
      .lineTo(-7, 7)
      .stroke({ color: base.color, width: 2 });
    healthText.anchor.set(0.5);
    healthText.position.set(0, -25);
    sprite.addChild(body, healthText);
    sprite.position.set(center.x * TILE_SIZE, center.y * TILE_SIZE);

    const enemy: Enemy = {
      id: this.enemyId,
      definition: base,
      health,
      maxHealth: health,
      cell: { ...spawn },
      nextCell: this.flowField.nextCell(spawn),
      x: sprite.position.x,
      y: sprite.position.y,
      sprite,
      body,
      healthText,
      alive: true
    };
    this.enemyId += 1;
    this.enemies.push(enemy);
    this.enemyLayer.addChild(sprite);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (isCoreCell(enemy.cell.x, enemy.cell.y)) {
        this.triggerGameOver();
        return;
      }

      const targetCenter = cellCenter(enemy.nextCell);
      const targetX = targetCenter.x * TILE_SIZE;
      const targetY = targetCenter.y * TILE_SIZE;
      const dx = targetX - enemy.x;
      const dy = targetY - enemy.y;
      const distance = Math.hypot(dx, dy);
      const step = enemy.definition.speed * TILE_SIZE * dt;

      if (distance <= step || distance < 0.01) {
        enemy.x = targetX;
        enemy.y = targetY;
        enemy.cell = { ...enemy.nextCell };
        enemy.nextCell = this.flowField.nextCell(enemy.cell);

        if (isCoreCell(enemy.cell.x, enemy.cell.y)) {
          this.triggerGameOver();
          return;
        }
      } else {
        enemy.x += (dx / distance) * step;
        enemy.y += (dy / distance) * step;
      }

      enemy.sprite.position.set(enemy.x, enemy.y);
    }
  }

  private updateTowers(dt: number): void {
    for (const tower of this.towers) {
      tower.cooldownLeft -= dt;
      if (tower.cooldownLeft > 0) continue;

      const target = this.findTarget(tower);
      if (!target) continue;

      this.spawnProjectile(tower, target);
      tower.cooldownLeft = tower.definition.cooldown;
    }
  }

  private findTarget(tower: Tower): Enemy | undefined {
    const range = tower.definition.range;
    const candidates = this.spatialHash.query(tower.cell.x, tower.cell.y, range);
    let best: Enemy | undefined;
    let bestDistance = Number.MAX_SAFE_INTEGER;

    for (const enemy of candidates) {
      if (!enemy.alive) continue;
      const distance = distanceCells(tower.cell, enemy.cell);
      if (distance <= range && distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }

    return best;
  }

  private spawnProjectile(tower: Tower, target: Enemy): void {
    const center = cellCenter(tower.cell);
    const graphic = new Graphics();
    graphic.circle(0, 0, 5).fill({ color: COLORS.yellow, alpha: 0.95 });
    graphic.position.set(center.x * TILE_SIZE, center.y * TILE_SIZE);

    this.projectiles.push({
      id: this.projectileId,
      x: graphic.position.x,
      y: graphic.position.y,
      speed: tower.definition.projectileSpeed,
      damage: tower.definition.damage,
      areaRadius: tower.definition.areaRadius ?? 0,
      pushCells: tower.definition.pushCells ?? 0,
      target,
      graphic,
      alive: true
    });
    this.projectileId += 1;
    this.projectileLayer.addChild(graphic);
  }

  private updateProjectiles(dt: number): void {
    for (const projectile of this.projectiles) {
      if (!projectile.alive) continue;
      if (!projectile.target.alive) {
        projectile.alive = false;
        continue;
      }

      const dx = projectile.target.x - projectile.x;
      const dy = projectile.target.y - projectile.y;
      const distance = Math.hypot(dx, dy);
      const step = projectile.speed * dt;

      if (distance <= step || distance < 0.01) {
        this.impactProjectile(projectile);
        projectile.alive = false;
      } else {
        projectile.x += (dx / distance) * step;
        projectile.y += (dy / distance) * step;
        projectile.graphic.position.set(projectile.x, projectile.y);
      }
    }
  }

  private impactProjectile(projectile: Projectile): void {
    if (projectile.areaRadius > 0) {
      const impactCell = projectile.target.cell;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (distanceCells(impactCell, enemy.cell) <= projectile.areaRadius) {
          this.damageEnemy(enemy, projectile.damage);
        }
      }
    } else {
      this.damageEnemy(projectile.target, projectile.damage);
    }

    if (projectile.pushCells > 0 && projectile.target.alive) {
      this.pushEnemy(projectile.target, projectile.pushCells);
    }
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    enemy.health -= amount;
    enemy.healthText.text = String(Math.max(0, Math.ceil(enemy.health)));

    if (enemy.health <= 0) {
      enemy.alive = false;
      this.resources.kills += 1;
      this.resources.metal += enemy.definition.metal;
    }
  }

  private pushEnemy(enemy: Enemy, cells: number): void {
    const core = coreCenter();
    const dx = enemy.cell.x - core.x;
    const dy = enemy.cell.y - core.y;
    const primaryX = Math.abs(dx) >= Math.abs(dy);
    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    let current = { ...enemy.cell };

    for (let i = 0; i < cells; i += 1) {
      const candidates = primaryX
        ? [
            { x: current.x + stepX, y: current.y },
            { x: current.x, y: current.y + stepY }
          ]
        : [
            { x: current.x, y: current.y + stepY },
            { x: current.x + stepX, y: current.y }
          ];
      const next = candidates.find((cell) => inBounds(cell.x, cell.y) && !this.blocked[indexOf(cell.x, cell.y)]);
      if (!next) break;
      current = next;
    }

    const center = cellCenter(current);
    enemy.cell = current;
    enemy.nextCell = this.flowField.nextCell(current);
    enemy.x = center.x * TILE_SIZE;
    enemy.y = center.y * TILE_SIZE;
    enemy.sprite.position.set(enemy.x, enemy.y);
  }

  private cleanupDeadObjects(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      if (projectile.alive) continue;
      projectile.graphic.destroy();
      this.projectiles.splice(i, 1);
    }

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (enemy.alive) continue;
      enemy.sprite.destroy({ children: true });
      this.enemies.splice(i, 1);
    }
  }

  private updateStatusPanel(force = false): void {
    const nextWaveText = this.activeWave ? "running" : `${Math.max(0, this.nextWaveDelay).toFixed(1)}s`;
    const status = `METAL: ${this.resources.metal}\nWAVE:  ${this.resources.wave}\nXiR:   ${this.resources.xir}\nKILLS: ${this.resources.kills}\nNEXT:  ${nextWaveText}`;
    if (!force && status === this.lastStatus) return;
    this.statusText.text = status;
    this.lastStatus = status;
  }

  private updateSelectedPanel(): void {
    if (!this.selectedTower) {
      this.selectedText.text = "Select a tower from the shop.\n\nWASD: move camera\nWheel: zoom";
      return;
    }

    const tower = this.selectedTower;
    const typeLine = tower.kind === "area" ? "AREA" : tower.kind === "pusher" ? "PUSHER" : "REGULAR";
    this.selectedText.text = `${tower.name}\nCOST ${tower.cost} | DAMAGE ${tower.damage} | RANGE ${tower.range}\nTYPE ${typeLine}\nClick an empty visible cell to build.`;
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.saveBestRun();
    this.previewLayer.clear();
    this.gameOverPanel.visible = true;
    this.gameOverText.visible = true;
    this.backToMenuButton.visible = true;
    this.gameOverText.text = `The core broke.\nKills: ${this.resources.kills}\nWave: ${this.resources.wave}\nMetal collected: ${this.resources.metal}`;
  }

  private saveBestRun(): void {
    const raw = window.localStorage.getItem("xir-best-run");
    const current = raw ? JSON.parse(raw) : { kills: 0, metal: 0, wave: 0 };
    const candidate = {
      kills: this.resources.kills,
      metal: this.resources.metal,
      wave: this.resources.wave
    };
    if (candidate.wave > current.wave || (candidate.wave === current.wave && candidate.kills > current.kills)) {
      window.localStorage.setItem("xir-best-run", JSON.stringify(candidate));
    }
  }
}
