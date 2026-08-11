import { Application, Container, Texture } from "pixi.js";
import { TowerKind } from "../data/towers";
import { GameScene } from "./gameScene";
import { MenuScene } from "./menuScene";
import { Scene } from "./scene";

export type GameAssets = {
  menuBg: Texture;
  towers: Record<TowerKind, Texture>;
};

export class SceneManager {
  private current?: Scene;
  private readonly stageRoot = new Container();

  constructor(
    private readonly app: Application,
    private readonly assets: GameAssets
  ) {
    this.app.stage.addChild(this.stageRoot);
  }

  showMenu(): void {
    this.setScene(
      new MenuScene(this.app, this.assets, {
        onPlay: () => this.startGame()
      })
    );
  }

  startGame(): void {
    this.setScene(
      new GameScene(this.app, this.assets, {
        onQuit: () => this.showMenu()
      })
    );
  }

  update(dt: number): void {
    this.current?.update(dt);
  }

  resize(): void {
    this.current?.resize(this.app.screen.width, this.app.screen.height);
  }

  private setScene(scene: Scene): void {
    if (this.current) {
      this.stageRoot.removeChild(this.current.root);
      this.current.destroy();
    }

    this.current = scene;
    this.stageRoot.addChild(scene.root);
    scene.resize(this.app.screen.width, this.app.screen.height);
  }
}
