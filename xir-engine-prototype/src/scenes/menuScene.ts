import { Application, Container, Sprite, TextStyle } from "pixi.js";
import { SketchButton } from "../ui/button";
import { sketchText } from "../ui/text";
import { COLORS } from "../render/colors";
import { GameAssets } from "./sceneManager";
import { Scene } from "./scene";

type MenuCallbacks = {
  onPlay: () => void;
};

export class MenuScene implements Scene {
  readonly root = new Container();
  private readonly background: Sprite;
  private readonly logo = sketchText("XiR", 52, COLORS.white);
  private readonly subtitle = sketchText("ENGINE", 18, COLORS.mutedWhite);
  private readonly bestRun = sketchText("", 22, COLORS.mutedWhite);
  private readonly playButton: SketchButton;
  private readonly aboutButton: SketchButton;
  private readonly controlsButton: SketchButton;

  constructor(
    _app: Application,
    assets: GameAssets,
    callbacks: MenuCallbacks
  ) {
    this.background = new Sprite(assets.menuBg);
    this.root.addChild(this.background);

    this.logo.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.subtitle.angle = 90;
    this.playButton = new SketchButton("PLAY", 400, 92, callbacks.onPlay);
    this.aboutButton = new SketchButton("ABOUT", 230, 58, () => this.flash("ABOUT: XiR prototype build"));
    this.controlsButton = new SketchButton("CONTROLS", 260, 58, () =>
      this.flash("WASD move camera | wheel zoom | click tower then map")
    );

    this.bestRun.style = new TextStyle({
      fill: COLORS.mutedWhite,
      fontFamily: "monospace",
      fontSize: 22,
      letterSpacing: 2,
      lineHeight: 33
    });
    this.updateBestRun();

    this.root.addChild(this.logo, this.subtitle, this.playButton, this.aboutButton, this.controlsButton, this.bestRun);
  }

  update(_dt: number): void {}

  resize(width: number, height: number): void {
    const scale = Math.max(width / this.background.texture.width, height / this.background.texture.height);
    this.background.scale.set(scale);
    this.background.position.set(
      (width - this.background.texture.width * scale) / 2,
      (height - this.background.texture.height * scale) / 2
    );

    this.playButton.position.set(Math.max(48, width * 0.035), height * 0.34);
    this.aboutButton.position.set(Math.max(72, width * 0.045), height * 0.51);
    this.controlsButton.position.set(Math.max(72, width * 0.045), height * 0.62);
    this.bestRun.position.set(Math.max(48, width * 0.035), Math.max(34, height * 0.075));
    this.logo.position.set(width * 0.67, height * 0.58);
    this.subtitle.position.set(width * 0.735, height * 0.57);
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }

  private updateBestRun(): void {
    const raw = window.localStorage.getItem("xir-best-run");
    const best = raw ? JSON.parse(raw) : { kills: 0, metal: 0, wave: 0 };
    this.bestRun.text = `BEST RUN:\n\nKILLS  ${best.kills}\nMETAL  ${best.metal}\nWAVE   ${best.wave}`;
  }

  private flash(message: string): void {
    this.bestRun.text = `${message}\n\n${this.bestRun.text}`;
    window.setTimeout(() => this.updateBestRun(), 1800);
  }
}
