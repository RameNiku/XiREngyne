export interface Scene {
  readonly root: import("pixi.js").Container;
  update(dt: number): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
